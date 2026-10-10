#!/usr/bin/env python3
"""Control the opt-in factory harness; capture actual framebuffer and LVGL evidence."""

import argparse
import hashlib
import json
import re
import time
from pathlib import Path

import serial
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
DESTINATION = ROOT / "reports/m5-stopwatch/captures/factory"


def decode_wire_pixel(wire):
    pixel = ((wire & 255) << 8) | (wire >> 8)
    r5, g6, b5 = pixel >> 11, (pixel >> 5) & 63, pixel & 31
    return ((r5 << 3) | (r5 >> 2), (g6 << 2) | (g6 >> 4), (b5 << 3) | (b5 >> 2))


def decode_rows(lines, width, height):
    rows = {}
    for line in lines:
        # Normal factory logs may precede an intact protocol record.
        match = re.search(r"SWCAP ROW (\d+) ([0-9a-fA-F]+)", line)
        if match:
            y, pixels = int(match[1]), match[2]
            if y in rows or not 0 <= y < height or len(pixels) != width * 4:
                raise ValueError("Invalid or duplicate screenshot row")
            rows[y] = pixels
    if len(rows) != height:
        raise ValueError(f"Incomplete framebuffer: {len(rows)}/{height} rows")
    return rows


def content_origin(tree):
    origin = None
    for line in tree:
        fields = line.split()
        if len(fields) >= 11 and fields[:3] == ["SWTREE", "NODE", "1"]:
            x1, y1, x2, y2 = map(int, fields[4:8])
            if x2 - x1 + 1 == 466 and y1 == 0 and y2 == 465:
                origin = x1
    return origin


