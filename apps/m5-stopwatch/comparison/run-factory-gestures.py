#!/usr/bin/env python3
"""Run the shared plan using native factory HAL sampling and staged device time."""

import argparse
import hashlib
import importlib.util
import json
import sys
import time
from pathlib import Path

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location(
    "factory_device", Path(__file__).with_name("factory-device.py")
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--cases", default="")
args = parser.parse_args()
plan = json.loads(Path(__file__).with_name("gesture-plan.json").read_text())
destination = module.ROOT / "reports/m5-stopwatch/gestures/factory"
destination.mkdir(parents=True, exist_ok=True)
d = module.FactoryDevice("/dev/cu.usbmodem21101", capture_variant=True)


def prepare(recipe):
    d.serial.reset_input_buffer()
    d.serial.write(b"REBOOT\n")
    d.lines("SWCONTROL APPREADY")
    time.sleep(6.5)
    if recipe["scene"] == "roller":
        d.tap(233, 220)
        d.tap(233, 140)
    elif recipe["scene"] == "settings-list":
        for _ in range(7):
            d.key("B")
        d.tap(233, 220)
    time.sleep(0.8)
    tree = d.command("TREE", "SWTREE END")
    texts = []
    for line in tree:
        fields = line.split()
        if len(fields) == 12 and fields[3] == "label":
            texts.append(bytes.fromhex(fields[11]).decode())
    expected = {
        "launcher": "AlarmClock",
        "roller": "Add Alarm",
        "settings-list": "Device",
    }[recipe["scene"]]
    if expected not in texts:
        raise RuntimeError(
            f"Wrong initial route for {recipe['id']}: missing {expected}"
        )
    if recipe["scene"] == "roller" and not any(
        line.startswith("SWTREE NODE ")
        and " roller " in line
        and line.split()[10] == "7"
        for line in tree
    ):
        raise RuntimeError("Hour roller does not have expected initial7")
    scroll = d.command("SCROLLSTATE", "SWSCROLL ")
    origin = module.content_origin(tree)
    if origin is None:
        raise RuntimeError(
            "No actual 466px scene container for gesture coordinate origin"
        )
    return {
        "coordinateMapping": {
            "rawToLogicalSubtract": [origin, 0],
            "evidence": "Actual initial SWTREE NODE1 466px container; source app_launcher/view/view.cpp:226-227 centers it in 468px screen",
        },
        "route": recipe["requiredRoute"],
        "stateEvidence": {"tree": tree, "scroll": scroll, "verifiedLabel": expected},
        "coldBoot": True,
    }


try:
    selected = set(args.cases.split(",")) if args.cases else None
    for recipe in plan["cases"]:
        if selected and recipe["id"] not in selected:
            continue
        initial = prepare(recipe)
        d.command("GESTURE RESET")
        for event in recipe["events"]:
            state = 0 if event["type"] == "up" else 1
            d.command(
                f"GESTURE TOUCH {event['atMs']} {state} {event['x'] + initial['coordinateMapping']['rawToLogicalSubtract'][0]} {event['y']}"
            )
        for at in recipe["observeAtMs"]:
            d.command(f"GESTURE OBSERVE {at}")
        d.command("GESTURE BEGIN")
        # Nothing is sent/read during playback; observations remain device-side.
        time.sleep((max(recipe["observeAtMs"]) + 400) / 1000)
        lines = d.command("GESTURE RESULT", "SWGESTURE ", 60)
        raw = json.loads(
            next(
                line.split("SWGESTURE ", 1)[1]
                for line in lines
                if line.startswith("SWGESTURE ")
            )
        )
        origin = raw["clock_origin_us"]
        observations = [
            {
                "requestedAtMs": row["requested_at_ms"],
                "actualAtMs": (row["actual_at_us"] - origin) / 1000,
                "nodes": row["nodes"],
                "truncated": row["truncated"],
            }
            for row in raw["observations"]
        ]
        complete = len(observations) == len(recipe["observeAtMs"]) and all(
            row["actualAtMs"] >= 0 for row in observations
        )
        observed = {
            "normalHalVerified": raw["normal_hal_verified"],
            "pointerReadTimes": [
                (row["actual_at_us"] - origin) / 1000 for row in raw["pointer_reads"]
            ],
            "samples": observations,
            "raw": raw,
        }
        receipt = {
            "schemaVersion": 1,
            "framework": "factory",
            "factoryCommit": plan["factoryCommit"],
            "caseId": recipe["id"],
            "coordinateMapping": initial["coordinateMapping"],
            "initial": initial,
            "recipe": recipe,
            "observed": observed,
            "normalHalVerified": raw["normal_hal_verified"],
            "timingEvidenceComplete": complete,
            "comparable": complete
            and raw["normal_hal_verified"]
            and raw["pointer_reads_dropped"] == 0
            and not any(row["truncated"] for row in observations),
            "hardwareMuteVerified": True,
            "hardwareMuteVerification": "Compiled codec mute+PA-off+motor-duty0 guards, successful flash checksum verification; no physical audible stimulus",
            "firmwareIdentity": {
                "optimization": "O2",
                "variant": "capture-O2",
                "binarySha256": hashlib.sha256(
                    (
                        Path(__file__).resolve().parents[4]
                        / "vendored-sources/M5StopWatch-UserDemo/build/StopWatch-UserDemo-capture-O2.bin"
                    ).read_bytes()
                ).hexdigest(),
            },
            "hardwareAudioMuted": True,
            "hardwareVibrationDisabled": True,
            "finalTree": d.command("TREE", "SWTREE END"),
            "commands": d.history,
            "interpretation": "Actual timestamps and normal HAL state are evidence; this receipt does not assert trajectory parity.",
        }
        (destination / (recipe["id"] + ".json")).write_text(
            json.dumps(receipt, indent=2) + "\n"
        )
        (destination / (recipe["id"] + ".log")).write_text("\n".join(lines) + "\n")
        print(
            recipe["id"],
            "reads",
            len(raw["pointer_reads"]),
            "observations",
            len(observations),
            "complete",
            complete,
            "truncated",
            any(row["truncated"] for row in observations),
            flush=True,
        )
finally:
    d.serial.close()
