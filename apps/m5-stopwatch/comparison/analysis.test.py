#!/usr/bin/env python3
"""Validate accounting boundaries without device access or temporary files."""
import importlib.util
import json
from pathlib import Path
import struct
import sys
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True


def module(name, file):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(file))
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


build = module("build_analysis", "analyze-build.py")
logs = module("log_analysis", "analyze-logs.py")


class Accounting(unittest.TestCase):
    def test_sdk_identity_is_read_from_selected_image(self):
        image = bytearray(288)
        image[0] = 0xE9
        struct.pack_into("<I", image, 32, 0xABCD5432)
        image[32 + 16:32 + 23] = b"v1.2.3\0"
        image[32 + 112:32 + 119] = b"v5.5.4\0"
        description = build.image_description(image)
        self.assertEqual(description["version"], "v1.2.3")
        self.assertEqual(description["idf_ver"], "v5.5.4")
        self.assertIsNone(build.image_description(b"not an ESP image"))

    def test_saved_production_metadata_and_app_replace_current_build(self):
        files = {
            "build/production.elf": b"elf",
            "build/production.bin": b"production",
            "build/production.sdkconfig": b"CONFIG_COMPILER_OPTIMIZATION_PERF=y\n",
            "build/production.ninja": b"DEFINES = -DGEA_EMBEDDED_PERF=0 -DIDF_VER=5.5.4\n",
            "build/current.bin": b"diagnostic image",
            "build/bootloader.bin": b"boot",
            "build/flasher_args.json": json.dumps({
                "app": {"offset": "0x20000", "file": "current.bin"},
                "flash_files": {"0x0": "bootloader.bin", "0x20000": "current.bin"},
                "flash_settings": {"flash_mode": "dio"},
            }).encode(),
        }

        class FakePath:
            def __init__(self, name): self.name = name
            def __truediv__(self, name): return FakePath(self.name + "/" + name)
            def __str__(self): return self.name
            def resolve(self): return self
            def exists(self): return self.name in files
            def is_file(self): return self.exists()
            def read_bytes(self): return files[self.name]
            def read_text(self): return self.read_bytes().decode()

        with patch.object(build, "elf_sections", return_value={"sections": []}):
            result = build.analyze(FakePath("build"), FakePath("build/production.elf"),
                                   FakePath("build/production.bin"), "gea", "production",
                                   FakePath("build/production.sdkconfig"), FakePath("build/production.ninja"))
        self.assertEqual(result["gea_defines"], ["GEA_EMBEDDED_PERF=0"])
        self.assertEqual(result["project"]["idf_ver"], "5.5.4")
        self.assertEqual(result["configuration"]["CONFIG_COMPILER_OPTIMIZATION_PERF"], "y")
        self.assertEqual(result["flash_files"][1]["path"], "build/production.bin")
        self.assertEqual(result["flash_payload_bytes"], len(b"productionboot"))
        self.assertEqual(result["flash_settings"]["flash_mode"], "dio")

    def test_virtual_reservations_are_not_psram_usage(self):
        names = b"\0.shstrtab\0.flash.text\0.ext_ram.dummy\0"
        data_offset = 52 + 4 * 40
        ident = b"\x7fELF\x01\x01\x01" + b"\0" * 9
        header = struct.pack("<HHIIIIIHHHHHH", 2, 94, 1, 0, 0, 52, 0, 52, 0, 0, 40, 4, 1)
        sections = [bytes(40),
                    struct.pack("<IIIIIIIIII", 1, 3, 0, 0, data_offset, len(names), 0, 0, 1, 0),
                    struct.pack("<IIIIIIIIII", names.index(b".flash.text"), 1, 6, 0x42000020,
                                data_offset + len(names), 4, 0, 0, 4, 0),
                    struct.pack("<IIIIIIIIII", names.index(b".ext_ram.dummy"), 8, 3, 0x3C000020,
                                0, 6500000, 0, 0, 4, 0)]
        result = build.elf_sections(ident + header + b"".join(sections) + names + b"code")
        self.assertEqual(result["bits"], 32)
        self.assertEqual(result["sections"][0]["region"], "flash_mapped")
        self.assertEqual(result["sections"][1]["accounted_memory_bytes"], 0)
        self.assertEqual(result["sections"][1]["bytes"], 6500000)

    def sample(self, run, presented=None):
        heap = {"total_bytes": 1000, "free_bytes": 700, "min_free_bytes": 500,
                "largest_free_bytes": 400}
        return {"schema_version": 1, "framework": "gea", "run_id": run,
                "scenario": "idle", "phase": "end", "window_us": 10000000,
                "scheduler_frames": 600, "rendered_frames": 10,
                "presented_frames": presented, "present_pixels": 5000,
                "work_us": 1000000, "work_max_us": 15000,
                "internal": heap, "psram": heap}

    def test_missing_presentation_is_not_zero_fps(self):
        result = logs.summarize([self.sample("idle-1")])
        metrics = result["summary"][0]["metrics"]
        self.assertIsNone(metrics["presented_fps"])
        self.assertEqual(metrics["scheduler_fps"]["median"], 60)
        self.assertEqual(metrics["rendered_fps"]["median"], 1)
        self.assertEqual(metrics["internal_used_bytes"]["median"], 300)

    def test_plain_jsonl_and_both_serial_prefixes_have_identical_samples(self):
        payload = json.dumps(self.sample("input-formats", 10))

        class SavedLog:
            def __init__(self, suffix, contents):
                self.suffix = suffix
                self.contents = contents

            def read_text(self, **kwargs):
                return self.contents

            def resolve(self):
                return "saved" + self.suffix

        for suffix, contents in ((".jsonl", payload),
                                 (".log", "SWBENCH " + payload),
                                 (".log", "SWBENCHJSON " + payload)):
            samples = logs.read_samples([SavedLog(suffix, contents)])
            self.assertEqual(len(samples), 1)
            self.assertEqual(samples[0]["presented_frames"], 10)

    def test_repetitions_and_duplicate_identity(self):
        result = logs.summarize([self.sample("idle-1", 10), self.sample("idle-2", 20),
                                 self.sample("idle-3", 30)])
        rate = result["summary"][0]["metrics"]["presented_fps"]
        self.assertEqual(rate, {"n": 3, "median": 2, "min": 1, "max": 3})
        with self.assertRaises(ValueError):
            logs.summarize([self.sample("same"), self.sample("same")])

    def test_refresh_variants_are_never_merged(self):
        original = self.sample("one", 20)
        faster = self.sample("one", 40)
        original.update(framework="factory", variant="original33")
        faster.update(framework="factory", variant="refresh16")
        result = logs.summarize([original, faster])
        self.assertEqual(len(result["summary"]), 2)
        self.assertEqual([r["metrics"]["presented_fps"]["median"] for r in result["summary"]], [2, 4])

    def test_optimization_variants_are_never_merged_or_collided(self):
        debug = self.sample("same-run", 20)
        optimized = self.sample("same-run", 40)
        debug.update(framework="factory", variant="original33", optimization="Og")
        optimized.update(framework="factory", variant="original33", optimization="O2")
        result = logs.summarize([debug, optimized])
        self.assertEqual(len(result["summary"]), 2)
        self.assertEqual({r["optimization"] for r in result["summary"]}, {"Og", "O2"})
        self.assertEqual({r["metrics"]["presented_fps"]["median"] for r in result["summary"]}, {2, 4})


if __name__ == "__main__":
    unittest.main()
