#!/usr/bin/env python3
"""Capture additional native factory controls; persisted state is part of evidence."""

import importlib.util
import sys

sys.dont_write_bytecode = True
import time
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "factory_device", Path(__file__).with_name("factory-device.py")
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
d = module.FactoryDevice("/dev/cu.usbmodem21101")
menu = 0


def capture(name, normalize=True):
    time.sleep(0.7)
    d.capture(name)
    print("captured", name, flush=True)


def open_app(index):
    global menu
    d.key("HOME")
    while menu != index:
        d.key("B")
        menu = (menu + 1) % 8
    d.tap(233, 220)


def drag(x1, y1, x2, y2, steps=10, delay=0.07):
    d.command(f"TOUCH 1 {x1} {y1}")
    for index in range(1, steps + 1):
        x = x1 + (x2 - x1) * index // steps
        y = y1 + (y2 - y1) * index // steps
        d.command(f"TOUCH 1 {x} {y}")
        time.sleep(delay)
    d.command(f"TOUCH 0 {x2} {y2}")
    time.sleep(0.7)


def setting(text):
    open_app(7)
    for _ in range(8):
        lines = d.command("TREE", "SWTREE END")
        for line in lines:
            fields = line.split()
            if len(fields) == 12 and fields[3] == "label":
                label = bytes.fromhex(fields[11]).decode()
                y = (int(fields[5]) + int(fields[7])) // 2
                if label.startswith(text) and 80 < y < 390:
                    d.tap(233, y)
                    return y
        drag(233, 360, 233, 150)
    raise RuntimeError(f"Cannot find setting {text}")


try:
    open_app(0)
    capture("alarms-empty")
    d.tap(233, 140)
    capture("alarm-add")
    drag(323, 220, 323, 266, 6, 0.15)
    capture("alarm-add-minute-wrap")
    d.tap(233, 390)
    capture("alarms-enabled")
    d.tap(345, 140)
    capture("alarms-disabled")
    d.tap(345, 140)
    d.tap(160, 140, 650)
    capture("alarm-delete-dialog")
    d.tap(320, 275)
    capture("alarm-delete-cancel")
    d.tap(160, 140, 650)
    d.tap(140, 275)
    capture("alarm-deleted")
    open_app(7)
    capture("settings-device")
    drag(233, 360, 233, 150)
    capture("settings-date")
    drag(233, 360, 233, 150)
    capture("settings-firmware")
    for title, prefix, minimum in [
        ("Brightness", "brightness", 10),
        ("Volume", "volume", 0),
    ]:
        setting(title)
        capture(f"{prefix}-initial")
        d.tap(46, 225)
        capture(f"{prefix}-min")
        drag(46, 225, 420, 225, 8, 0.04)
        capture(f"{prefix}-max")
        d.tap(233, 390)
    setting("Button")
    capture("button-default")
    d.tap(345, 145)
    capture("button-sfx-toggle")
    d.tap(345, 250)
    capture("button-both-toggle")
    d.tap(345, 145)
    d.tap(345, 250)
    d.tap(233, 390)
    setting("Set Time")
    capture("set-time")
    drag(233, 260, 233, 200, 4, 0.02)
    capture("set-time-minute-momentum")
    setting("Set Date")
    capture("set-date-year-month")
    d.tap(233, 390)
    capture("set-date-day")
    y = setting("Version")
    for _ in range(9):
        d.tap(233, y)
    capture("about-start")
    time.sleep(4)
    capture("about-progress")
    open_app(0)
    d.key("HOME")
    drag(233, 5, 233, 90, 6, 0.03)
    capture("battery-visible")
    d.tap(233, 20)
    capture("battery-hidden")
    open_app(3)
    capture("badge-empty")
    d.tap(233, 233, 650)
    capture("badge-edit-dialog")
    d.tap(320, 275)
    capture("badge-edit-cancel")
    d.key("HOME")
finally:
    d.serial.close()
