#!/usr/bin/env python3
"""Capture actual overflowing alarm/lap lists and canceled long press."""

import importlib.util
import re
import sys
import time
from pathlib import Path

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location(
    "factory_device", Path(__file__).with_name("factory-device.py")
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
d = module.FactoryDevice("/dev/cu.usbmodem21101", capture_variant=True)
menu = 0


def tree():
    return d.command("TREE", "SWTREE END")


def labels():
    rows = []
    for line in tree():
        f = line.split()
        if len(f) == 12 and f[3] == "label" and f[9] == "0":
            rows.append(
                (
                    bytes.fromhex(f[11]).decode(),
                    (int(f[4]) + int(f[6])) // 2,
                    (int(f[5]) + int(f[7])) // 2,
                )
            )
    return rows


def require(label):
    matches = [r for r in labels() if r[0] == label and 0 <= r[2] < 466]
    if not matches:
        raise RuntimeError(f"Missing actual label {label!r}")
    return matches[0][1:]


def home(index):
    global menu
    d.key("HOME")
    while menu != index:
        d.key("B")
        menu = (menu + 1) % 8


def setting(title):
    home(7)
    d.tap(233, 220)
    for _ in range(10):
        for label, x, y in labels():
            if label.startswith(title) and 80 < y < 390:
                d.tap(x, y)
                return
        d.command("TOUCH 1 233 360")
        for y in range(339, 149, -21):
            d.command(f"TOUCH 1 233 {y}")
            time.sleep(0.07)
        d.command("TOUCH 0 233 150")
        time.sleep(0.5)
    raise RuntimeError(f"Missing setting {title}")


def capture(name, expected=None):
    if expected:
        require(expected)
    evidence = d.capture(name, normalize_clock=False)
    print("captured verified", name, flush=True)
    return evidence


def selected():
    return [
        int(f[10])
        for line in tree()
        if len(f := line.split()) >= 11 and f[3] == "roller" and f[9] == "0"
    ]


try:
    d.serial.write(b"REBOOT\n")
    d.lines("SWCONTROL APPREADY")
    time.sleep(6.5)
    d.command("TIME 949058760")
    d.tap(233, 220)
    for _ in range(4):
        for _ in range(8):
            additions = [
                row for row in labels() if row[0] == "Add" and 80 < row[2] < 390
            ]
            if additions:
                d.tap(additions[0][1], additions[0][2])
                break
            d.command("TOUCH 1 233 370")
            for y in [330, 290, 250, 210, 170]:
                d.command(f"TOUCH 1 233 {y}")
                time.sleep(0.07)
            d.command("TOUCH 0 233 170")
            time.sleep(0.5)
        require("Add Alarm")
        d.tap(*require("OK"))
    capture("alarms-multiple")
    d.command("TOUCH 1 233 370")
    for y in [330, 290, 250, 210, 170]:
        d.command(f"TOUCH 1 233 {y}")
        time.sleep(0.07)
    d.command("TOUCH 0 233 170")
    time.sleep(0.6)
    capture("alarms-scrolled")
    row = next(
        row
        for row in labels()
        if re.fullmatch(r"\d\d:\d\d", row[0]) and 100 < row[2] < 330
    )
    d.command(f"TOUCH 1 {row[1]} {row[2]}")
    time.sleep(0.25)
    d.command(f"TOUCH 1 {row[1]} {row[2] - 60}")
    time.sleep(0.65)
    d.command(f"TOUCH 0 {row[1]} {row[2] - 60}")
    if any(label == "Delete this alarm?" for label, _, _ in labels()):
        raise RuntimeError("Actual scrolling did not cancel alarm long press")
    capture("alarm-hold-cancel")
    home(2)
    d.tap(233, 220)
    d.key("B")
    time.sleep(1)
    for _ in range(8):
        d.key("A")
    capture("stopwatch-laps")
    d.command("TOUCH 1 233 390")
    for y in [350, 310, 270, 230, 190]:
        d.command(f"TOUCH 1 233 {y}")
        time.sleep(0.07)
    d.command("TOUCH 0 233 190")
    time.sleep(0.6)
    capture("stopwatch-laps-scrolled")
    d.key("B")
    capture("stopwatch-stopped")
    home(0)
except Exception as error:
    import json

    failure = {
        "error": str(error),
        "commands": d.history,
        "actualTree": tree(),
        "firmwareVariant": "capture-O2",
        "hardwareAudioMuted": True,
        "hardwareVibrationDisabled": True,
    }
    (
        module.ROOT
        / f"reports/m5-stopwatch/factory-boundary-failure-{int(time.time())}.json"
    ).write_text(json.dumps(failure, indent=2) + "\n")
    raise
finally:
    d.serial.close()
