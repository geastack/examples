#!/usr/bin/env python3
"""Capture pinned factory states using its normal HAL input and real framebuffer."""

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
device = module.FactoryDevice("/dev/cu.usbmodem21101")
menu_index = 0


def capture(name):
    time.sleep(0.7)
    device.capture(name)
    print("captured", name, flush=True)


def home(index):
    global menu_index
    device.key("HOME")
    while menu_index != index:
        device.key("B")
        menu_index = (menu_index + 1) % 8


def open_app(index):
    home(index)
    device.tap(233, 220)
    time.sleep(0.8)


try:
    # Requires confirmed initial launcher at AlarmClock; fail closed on missing label.
    tree = device.command("TREE", "SWTREE END")
    if not any("416c61726d436c6f636b" in line for line in tree):
        raise RuntimeError(
            "Confirm/dismiss the factory guide and center AlarmClock before running"
        )
    for index in range(8):
        home(index)
        capture(f"launcher-{index}")
    open_app(1)
    for face, count in [
        ("classic", 3),
        ("number-flow", 10),
        ("big-number", 4),
        ("simple", 10),
    ]:
        for index in range(count):
            capture(f"{face}-{index}")
            device.tap()
        if face != "simple":
            device.key("B")
    device.tap(233, 233, 600)
    capture("simple-dot-disabled")
    device.tap(233, 233, 600)
    open_app(2)
    capture("stopwatch-idle")
    device.tap(315, 85)
    time.sleep(1.1)
    capture("stopwatch-running")
    for _ in range(7):
        device.tap(160, 85)
    capture("stopwatch-laps")
    device.command("TOUCH 1 233 390")
    for step in range(1, 9):
        device.command(f"TOUCH 1 233 {390 - step * 155 // 8}")
        time.sleep(0.03)
    device.command("TOUCH 0 233 235")
    capture("stopwatch-laps-scrolled")
    for name in ["stopwatch-stopped", "stopwatch-resumed"]:
        device.tap(315, 85)
        capture(name)
    device.tap(315, 85)
    device.tap(160, 85)
    capture("stopwatch-reset")
    for index, prefix in [(4, "imu"), (5, "fft")]:
        open_app(index)
        time.sleep(2)
        capture(f"{prefix}-labels")
        device.tap()
        capture(f"{prefix}-no-labels")
    open_app(6)
    capture("wheel-selector-min")
    device.command("TOUCH 1 233 260")
    for y in [208, 155, 103, 50]:
        device.command(f"TOUCH 1 233 {y}")
        time.sleep(0.02)
    device.command("TOUCH 0 233 50")
    capture("wheel-selector-max")
    device.tap(233, 390)
    capture("wheel-18")
    device.tap()
    capture("wheel-clockwise-active")
    time.sleep(4)
    capture("wheel-clockwise-result")
    device.key("A")
    capture("wheel-counterclockwise-active")
    time.sleep(4)
    capture("wheel-counterclockwise-result")
    home(0)
finally:
    device.serial.close()
