#!/usr/bin/env python3
"""Repeat static watch/launcher states with disclosed system-only frozen fixture clock."""

import importlib.util
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

try:
    d.serial.write(b"REBOOT\n")
    d.lines("SWCONTROL APPREADY")
    time.sleep(6.5)
    for index in range(8):
        d.capture(f"launcher-{index}", freeze_clock=True)
        print("captured static", f"launcher-{index}", flush=True)
        d.key("B")
    d.key("B")
    d.tap(233, 220)
    for face, count in [
        ("classic", 3),
        ("number-flow", 10),
        ("big-number", 4),
        ("simple", 10),
    ]:
        for index in range(count):
            d.capture(f"{face}-{index}", freeze_clock=True)
            print("captured static", f"{face}-{index}", flush=True)
            d.tap()
        if face != "simple":
            d.key("B")
    d.tap(233, 233, 600)
    d.capture("simple-dot-disabled", freeze_clock=True)
    d.key("HOME")
    d.command("CLOCKFREEZE 0")
finally:
    d.serial.close()
