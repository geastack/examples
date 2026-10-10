#!/usr/bin/env python3
"""Restore saved device data with a physically muted diagnostic boot image."""

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
import subprocess


BACKUP_SHA256 = "6d0cc8c25fa4b59c18d73a60b35a47e8615632bf61049f8275c69125922f10f8"
ESPTOOL_PYTHON = "/Users/dashersw/.espressif/python_env/idf5.5_py3.9_env/bin/python"


def merged_image(backup, components):
    if len(backup) != 16 * 1024 * 1024:
        raise ValueError("Expected the original complete 16 MiB flash backup")
    if hashlib.sha256(backup).hexdigest() != BACKUP_SHA256:
        raise ValueError("Original device backup hash changed")
    image = bytearray(backup)
    intervals = []
    for offset, payload in sorted(components):
        end = offset + len(payload)
        if offset < 0 or end > len(image) or any(offset < b and end > a for a, b in intervals):
            raise ValueError("Invalid or overlapping firmware component range")
        image[offset:end] = payload
        intervals.append((offset, end))
    return image


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--build-dir", type=Path, required=True)
    parser.add_argument("--build-report", type=Path, required=True)
    parser.add_argument("--port", default="/dev/cu.usbmodem21101")
    parser.add_argument("--prepare-only", action="store_true")
    parser.add_argument("--receipt", type=Path)
    args = parser.parse_args()
    report = json.loads(args.build_report.read_text())
    if report["framework"] != "gea" or "GEA_EMBEDDED_COMPARISON_BENCHMARK=1" not in report["gea_defines"]:
        raise ValueError("Only physically muted Gea diagnostics may replace the backup boot image")
    directory = args.build_dir.resolve()
    flash = json.loads((directory / "gea-benchmark.flasher-args.json").read_text())
    components = []
    recorded_files = {int(row["offset"], 0): row for row in report["flash_files"]}
    for address, filename in flash["flash_files"].items():
        source = directory / ("gea-benchmark.bin" if filename == "gea_embedded.bin" else filename)
        offset = int(address, 16)
        payload = source.read_bytes()
        if hashlib.sha256(payload).hexdigest() != recorded_files[offset]["sha256"]:
            raise ValueError("Firmware component does not match its retained diagnostic build report")
        components.append((offset, payload))
    if {offset for offset, _ in components} != {0, 0x8000, 0xF000, 0x20000}:
        raise ValueError("Expected complete bootloader, partition table, OTA selection and app set")
    backup = directory / "device-gea-before-comparison.bin"
    output = directory / "device-gea-muted-restoration.bin"
    output.write_bytes(merged_image(backup.read_bytes(), components))
    output.chmod(0o600)
    print("Prepared private restoration image: original data plus complete muted diagnostic boot set")
    if args.prepare_only:
        return
    subprocess.run([
        ESPTOOL_PYTHON, "-m", "esptool", "--chip", "esp32s3", "--port", args.port,
        "--baud", "921600", "write_flash", "--flash_mode", "dio", "--flash_size", "16MB",
        "--flash_freq", "80m", "0x0", str(output),
    ], check=True)
    if args.receipt:
        args.receipt.write_text(json.dumps({
            "recordedAt": datetime.now(timezone.utc).isoformat(),
            "framework": "gea",
            "sourceBackupSha256": BACKUP_SHA256,
            "diagnosticBuildReport": str(args.build_report),
            "mergedImageBytes": output.stat().st_size,
            "mergedImageSha256": hashlib.sha256(output.read_bytes()).hexdigest(),
            "componentOffsets": [hex(offset) for offset, _ in components],
            "flashExitCode": 0,
            "interpretation": "Full saved data restored with a complete physically muted boot set. Flasher may rewrite the image header for DIO; source artifact hashes are not a remote flash-hash attestation.",
        }, indent=2) + "\n")


if __name__ == "__main__":
    main()
