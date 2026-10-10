#!/usr/bin/env python3
"""Recapture remaining installed factory groups with immutable silent capture firmware."""

import importlib.util
import json
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
    result = []
    for line in tree():
        fields = line.split()
        if len(fields) == 12 and fields[3] == "label" and fields[9] == "0":
            result.append(
                (
                    bytes.fromhex(fields[11]).decode(),
                    (int(fields[4]) + int(fields[6])) // 2,
                    (int(fields[5]) + int(fields[7])) // 2,
                )
            )
    return result


def require(text):
    for label, x, y in labels():
        if label == text and 0 <= y < 466:
            return x, y
    raise RuntimeError(f"Actual label unavailable: {text!r}")


def capture(name):
    evidence = d.capture(name, normalize_clock=False)
    print("captured", name, flush=True)
    return evidence


def open_app(index):
    global menu
    d.key("HOME")
    while menu != index:
        d.key("B")
        menu = (menu + 1) % 8
    d.tap(233, 220)


def drag():
    d.command("TOUCH 1 233 370")
    for y in [330, 290, 250, 210, 170]:
        d.command(f"TOUCH 1 233 {y}")
        time.sleep(0.07)
    d.command("TOUCH 0 233 170")
    time.sleep(0.6)


def setting(prefix):
    open_app(7)
    for _ in range(10):
        for label, x, y in labels():
            if label.startswith(prefix) and 80 < y < 390:
                d.tap(x, y)
                return
        drag()
    raise RuntimeError(f"Setting unavailable: {prefix}")


try:
    time.sleep(2)
    initial_log = d.serial.read(d.serial.in_waiting).decode("utf-8", errors="replace")
    guide = capture("guide")
    image_nodes = [
        line
        for line in guide["tree"]
        if len(line.split()) >= 11
        and int(line.split()[6]) - int(line.split()[4]) + 1 == 375
        and int(line.split()[7]) - int(line.split()[5]) + 1 == 278
    ]
    if not image_nodes:
        raise RuntimeError("Normal first-five guide image not visible")
    guide["guideCondition"] = {
        "source": "main/hal/hal.cpp:169-183; main/apps/app_launcher/app_launcher.cpp:108-139",
        "normalPath": "shouldShowGuide reads system/launch_count; only<5 creates realGuidePage; no fake route used",
        "initialBootLog": initial_log,
        "guideImageNodes": image_nodes,
    }
    (module.DESTINATION / "guide.json").write_text(json.dumps(guide, indent=2) + "\n")
    d.key("HOME")
    capture("battery-visible")
    d.tap(233, 20)
    time.sleep(0.4)
    capture("battery-hidden")
    d.command("TIME 949058760")
    open_app(0)
    for _ in range(20):
        alarms = [
            row
            for row in labels()
            if re.fullmatch(r"\d\d:\d\d", row[0]) and 90 < row[2] < 390
        ]
        if not alarms:
            break
        d.tap(alarms[0][1], alarms[0][2], 650)
        d.tap(*require("Delete"))
    require("Add")
    d.tap(*require("Add"))
    require("Add Alarm")
    capture("alarm-add")
    d.tap(*require("OK"))
    alarm = next(row for row in labels() if row[0] == "07:00")
    d.tap(alarm[1], alarm[2], 650)
    require("Delete this alarm?")
    capture("alarm-delete-dialog")
    d.tap(*require("Cancel"))
    require("07:00")
    capture("alarm-delete-cancel")
    for index, prefix in [(4, "imu"), (5, "fft")]:
        open_app(index)
        time.sleep(1)
        capture(prefix + "-labels")
        d.tap()
        capture(prefix + "-no-labels")
    open_app(6)
    require("Number of Options")
    capture("wheel-selector-min")
    for _ in range(16):
        d.tap(234, 266)
    capture("wheel-selector-max")
    open_app(7)
    require("Device")
    capture("settings-device")
    drag()
    capture("settings-date")
    drag()
    capture("settings-firmware")
    setting("Brightness")
    d.tap(47, 225)
    require("10")
    capture("brightness-min")
    d.tap(420, 225)
    require("100")
    capture("brightness-max")
    d.tap(*require("OK"))
    setting("Set Time")
    require("Set Time")
    capture("set-time")
    y = setting("Version")
    # Setting helper enters About by tapping first Version click; ten total needed.
    for _ in range(9):
        for label, x, y in labels():
            if label.startswith("Version:") and 0 < y < 466:
                d.tap(x, y)
                break
        else:
            raise RuntimeError("Version control unavailable before10clicks")
    time.sleep(0.5)
    capture("about-progress")
    d.key("HOME")
    d.command("BOOTHOLDNEXT 5000")
    d.serial.write(b"REBOOT\n")
    d.lines("SWCONTROL APPREADY")
    time.sleep(0.8)
    capture("boot")
    time.sleep(5)
finally:
    d.serial.close()
