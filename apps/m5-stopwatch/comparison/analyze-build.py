#!/usr/bin/env python3
"""Record firmware footprint from existing build artifacts; never build or flash."""
import argparse
from collections import defaultdict
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import struct


def artifact(path):
    data = path.read_bytes()
    return {"path": str(path.resolve()), "bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest()}


def image_description(data):
    # ESP image header (24 bytes), first segment header (8), then esp_app_desc_t.
    # IDF esp_app_desc.h pins the descriptor magic and its fixed-size fields.
    offset = 32
    if len(data) < offset + 256 or data[0] != 0xE9 or struct.unpack_from("<I", data, offset)[0] != 0xABCD5432:
        return None
    descriptor = data[offset:offset + 256]
    def string(start, size):
        return descriptor[start:start + size].split(b"\0", 1)[0].decode("utf-8", "replace")
    return {"version": string(16, 32), "project_name": string(48, 32),
            "compile_time": string(80, 16), "compile_date": string(96, 16),
            "idf_ver": string(112, 32), "embedded_elf_sha256": descriptor[144:176].hex()}


def elf_sections(data):
    if data[:4] != b"\x7fELF" or data[4] not in (1, 2) or data[5] not in (1, 2):
        raise ValueError("expected a 32/64-bit ELF image")
    endian = "<" if data[5] == 1 else ">"
    is64 = data[4] == 2
    header = struct.unpack_from(endian + ("HHIQQQIHHHHHH" if is64 else "HHIIIIIHHHHHH"), data, 16)
    table, entry_size, count, strings_index = header[5], header[10], header[11], header[12]
    section_format = endian + ("IIQQQQIIQQ" if is64 else "IIIIIIIIII")
    if not count or strings_index >= count:
        raise ValueError("extended/missing ELF section table is unsupported")
    if entry_size < struct.calcsize(section_format):
        raise ValueError("invalid ELF section entry size")
    raw = [struct.unpack_from(section_format, data, table + i * entry_size) for i in range(count)]
    names = data[raw[strings_index][4]:raw[strings_index][4] + raw[strings_index][5]]
    sections = []
    for record in raw:
        name_offset, section_type, flags, address, offset, size = record[:6]
        name = names[name_offset:].split(b"\0", 1)[0].decode("utf-8", "replace")
        if not flags & 2 or not size:
            continue
        nobits = section_type == 8
        if not nobits and offset + size > len(data):
            raise ValueError("ELF allocated section extends past file: " + name)
        reservation = "dummy" in name or name.endswith("_noload")
        if reservation:
            region = "linker_virtual_reservation"
        elif "ext_ram" in name or "psram" in name:
            region = "psram_static"
        elif "rtc" in name or 0x50000000 <= address < 0x50010000:
            region = "rtc_static"
        elif ("flash" in name or name.startswith(".drom") or name.startswith(".irom")
              or 0x42000000 <= address < 0x44000000
              or (not nobits and 0x3C000000 <= address < 0x3E000000)):
            region = "flash_mapped"
        elif "iram" in name:
            region = "iram_static"
        elif "dram" in name:
            region = "dram_static"
        else:
            region = "other_allocated"
        sections.append({"name": name, "address": address, "bytes": size,
                         "file_bytes": 0 if nobits else size, "nobits": nobits,
                         "writable": bool(flags & 1), "executable": bool(flags & 4),
                         "accounted_memory_bytes": 0 if reservation else size,
                         "region": region})
    return {"bits": 64 if is64 else 32, "machine": header[1], "sections": sections}


def sdkconfig(path):
    config = {}
    for line in path.read_text().splitlines():
        if line.startswith("CONFIG_") and "=" in line:
            key, value = line.split("=", 1)
            config[key] = value.strip('"')
        elif line.startswith("# CONFIG_") and line.endswith(" is not set"):
            config[line[2:-11]] = "n"
    prefixes = ("CONFIG_ESP_DEFAULT_CPU_FREQ", "CONFIG_FREERTOS_HZ", "CONFIG_SPIRAM",
                "CONFIG_COMPILER_OPTIMIZATION", "CONFIG_LOG_", "CONFIG_ESPTOOLPY_",
                "CONFIG_LV_", "CONFIG_ESP_WIFI_", "CONFIG_HEAP_TRACING",
                "CONFIG_FREERTOS_GENERATE_RUN_TIME_STATS", "CONFIG_FREERTOS_USE_TRACE_FACILITY")
    return {key: value for key, value in config.items() if key.startswith(prefixes)}


def partition_table(path):
    data = path.read_bytes()
    partitions = []
    for offset in range(0, len(data) - 31, 32):
        magic, kind, subtype, address, size, label, flags = struct.unpack_from("<HBBII16sI", data, offset)
        if magic == 0xFFFF or magic == 0xEBEB:
            break
        if magic != 0x50AA:
            raise ValueError("invalid partition-table entry at " + str(offset))
        partitions.append({"label": label.rstrip(b"\0").decode(), "type": kind,
                           "subtype": subtype, "offset": address, "bytes": size, "flags": flags})
    return partitions


def analyze(build, elf, binary, framework, variant, config=None, ninja_path=None,
            description_path=None, use_build_metadata=True):
    parsed = elf_sections(elf.read_bytes())
    totals = defaultdict(lambda: {"memory_bytes": 0, "file_bytes": 0})
    for section in parsed["sections"]:
        totals[section["region"]]["memory_bytes"] += section["accounted_memory_bytes"]
        totals[section["region"]]["file_bytes"] += section["file_bytes"]
    result = {"schema_version": 1, "framework": framework, "variant": variant,
              "recorded_at": datetime.now(timezone.utc).isoformat(),
              "app_image": artifact(binary), "elf_file": artifact(elf), "elf": parsed,
              "allocated_sections": dict(totals),
              "allocated_file_bytes": sum(s["file_bytes"] for s in parsed["sections"]),
              "allocated_memory_bytes": sum(s["accounted_memory_bytes"] for s in parsed["sections"]),
              "notes": ["ELF file bytes include debug information and are not flashed bytes.",
                        "App image bytes include image headers, alignment and checksum.",
                        "Static ELF memory and allocated heap totals must not be added as overlapping budgets.",
                        "IDF dummy/noload sections reserve or alias virtual addresses; excluded from physical memory totals."]}
    descriptor = image_description(binary.read_bytes())
    if descriptor:
        result["image_description"] = descriptor
    config = config or build / "sdkconfig"
    if config.exists():
        result["sdkconfig"] = artifact(config)
        result["configuration"] = sdkconfig(config)
    description = description_path or build / "project_description.json"
    if use_build_metadata and description.exists():
        project = json.loads(description.read_text())
        result["project"] = {k: project[k] for k in ("project_name", "project_version", "idf_ver", "idf_path", "c_compiler", "target") if k in project}
    ninja = ninja_path or build / "build.ninja"
    if use_build_metadata and ninja.exists():
        result["compile_commands_source"] = artifact(ninja)
        defines = set()
        for line in ninja.read_text().splitlines():
            if line.lstrip().startswith("DEFINES ="):
                defines.update(re.findall(r"-D(GEA_[A-Za-z0-9_]+(?:=[^\s]+)?)", line))
                idf = re.search(r"-DIDF_VER=([^\s]+)", line)
                if idf:
                    result.setdefault("project", {})["idf_ver"] = idf[1].replace("\\", "").strip('"')
        result["gea_defines"] = sorted(defines)
    result["build_metadata_scope"] = "selected metadata inputs" if use_build_metadata else "omitted: matching historical metadata unavailable"
    partitions = build / "partition_table/partition-table.bin"
    if partitions.exists():
        result["partitions"] = partition_table(partitions)
    flash_args = build / "flasher_args.json"
    if flash_args.exists():
        flash = json.loads(flash_args.read_text())
        app_offset = flash.get("app", {}).get("offset")
        result["flash_files"] = [{"offset": address,
                                 **artifact(binary if address == app_offset else build / relative)}
                                 for address, relative in flash.get("flash_files", {}).items()
                                 if address == app_offset or (build / relative).is_file()]
        result["flash_payload_bytes"] = sum(f["bytes"] for f in result["flash_files"])
        result["app_partition_offset"] = app_offset
        result["flash_settings"] = flash.get("flash_settings", {})
        result["flash_payload_scope"] = "selected app image plus support files currently in the build directory"
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--build-dir", type=Path, required=True)
    parser.add_argument("--elf", type=Path, required=True)
    parser.add_argument("--bin", type=Path, required=True)
    parser.add_argument("--framework", choices=("factory", "gea"), required=True)
    parser.add_argument("--variant", required=True, help="production, benchmark, or an explicitly described baseline")
    parser.add_argument("--sdkconfig", type=Path, help="saved configuration matching the selected image")
    parser.add_argument("--ninja", type=Path, help="saved build.ninja matching the selected image")
    parser.add_argument("--project-description", type=Path, help="saved project_description.json matching the selected image")
    parser.add_argument("--no-build-metadata", action="store_true", help="omit current Ninja/project metadata when historical copies are unavailable")
    parser.add_argument("--output", type=Path, help="durable JSON report; default is stdout")
    args = parser.parse_args()
    result = analyze(args.build_dir, args.elf, args.bin, args.framework, args.variant,
                     args.sdkconfig, args.ninja, args.project_description, not args.no_build_metadata)
    text = json.dumps(result, indent=2) + "\n"
    if args.output:
        args.output.write_text(text)
    else:
        print(text, end="")


if __name__ == "__main__":
    main()
