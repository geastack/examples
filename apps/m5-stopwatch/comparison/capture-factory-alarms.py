#!/usr/bin/env python3
"""Normalize reference alarms through UI and verify every captured alarm route."""

import importlib.util
import sys

sys.dont_write_bytecode = True
import re
import time
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "factory_device", Path(__file__).with_name("factory-device.py")
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
d = module.FactoryDevice("/dev/cu.usbmodem21101")


def labels():
    result = []
    for line in d.command("TREE", "SWTREE END"):
        f = line.split()
        if len(f) == 12 and f[3] == "label":
            text = bytes.fromhex(f[11]).decode()
            x1, y1, x2, y2 = map(int, f[4:8])
            if 0 <= y1 < 466 and 0 <= x1 < 468:
                result.append((text, (x1 + x2) // 2, (y1 + y2) // 2))
    return result


def require(text):
    found = [item for item in labels() if item[0] == text]
    if not found:
        raise RuntimeError(f"Factory route missing {text!r}")
    return found[0][1:]


def capture(name, required):
    require(required)
    d.capture(name)
    print("captured verified", name, flush=True)


try:
    d.serial.write(b"REBOOT\n")
    d.lines("SWCONTROL APPREADY")
    time.sleep(6.5)
    d.tap(233, 220)
    for _ in range(20):
        alarms = [item for item in labels() if re.fullmatch(r"\d\d:\d\d", item[0])]
        if not alarms:
            break
        d.tap(alarms[0][1], alarms[0][2], 650)
        d.tap(*require("Delete"))
    else:
        raise RuntimeError("Reference alarm cleanup did not converge")
    capture("alarms-empty", "Add")
    d.tap(*require("Add"))
    capture("alarm-add", "Add Alarm")
    d.command("TOUCH 1 323 220")
    for y in [228, 235, 243, 251, 258, 266]:
        d.command(f"TOUCH 1 323 {y}")
        time.sleep(0.15)
    d.command("TOUCH 0 323 266")
    time.sleep(0.8)
    capture("alarm-add-minute-wrap", "Add Alarm")
    d.tap(*require("OK"))
    alarm = next(item for item in labels() if re.fullmatch(r"\d\d:\d\d", item[0]))
    capture("alarms-enabled", alarm[0])
    d.tap(345, alarm[2])
    capture("alarms-disabled", alarm[0])
    d.tap(345, alarm[2])
    d.tap(alarm[1], alarm[2], 650)
    capture("alarm-delete-dialog", "Delete this alarm?")
    d.tap(*require("Cancel"))
    capture("alarm-delete-cancel", alarm[0])
    d.tap(alarm[1], alarm[2], 650)
    d.tap(*require("Delete"))
    capture("alarm-deleted", "Add")
finally:
    d.serial.close()
