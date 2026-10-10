#!/usr/bin/env python3
"""Prove actual intrinsic badge decoding and ordinary A/B cycling after portal upload."""

import argparse
import hashlib
import importlib.util
import json
import subprocess
import sys
import time
from pathlib import Path

from PIL import Image

sys.dont_write_bytecode = True


def load(name, filename):
    spec = importlib.util.spec_from_file_location(
        name, Path(__file__).with_name(filename)
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


module = load("factory_device", "factory-device.py")
visual = load("badge_visual", "verify-badge-image.py")
report = module.ROOT / "reports/m5-stopwatch"
d = module.FactoryDevice("/dev/cu.usbmodem21101", capture_variant=True)
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--already-closed", action="store_true")
args = parser.parse_args()
results = []


def capture(name, slot):
    receipt = d.capture(name, normalize_clock=False)
    geometry = receipt["pixelGeometry"]
    if geometry["crop"] is None:
        raise RuntimeError("Badge capture has no public source-backed466px container")
    x, y, w, h = geometry["crop"]
    filename = (
        "badge-upload-factory-slot-0.jpg"
        if slot == 0
        else f"badge-upload-slot-{slot}.{'png' if slot == 1 else 'jpg'}"
    )
    fixture_path = report / filename
    capture_path = module.DESTINATION / f"{name}.png"
    with Image.open(fixture_path) as fixture, Image.open(capture_path) as raw:
        actual = raw.convert("RGB").crop((x, y, x + w, y + h))
        if slot:
            proof = visual.verify(fixture.convert("RGB"), actual, slot)
        else:
            source = visual.analysis.canonical_rgb565(fixture.convert("RGB"))
            target = visual.analysis.canonical_rgb565(actual)
            metrics = visual.analysis.pixel_metrics(source, target)
            proof = {
                "visualFixtureIdentified": metrics.get("comparable", False)
                and metrics["meanAbsoluteChannelError"] <= 8
                and len(set(source.getdata())) > 4
                and len(set(target.getdata())) > 4,
                "canonicalRgb565": metrics,
                "exactQuantizedPixels": metrics.get("pixelIdentical", False),
                "identificationPolicy": "Actual cropped JPEG readback, full-frame canonical mean error<=8 and nonuniform source/capture; identification does not imply exact decoder pixels.",
            }
    proof.update(
        {
            "schemaVersion": 1,
            "id": name,
            "expectedSlot": slot,
            "fixture": filename,
            "fixtureSha256": hashlib.sha256(fixture_path.read_bytes()).hexdigest(),
            "captureSha256": receipt["imageSha256"],
            "pixelGeometry": geometry,
            "firmwareBinarySha256": receipt["firmwareBinarySha256"],
            "normalHalCommands": d.history,
            "stateAuthority": "Initial active0 was actual HTTP-selected by root before /close; later candidates follow normal A/B and pinned Hal::find_available_slot. Distinctive rendered pixels independently identify content; private backend slot is not guessed from filenames.",
            "sourceAuthority": "main/apps/app_badge/app_badge.cpp:50–64; main/hal/hal_badge.cpp:258–278,443–487; main/apps/app_badge/view/badge.cpp:86–98",
        }
    )
    (report / f"{name}-factory-visual.json").write_text(
        json.dumps(proof, indent=2) + "\n"
    )
    results.append(proof)
    print(
        name,
        "expected slot",
        slot,
        "fixture rendered",
        proof["visualFixtureIdentified"],
        flush=True,
    )


try:
    if not args.already_closed:
        result = subprocess.run(
            [
                "/usr/bin/curl",
                "--silent",
                "--show-error",
                "--max-time",
                "15",
                "-X",
                "POST",
                "http://192.168.4.1/close",
            ],
            capture_output=True,
            check=True,
        )
        if result.stdout.strip() != b"closing":
            raise RuntimeError(f"Unexpected real /close response: {result.stdout!r}")
    time.sleep(1.5)
    capture("badge-upload-slot-0", 0)
    for slot in [1, 2, 3]:
        d.key("B")
        capture(f"badge-upload-slot-{slot}", slot)
    d.key("A")
    capture("badge-button-previous", 2)
    d.key("B")
    d.key("B")
    capture("badge-upload-slot-4", 4)
    d.key("B")
    capture("badge-button-skip-deleted", 0)
    d.key("A")
    capture("badge-button-wrap", 4)
finally:
    (report / "factory-badge-device-proof.json").write_text(
        json.dumps(
            {
                "schemaVersion": 1,
                "results": results,
                "allFixturesIdentified": len(results) == 8
                and all(row["visualFixtureIdentified"] for row in results),
                "interpretation": "Actual framebuffer evidence and source-normal A/B controls; fixture-identification tolerances do not establish identical decoder pixels.",
            },
            indent=2,
        )
        + "\n"
    )
    d.serial.close()