class FactoryDevice:
    def __init__(self, port, capture_variant=False):
        self.serial = serial.Serial(port, 115200, timeout=0.2)
        self.capture_variant = capture_variant
        self.history = []
        self.partial = bytearray()

    def lines(self, end, timeout=30):
        deadline = time.monotonic() + timeout
        result = []
        while time.monotonic() < deadline:
            self.partial.extend(self.serial.readline())
            if not self.partial.endswith(b"\n"):
                continue
            line = self.partial.decode("utf-8", errors="replace").strip()
            self.partial.clear()
            if line:
                result.append(line)
                if line.startswith("SWCONTROL ERROR"):
                    raise RuntimeError(line)
                if line.startswith(end):
                    return result
        raise TimeoutError(f"Missing {end}; last lines: {result[-5:]}")

    def command(self, command, end="SWCONTROL OK", timeout=30):
        self.serial.reset_input_buffer()
        self.partial.clear()
        self.history.append({"command": command, "timestamp": time.time()})
        self.serial.write((command + "\n").encode())
        return self.lines(end, timeout)

    def tap(self, x=233, y=233, hold=80):
        self.command(f"TOUCH 1 {x} {y}")
        time.sleep(hold / 1000)
        self.command(f"TOUCH 0 {x} {y}")
        time.sleep(0.4)

    def key(self, key):
        keys = ["A", "B"] if key == "HOME" else [key]
        for name in keys:
            self.command(f"BUTTON {name} 1")
        time.sleep(0.8 if key == "HOME" else 0.08)
        for name in keys:
            self.command(f"BUTTON {name} 0")
        time.sleep(0.65)

    def capture(self, name, freeze_clock=False, normalize_clock=True):
        if freeze_clock:
            self.command("CLOCKFREEZE 949058760")
            time.sleep(1.8)
        tree = self.command("TREE", "SWTREE END") if not self.capture_variant else []
        if normalize_clock and not freeze_clock:
            self.command(
                "TIME 949058760"
            )  # 2000-01-28 11:26:00 UTC, system clock only.
            time.sleep(0.5)
        info = None
        if self.capture_variant:
            info = json.loads(
                next(
                    line.split("SWINFO ", 1)[1]
                    for line in self.command("INFO", "SWINFO ")
                    if line.startswith("SWINFO ")
                )
            )
            if (
                info["variant"] != "capture-O2"
                or not info["hardware_audio_muted"]
                or not info["hardware_vibration_disabled"]
            ):
                raise RuntimeError("Unexpected or unmuted capture firmware")
            lines = self.command("CAPTURE", "SWATTR END", 60)
            tree = [line for line in lines if line.startswith("SWTREE ")]
        else:
            lines = self.command("SNAPSHOT", "SWCAP END", 60)
        header = next(line.split() for line in lines if line.startswith("SWCAP BEGIN"))
        width, height = int(header[2]), int(header[3])
        try:
            rows = decode_rows(lines, width, height)
        except ValueError:
            (DESTINATION / f"{name}.incomplete.log").write_text("\n".join(lines) + "\n")
            raise
        rgb = bytearray()
        raw = bytearray()
        for y in range(height):
            for x in range(width):
                pixel = int(rows[y][4 * x : 4 * x + 4], 16)
                raw.extend(pixel.to_bytes(2, "little"))
                rgb.extend(decode_wire_pixel(pixel))
        DESTINATION.mkdir(parents=True, exist_ok=True)
        (DESTINATION / f"{name}.rgb565").write_bytes(raw)
        Image.frombytes("RGB", (width, height), bytes(rgb)).save(
            DESTINATION / f"{name}.png"
        )
        evidence = {
            "id": name,
            "framework": "factory",
            "sourceCommit": "6b4aa125288b6fe9dca661f10159f6e1e5ee785c",
            "imageSha256": hashlib.sha256(
                (DESTINATION / f"{name}.png").read_bytes()
            ).hexdigest(),
            "width": width,
            "height": height,
            "pixelGeometry": {
                "rawSize": [width, height],
                "crop": [content_origin(tree), 0, 466, 466]
                if content_origin(tree) is not None
                else None,
                "cropFormat": "x,y,width,height",
                "sourceAuthority": "Actual LVGL TREE 466x466 app-container origin; unavailable if no matched container",
            },
            "tree": tree,
            "attributes": [line for line in lines if line.startswith("SWATTR ")],
            "firmwareVariant": "capture-O2"
            if self.capture_variant
            else "diagnostic-Og",
            "firmwareInfo": info,
            "firmwareBinarySha256": hashlib.sha256(
                (
                    Path(__file__).resolve().parents[4]
                    / "vendored-sources/M5StopWatch-UserDemo/build/StopWatch-UserDemo-capture-O2.bin"
                ).read_bytes()
            ).hexdigest()
            if self.capture_variant
            else None,
            "commands": self.history,
            "capturedAt": time.time(),
            "clockMode": "static-only system clock freeze"
            if freeze_clock
            else "system TIME, rendered value unverified"
            if normalize_clock
            else "real-time, no normalization",
            "rgbExpansion": "bit replication, matching cli/src/device/image.mjs",
            "wireEncoding": "M5GFX swap565_t little-endian uint16 words",
            "hardwareAudioMuted": True,
            "hardwareVibrationDisabled": True,
        }
        (DESTINATION / f"{name}.json").write_text(json.dumps(evidence, indent=2) + "\n")
        return evidence


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", default="/dev/cu.usbmodem21101")
    parser.add_argument("--capture")
    parser.add_argument("--freeze-clock", action="store_true")
    parser.add_argument("--capture-variant", action="store_true")
    parser.add_argument("--key", choices=["A", "B", "HOME"])
    parser.add_argument("--tap", nargs=2, type=int)
    parser.add_argument("--hold", type=int, default=80)
    parser.add_argument("command", nargs="*")
    args = parser.parse_args()
    device = FactoryDevice(args.port, args.capture_variant)
    try:
        if args.key:
            device.key(args.key)
        if args.tap:
            device.tap(*args.tap, args.hold)
        if args.command:
            print(
                "\n".join(
                    device.command(
                        " ".join(args.command),
                        "SWTREE END" if args.command[0] == "TREE" else "SWCONTROL OK",
                    )
                )
            )
        if args.capture:
            print(json.dumps(device.capture(args.capture, args.freeze_clock), indent=2))
    finally:
        device.serial.close()


if __name__ == "__main__":
    main()
