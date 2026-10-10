#!/usr/bin/env python3
"""Cold-boot factory workloads; no serial traffic occurs within measurement windows."""

import argparse
import importlib.util
import sys

sys.dont_write_bytecode = True
import json
import time
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "factory_device", Path(__file__).with_name("factory-device.py")
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--refresh", type=int, choices=[16, 33], default=33)
parser.add_argument("--completion", type=int, choices=[0, 1], default=1)
parser.add_argument(
    "--scenes",
    default="menu-idle,classic-active,number-flow-active,imu-stationary,fft-passive,stopwatch-running,wheel-idle",
)
parser.add_argument("--repetitions", type=int, default=3)
parser.add_argument("--optimization", choices=["Og", "O2"], default="Og")
args = parser.parse_args()
output = (
    module.ROOT
    / f"reports/m5-stopwatch/factory-{args.optimization}-{args.refresh}-fence{args.completion}.jsonl"
)
scenes = {
    "menu-idle": 0,
    "classic-active": 1,
    "number-flow-active": 1,
    "imu-stationary": 4,
    "fft-passive": 5,
    "stopwatch-running": 2,
    "wheel-idle": 6,
}
device = module.FactoryDevice("/dev/cu.usbmodem21101")
try:
    for name in args.scenes.split(","):
        index = scenes[name]
        device.serial.reset_input_buffer()
        device.serial.write(b"REBOOT\n")
        device.lines("SWCONTROL APPREADY", 30)
        time.sleep(6.5)
        # New launcher starts at AlarmClock; no screenshot or tree scan before heap sampling.
        for _ in range(index):
            device.key("B")
        if name != "menu-idle":
            device.tap(233, 220)
        if name == "number-flow-active":
            device.key("B")
        if name == "stopwatch-running":
            device.tap(315, 85)
        if name == "wheel-idle":
            device.tap(233, 390)
        device.command(f"REFRESH {args.refresh}")
        device.command(f"COMPLETION {args.completion}")
        time.sleep(3)
        for repetition in range(args.repetitions):
            run_id = f"factory-{args.optimization}-{args.refresh}-{repetition}"
            device.command(f"BENCH BEGIN {run_id} {name}", "SWBENCH ")
            time.sleep(10)
            lines = device.command("BENCH END", "SWBENCH ")
            with output.with_suffix(".log").open("a") as raw_log:
                raw_log.write("\n".join(lines) + "\n")
            sample = json.loads(
                next(line[8:] for line in lines if line.startswith("SWBENCH "))
            )
            if sample["phase"] != "end" or sample["scenario"] != name:
                raise ValueError("Unexpected measurement window")
            output.parent.mkdir(parents=True, exist_ok=True)
            with output.open("a") as file:
                file.write(json.dumps(sample) + "\n")
            print(
                name,
                repetition,
                sample.get("presented_frames"),
                sample["window_us"],
                flush=True,
            )
finally:
    device.serial.close()
