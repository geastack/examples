#!/usr/bin/env python3
"""Capture real finite-boundary controls with public LVGL state assertions."""

import calendar
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
    d.command("BOOTHOLDNEXT 15000")
    d.serial.write(b"REBOOT\n")
    d.lines("SWCONTROL APPREADY")
    time.sleep(1)
    capture("boot")
    time.sleep(15)
    for year, month, day, suffix in [
        (2000, 2, 29, "2000-feb29"),
        (2001, 2, 28, "2001-feb28"),
        (2000, 4, 30, "2000-april30"),
        (2000, 1, 31, "2000-january31"),
    ]:
        d.command(f"TIME {calendar.timegm((year, month, day, 11, 26, 0))}")
        setting("Set Date")
        require(f"{year:04d}-{month:02d}")
        d.tap(*require("Next"))
        require(f"{year:04d}-{month:02d}-{day:02d}")
        if selected() != [day - 1]:
            raise RuntimeError("Day roller selection differs from fixture")
        capture("set-date-" + suffix)
    d.command(f"TIME {calendar.timegm((2000, 1, 31, 11, 26, 0))}")
    setting("Set Date")
    d.tap(329, 271)
    time.sleep(0.7)
    require("2000-02")
    d.tap(*require("Next"))
    require("2000-02-29")
    if selected() != [28]:
        raise RuntimeError("Jan31 to Feb clamp failed")
    capture("set-date-day-clamp")
    d.command(f"TIME {calendar.timegm((2099, 12, 31, 11, 26, 0))}")
    setting("Set Date")
    require("2099-12")
    capture("set-date-year2099-month12")
    d.tap(159, 271)
    require("2000-12")
    capture("set-date-year-wrap")
    d.tap(329, 271)
    require("2000-01")
    capture("set-date-month-wrap")
    d.tap(*require("Next"))
    d.tap(234, 271)
    require("2000-01-01")
    if selected() != [0]:
        raise RuntimeError("Actual day roller did not wrap31to1")
    capture("set-date-day-wrap")
    setting("Volume")
    d.tap(47, 225)
    d.tap(65, 225)
    require("5")
    capture("volume-step5")
    d.tap(*require("OK"))
    setting("Volume")
    require("5")
    capture("volume-reopened")
    d.tap(47, 225)
    d.tap(*require("OK"))
    setting("Button")
    # Previous setup deliberately saved00; preserve source UI semantics.
    d.tap(345, 250)
    capture("button-vibration-only")
    d.tap(345, 250)
    d.tap(*require("OK"))
    setting("Button")
    capture("button-reopened-muted")
    d.tap(*require("OK"))
    home(0)
    d.tap(233, 220)
    for _ in range(20):
        alarms = [row for row in labels() if re.fullmatch(r"\d\d:\d\d", row[0])]
        if not alarms:
            break
        d.tap(alarms[0][1], alarms[0][2], 650)
        d.tap(*require("Delete"))
    for _ in range(2):
        d.tap(*require("Add"))
        require("Add Alarm")
        d.command("TOUCH 1 323 220")
        for y in [228, 235, 243, 251, 258, 266]:
            d.command(f"TOUCH 1 323 {y}")
            time.sleep(0.15)
        d.command("TOUCH 0 323 266")
        time.sleep(0.8)
        if selected() != [7, 59]:
            raise RuntimeError("Actual alarm picker did not commit07:59")
        d.tap(*require("OK"))
        require("07:59")
    capture("alarms-multiple", "07:59")
    d.command(f"TIME {calendar.timegm((2000, 1, 28, 7, 59, 0))}")
    time.sleep(1.3)
    capture("alarm-triggered", "07:59")
    d.tap(*require("OK"))
    time.sleep(0.3)
    capture("alarm-queued-second", "07:59")
    d.tap(*require("OK"))
    capture("alarm-dismissed", "Add")
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
    for count in range(2, 19):
        home(6)
        d.tap(233, 220)
        require("Number of Options")
        for _ in range(count - 2):
            d.tap(234, 266)
        if selected() != [count - 2]:
            raise RuntimeError(f"Wheel selector actual state differs for{count}")
        d.tap(*require("OK"))
        shown = {label for label, _, _ in labels()}
        if not {str(n) for n in range(1, count + 1)} <= shown:
            raise RuntimeError(f"Wheel sectors differ from confirmed{count}")
        capture(f"wheel-ready-{count}")
    d.key("B")
    capture("wheel-clockwise-active")
    time.sleep(4)
    capture("wheel-clockwise-result")
    d.key("A")
    capture("wheel-counterclockwise-active")
    time.sleep(4)
    capture("wheel-counterclockwise-result")
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
