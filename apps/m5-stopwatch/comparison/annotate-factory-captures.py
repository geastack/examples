#!/usr/bin/env python3
"""Annotate factory manifest states from actual public controls/pixels, failing closed."""

import argparse
import hashlib
import json
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT.parent / "vendored-sources/M5StopWatch-UserDemo"
MANIFEST = json.loads(Path(__file__).with_name("screen-test-manifest.json").read_text())
STATES = {row["id"]: set(row["states"]) for row in MANIFEST["screens"]}
EXTRA_SOURCE = Path(__file__).with_name("capture-gea-extra.mjs").read_text()
EXTRA = {
    match[0]: (match[1], match[2])
    for match in re.findall(
        r"'([^']+)': \['([^']+)', '([^']+)'\]",
        EXTRA_SOURCE[: EXTRA_SOURCE.index("function verifyExtraState")],
    )
}
EXTRA.update(
    {
        "boot": ("startup.boot", "Starting up ..."),
        "guide": ("startup.guide", "first through fifth boot"),
        "factory-initial": ("startup.guide", "first through fifth boot"),
        "badge-edit-ap": ("badge.ap_instructions", "AP ready"),
    }
)


def mapping(name):
    if name in EXTRA:
        return (*EXTRA[name], {})
    match = re.fullmatch(
        r"(number-flow|simple|classic|big-number|launcher)-(\d+)", name
    )
    if match:
        kind, index = match[1], int(match[2])
        if kind == "launcher":
            return (
                "launcher",
                [
                    "AlarmClock",
                    "WatchFace",
                    "Stopwatch",
                    "Badge",
                    "IMU",
                    "Audio.FFT",
                    "LuckyWheel",
                    "Settings",
                ][index],
                {"page": index},
            )
        if kind == "classic":
            return (
                "watch.classic",
                [
                    "mode0: information and ticks",
                    "mode1: ticks without information",
                    "mode2: hands only",
                ][index],
                {"mode": index},
            )
        return (
            "watch." + kind.replace("-", "_"),
            f"palette{index}" if kind == "big-number" else "theme0..9",
            {"palette" if kind == "big-number" else "theme": index},
        )
    match = re.fullmatch(r"wheel-(?:ready-)?(\d+)", name)
    if match:
        return "wheel.spin", "ready", {"options": int(match[1])}
    if name.startswith(("badge-upload-", "badge-button-")):
        return (
            "badge.display",
            "last slot wraps"
            if name == "badge-button-wrap"
            else "A/B previous/next occupied slot"
            if name.startswith("badge-button-")
            else "occupied slot",
            {},
        )
    main = {
        "simple-dot-disabled": ("watch.simple", "dot off"),
        "stopwatch-idle": ("stopwatch", "stopped empty"),
        "stopwatch-running": ("stopwatch", "running"),
        "stopwatch-laps": ("stopwatch", "running with laps"),
        "stopwatch-laps-scrolled": ("stopwatch", "long scrolling lap history"),
        "stopwatch-stopped": ("stopwatch", "paused"),
        "stopwatch-resumed": ("stopwatch", "resumed"),
        "stopwatch-reset": ("stopwatch", "reset"),
        "imu-labels": ("imu", "labels on"),
        "imu-no-labels": ("imu", "labels off"),
        "fft-labels": ("fft", "peak labels shown"),
        "fft-no-labels": ("fft", "peak labels hidden"),
        "wheel-selector-min": ("wheel.selection", "2 options"),
        "wheel-selector-max": ("wheel.selection", "18 options"),
        "wheel-clockwise-active": ("wheel.spin", "clockwise"),
        "wheel-counterclockwise-active": ("wheel.spin", "counterclockwise"),
        "wheel-clockwise-result": ("wheel.spin", "settled outcome"),
        "wheel-counterclockwise-result": ("wheel.spin", "settled outcome"),
    }
    return (*main.get(name, ("", "")), {})


def parse_tree(lines):
    nodes = []
    stack = []
    for line in lines:
        fields = line.split()
        if len(fields) < 11 or fields[:2] != ["SWTREE", "NODE"]:
            continue
        depth = int(fields[2])
        stack = stack[:depth]
        bounds = list(map(int, fields[4:8]))
        opaque = int(fields[8])
        hidden = int(fields[9]) != 0
        parent = stack[-1] if stack else None
        node = {
            "id": len(nodes),
            "depth": depth,
            "kind": fields[3],
            "bounds": bounds,
            "opacity": opaque,
            "hidden": hidden,
            "value": int(fields[10]),
            "text": bytes.fromhex(fields[11]).decode("utf-8")
            if len(fields) == 12
            else "",
            "visible": not hidden
            and opaque > 0
            and (parent is None or parent["visible"]),
        }
        nodes.append(node)
        stack.append(node)
    return nodes


def source_themes(kind):
    text = (SOURCE / f"main/apps/app_watch_face/view/{kind}.cpp").read_text()
    return [
        [int(value, 16) for value in row.split(",")]
        for row in re.findall(r"(?:Theme|Palette)\{((?:0x[0-9A-Fa-f]+,?\s*)+)\}", text)
    ]


def source_guide_pixels():
    text = (SOURCE / "main/assets/images/go_home_guide.c").read_text()
    body = text.split("go_home_guide_map[] = {", 1)[1].split("};", 1)[0]
    raw = bytes(int(value, 16) for value in re.findall(r"0x([0-9a-fA-F]{2})", body))
    if len(raw) != 375 * 278 * 2:
        raise ValueError("Pinned guide RGB565 asset size mismatch")
    result = []
    for index in range(0, len(raw), 2):
        word = raw[index] | (raw[index + 1] << 8)
        r, g, b = word >> 11, (word >> 5) & 63, word & 31
        result.append(((r << 3) | (r >> 2), (g << 2) | (g >> 4), (b << 3) | (b >> 2)))
    return result


def rgb565(color):
    r, g, b = (color >> 16) & 255, (color >> 8) & 255, color & 255
    r, g, b = r >> 3, g >> 2, b >> 3
    return ((r << 3) | (r >> 2), (g << 2) | (g >> 4), (b << 3) | (b >> 2))


def annotate(receipt, image_path):
    name = receipt["id"]
    screen, state, parameters = mapping(name)
    if not screen:
        return None
    nodes = parse_tree(receipt.get("tree", []))
    labels = [n for n in nodes if n["kind"] == "label" and n["visible"]]
    texts = [n["text"] for n in labels]
    alltexts = [n["text"] for n in nodes if n["kind"] == "label"]
    rollers = [n for n in nodes if n["kind"] == "roller" and n["visible"]]
    checks = []
    recipe_assertions = []

    def check(label, actual, expected, matches):
        checks.append(
            {
                "name": label,
                "actual": actual,
                "expected": expected,
                "matches": bool(matches),
            }
        )

    same_frame = (
        receipt.get("firmwareVariant") == "capture-O2"
        and receipt.get("firmwareBinarySha256")
        == "79610dc38698066cc0826a859c2010e4cfb91756cbf804324d9b97fb8049b2ac"
        and "SWATTR END" in receipt.get("attributes", [])
        and "SWTREE END" in receipt.get("tree", [])
    )
    with Image.open(image_path) as raw:
        crop = receipt.get("pixelGeometry", {}).get("crop")
        image = raw.convert("RGB")
        if crop:
            x, y, w, h = crop
            image = image.crop((x, y, x + w, y + h))
        if screen in ["watch.simple", "watch.number_flow"] and "theme" in parameters:
            colors = source_themes(screen.split(".")[-1])[parameters["theme"]]
            probes = [(233, 60, colors[0])]
            if screen == "watch.number_flow":
                probes.append((115, 160, colors[1]))
            for x, y, color in probes:
                actual = image.getpixel((x, y))
                expected = rgb565(color)
                check(
                    "actual pinned source palette interior",
                    list(actual),
                    list(expected),
                    actual == expected,
                )
            check(
                "actual source date label",
                texts,
                "2000/1/28 FRI",
                any("2000" in t and "28" in t and "FRI" in t for t in texts),
            )
        elif screen == "watch.big_number":
            colors = source_themes("big_number")[parameters["palette"]]
            pixels = list(image.getdata())
            counts = [pixels.count(rgb565(c)) for c in colors]
            check(
                "actual four source tinted digit colors",
                counts,
                "each>=20",
                all(n >= 20 for n in counts),
            )
        elif screen == "watch.classic":
            mode = parameters["mode"]
            information = any(re.fullmatch(r"\d\d:\d\d", t) for t in texts)
            check(
                "actual information hidden/visible via ancestor flags",
                information,
                mode == 0,
                information == (mode == 0),
            )
            tick = rgb565(0x6E6E6E)
            count = sum(
                image.getpixel((x, y)) == tick
                for y in range(228, 239)
                for x in range(8, 40)
            )
            check(
                "actual major tick interior",
                count,
                "0" if mode == 2 else ">0",
                count == 0 if mode == 2 else count > 0,
            )
        elif screen == "watch.simple" and state == "dot off":
            background = image.getpixel((0, 0))
            changed = sum(
                image.getpixel((x, y)) != background
                for y in range(10, 456)
                for x in range(10, 456)
                if 206**2 <= (x - 233) ** 2 + (y - 233) ** 2 <= 222**2
            )
            check("actual entire seconds-dot annulus blank", changed, 0, changed == 0)
            check("actual Simple time label", texts, "11:26", "11:26" in texts)
        elif screen == "launcher":
            check("actual selected launcher title", texts, state, state in texts)
        elif screen == "startup.guide":
            pictures = [
                node
                for node in nodes
                if node["bounds"][2] - node["bounds"][0] + 1 == 375
                and node["bounds"][3] - node["bounds"][1] + 1 == 278
                and node["visible"]
            ]
            count = None
            if len(pictures) == 1 and crop:
                x0, y0, x1, y1 = pictures[0]["bounds"]
                actual = list(
                    image.crop((x0 - crop[0], y0, x1 - crop[0] + 1, y1 + 1)).getdata()
                )
                expected = source_guide_pixels()
                count = sum(left != right for left, right in zip(actual, expected))
            check("actual pinned375x278 guide RGB565 asset", count, 0, count == 0)
            check(
                "normal source startup condition",
                receipt.get("guideCondition"),
                "actual first-five source path",
                bool(receipt.get("guideCondition")),
            )
        elif screen == "launcher.battery":
            panels = [
                node
                for node in nodes
                if node["bounds"][2] - node["bounds"][0] + 1 == 158
                and node["bounds"][3] - node["bounds"][1] + 1 == 65
            ]
            expected_visible = state == "first popup"
            check(
                "actual158x65 status panel visibility",
                [(node["visible"], node["bounds"]) for node in panels],
                expected_visible,
                len(panels) == 1 and panels[0]["visible"] == expected_visible,
            )
            if panels:
                check(
                    "actual source settled status spring position",
                    panels[0]["bounds"][1],
                    -17 if expected_visible else -85,
                    panels[0]["bounds"][1] == (-17 if expected_visible else -85),
                )
        elif screen == "startup.boot":
            check(
                "actual boot labels",
                texts,
                ["Starting up ...", "V0.5"],
                all(t in texts for t in ["Starting up ...", "V0.5"]),
            )
        elif screen == "badge.ap_instructions":
            check(
                "actual AP instruction labels",
                texts,
                "Wi-Fi SSID and192.168.4.1",
                any("M5StopWatch-" in t and "192.168.4.1" in t for t in texts),
            )
        elif screen == "badge.confirm":
            check(
                "actual foreground edit dialog",
                texts,
                "Enter badge edit?",
                "Enter badge edit?" in texts
                if state == "Edit"
                else "Enter badge edit?" not in texts
                and "Tap and hold to change image" in texts,
            )
        elif screen == "badge.display":
            proof_path = ROOT / f"reports/m5-stopwatch/{name}-factory-visual.json"
            if proof_path.exists():
                proof = json.loads(proof_path.read_text())
                parameters["slot"] = proof["expectedSlot"]
                check(
                    "actual distinct source fixture pixels",
                    proof["visualFixtureIdentified"],
                    True,
                    proof["visualFixtureIdentified"]
                    and proof["captureSha256"]
                    == hashlib.sha256(image_path.read_bytes()).hexdigest(),
                )
            else:
                check(
                    "actual empty-image edit hint",
                    texts,
                    "Tap and hold to change image",
                    "Tap and hold to change image" in texts,
                )
        elif screen == "stopwatch":
            normalized = [t.replace("O", "0") for t in texts]
            laps = [t for t in alltexts if re.fullmatch(r"LAP \d+", t)]
            if state in [
                "running",
                "running with laps",
                "long scrolling lap history",
                "resumed",
            ]:
                check(
                    "actual running button labels",
                    texts,
                    ["LAP", "STOP"],
                    "LAP" in texts and "STOP" in texts,
                )
            elif state == "paused":
                check(
                    "actual paused button labels",
                    texts,
                    ["RESET", "START"],
                    "RESET" in texts and "START" in texts,
                )
            else:
                check(
                    "actual zero/empty idle state",
                    normalized,
                    "00:00:00.00 plusSTART and0laps",
                    "00:00:00.00" in normalized and "START" in texts and not laps,
                )
            if "laps" in state or state == "long scrolling lap history":
                check("actual8lap public labels", laps, 8, len(laps) == 8)
            if state == "long scrolling lap history":
                before_path = image_path.with_name("stopwatch-laps.json")
                before = parse_tree(json.loads(before_path.read_text()).get("tree", []))
                a = [n["bounds"][1] for n in before if n["text"] == "LAP 1"]
                b = [n["bounds"][1] for n in nodes if n["text"] == "LAP 1"]
                check(
                    "actual lap content displaced after drag",
                    b,
                    "differentfromprior",
                    bool(a and b and a != b),
                )
        elif screen == "wheel.selection":
            expected = 0 if state == "2 options" else 16
            values = [r["value"] for r in rollers]
            check(
                "actual source finite selector selected index",
                values,
                [expected],
                values == [expected] and "Number of Options" in texts,
            )
        elif screen == "wheel.spin" and state == "ready":
            values = sorted(int(t) for t in alltexts if re.fullmatch(r"\d+", t))
            expected = list(range(1, parameters["options"] + 1))
            check("actual sector public labels", values, expected, values == expected)
        elif screen == "settings.time":
            summary = next(
                (text for text in texts if re.fullmatch(r"\d\d:\d\d:\d\d", text)), None
            )
            values = [
                node["value"]
                for node in sorted(rollers, key=lambda node: node["bounds"][0])
            ]
            expected = list(map(int, summary.split(":"))) if summary else None
            check(
                "actual source timeworker heading/summary",
                texts,
                "Set Time plusHH:MM:SS",
                "Set Time" in texts and summary is not None,
            )
            check(
                "actual public hour/minute/second selection",
                values,
                expected,
                expected is not None and values == expected,
            )
            if summary:
                parameters.update(dict(zip(["hour", "minute", "second"], expected)))
        elif screen.startswith("settings.date"):
            summary = next(
                (t for t in texts if re.fullmatch(r"\d{4}-\d\d(?:-\d\d)?", t)), None
            )
            values = [r["value"] for r in sorted(rollers, key=lambda r: r["bounds"][0])]
            expected_dates = {
                "set-date-2000-feb29": "2000-02-29",
                "set-date-2001-feb28": "2001-02-28",
                "set-date-2000-april30": "2000-04-30",
                "set-date-2000-january31": "2000-01-31",
                "set-date-day-clamp": "2000-02-29",
                "set-date-day-wrap": "2000-01-01",
                "set-date-year2099-month12": "2099-12",
                "set-date-year-wrap": "2000-12",
                "set-date-month-wrap": "2000-01",
            }
            expected = expected_dates.get(name, summary)
            check(
                "actual complete source summary",
                summary,
                expected,
                summary is not None and summary == expected,
            )
            if summary:
                parts = list(map(int, summary.split("-")))
                expected_values = (
                    [parts[2] - 1]
                    if len(parts) == 3
                    else [parts[0] - 2000, parts[1] - 1]
                )
                check(
                    "actual public roller selections matchsummary",
                    values,
                    expected_values,
                    values == expected_values,
                )
                parameters["date"] = summary
        elif screen == "alarms.add":
            values = [r["value"] for r in sorted(rollers, key=lambda r: r["bounds"][0])]
            expected = [7, 0] if state == "default07:00" else [7, 59]
            check(
                "actual hour/minute public selections",
                values,
                expected,
                values == expected and "Add Alarm" in texts,
            )
            parameters["time"] = "07:00" if state == "default07:00" else "07:59"
        elif screen == "alarms.list":
            alarm_labels = [
                n
                for n in nodes
                if n["kind"] == "label" and re.fullmatch(r"\d\d:\d\d", n["text"])
            ]
            if state == "empty":
                check(
                    "actual noalarm rows plusAdd",
                    len(alarm_labels),
                    0,
                    not alarm_labels and "Add" in alltexts,
                )
            elif state in ["multiple", "long scrolling list"]:
                times = [n["text"] for n in alarm_labels]
                expected = ["07:59", "07:59"] + ["07:00"] * 4
                check("actual six source alarmrows", times, expected, times == expected)
                if state == "long scrolling list":
                    before = json.loads(
                        image_path.with_name("alarms-multiple.json").read_text()
                    )
                    a = [
                        n["bounds"][1]
                        for n in parse_tree(before.get("tree", []))
                        if n["text"] == "07:59"
                    ]
                    b = [n["bounds"][1] for n in alarm_labels if n["text"] == "07:59"]
                    check(
                        "actual list displacement after drag",
                        b,
                        "differentfromprior",
                        bool(a and b and a != b),
                    )
                    if name == "alarm-hold-cancel":
                        check(
                            "consumed movement timing authority",
                            None,
                            "actualHAL trace before400ms",
                            False,
                        )
        elif screen == "alarms.delete":
            check(
                "actual foreground delete dialog",
                texts,
                "Delete this alarm?",
                (
                    "Delete this alarm?" in texts
                    and "Delete" in texts
                    and "Cancel" in texts
                )
                if state == "Delete"
                else "Delete this alarm?" not in texts
                and any(re.fullmatch(r"\d\d:\d\d", t) for t in texts),
            )
        elif screen == "alarms.trigger":
            modal = any(
                n["text"] == "07:59" and n["bounds"][3] - n["bounds"][1] + 1 == 98
                for n in labels
            )
            check(
                "actual foreground alarm label andOK",
                {"modal": modal, "ok": "OK" in texts},
                state,
                not modal and "Add" in alltexts
                if state == "OK dismiss"
                else modal and "OK" in texts,
            )
            if state == "simultaneous queue":
                prior = (
                    ROOT / "reports/m5-stopwatch/captures/factory/alarms-multiple.json"
                )
                old = json.loads(prior.read_text())
                rows = [
                    n["text"]
                    for n in parse_tree(old.get("tree", []))
                    if n["kind"] == "label" and n["text"] == "07:59"
                ]
                check(
                    "actual source same-time alarm rows",
                    rows,
                    "atleast2",
                    len(rows) >= 2,
                )
        elif screen in ["settings.brightness", "settings.volume"]:
            numbers = [int(t) for t in texts if re.fullmatch(r"\d+", t)]
            slider = [n["value"] for n in nodes if n["kind"] == "slider"]
            expect = (
                5
                if name in ["volume-step5", "volume-reopened"]
                else 10
                if name == "brightness-min"
                else 0
                if name == "volume-min"
                else 100
                if name.endswith("-max")
                else None
            )
            if expect is not None:
                check(
                    "actual numeric percentage and public slider",
                    {"text": numbers, "slider": slider},
                    expect,
                    numbers == [expect] and slider == [expect],
                )
                parameters["value"] = expect
            if state in ["OK persist", "5% steps"]:
                check(
                    "normal actualOK beforeworkerreopen",
                    receipt.get("commands", []),
                    "normalTOUCHcommands",
                    any(
                        c.get("command", "").startswith("TOUCH 1")
                        for c in receipt.get("commands", [])
                    ),
                )
        elif screen == "settings.button":
            rows = []
            for y in [147, 254]:
                left = image.getpixel((319, y))
                right = image.getpixel((369, y))
                on = left == rgb565(0x53BD65) and right == (255, 255, 255)
                off = left == (255, 255, 255) and right == rgb565(0x3A3A3A)
                rows.append(True if on else False if off else None)
            parameters.update({"sfx": rows[0], "vibration": rows[1]})
            check(
                "actual source-colored switch knob positions",
                rows,
                "both unambiguous",
                all(value is not None for value in rows),
            )
            if name in ["button-vibration-only", "button-reopened-muted"]:
                wanted = (
                    [False, True] if name == "button-vibration-only" else [False, False]
                )
                recipe_assertions.append(
                    {
                        "name": "intended capture parameters",
                        "actual": rows,
                        "expected": wanted,
                        "matches": rows == wanted,
                    }
                )
        elif screen == "settings.menu":
            check(
                "actual visible section header",
                [(n["text"], n["bounds"]) for n in labels],
                state,
                any(n["text"] == state and 0 <= n["bounds"][1] < 466 for n in labels),
            )
        elif screen == "settings.about":
            value = next(
                (
                    int(re.match(r"(\d+)% Complete", t)[1])
                    for t in texts
                    if re.match(r"\d+% Complete", t)
                ),
                None,
            )
            check(
                "actual progress label",
                value,
                0 if state == "0% Complete" else ">0",
                value == 0
                if state == "0% Complete"
                else value is not None and value > 0,
            )
        elif screen == "imu":
            found = [t for t in texts if re.match(r"[XYZ]:", t)]
            check(
                "actual conditionalaxislabels",
                found,
                state,
                len(found) == 3 if state == "labels on" else not found,
            )
        elif screen == "fft":
            hz = "Hz" in texts
            number = any(re.fullmatch(r"\d+", t) for t in texts)
            check(
                "actual peak labelvisibility",
                texts,
                state,
                hz and number
                if state == "peak labels shown"
                else not hz and not number,
            )
    comparison = {}
    for key in [
        "sfx",
        "vibration",
        "hour",
        "minute",
        "second",
        "theme",
        "palette",
        "mode",
        "page",
        "options",
        "slot",
        "value",
        "time",
    ]:
        if key in parameters:
            comparison[key] = parameters[key]
    if "date" in parameters:
        parts = list(map(int, parameters["date"].split("-")))
        comparison.update(dict(zip(["year", "month", "day"], parts)))
    if screen == "alarms.list":
        comparison["alarmTimes"] = [
            node["text"]
            for node in nodes
            if node["kind"] == "label" and re.fullmatch(r"\d\d:\d\d", node["text"])
        ]
    if screen == "alarms.trigger":
        comparison["time"] = "07:59"
    verified = bool(checks) and all(c["matches"] for c in checks) and same_frame
    return {
        "manifestScreenId": screen,
        "manifestState": state,
        "parameters": parameters,
        "comparisonParameters": comparison,
        "stateVerified": verified,
        "stateEvidence": {
            "controlAssertions": checks,
            "recipeAssertions": recipe_assertions,
            "actualPublicNodes": nodes,
            "sourceCommit": receipt.get("sourceCommit"),
            "snapshotBoundaryVerified": same_frame,
            "publicStateAssertionsMatch": bool(checks)
            and all(c["matches"] for c in checks),
            "limitation": None
            if same_frame
            else "Older separateTREE/snapshot or missingexactbuildSHA/same-frameattributes: publicstate only, image-bound state unverified.",
            "authority": "Pinned factorysource widgetconstruction and publicLVGLTREE/attributes; candidatefilename alone never verifies a state.",
            "dynamicInputMatched": False,
        },
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--directory", type=Path, default=ROOT / "reports/m5-stopwatch/captures/factory"
    )
    args = parser.parse_args()
    summary = []
    for path in sorted(args.directory.glob("*.json")):
        receipt = json.loads(path.read_text())
        if receipt.get("manifestScreenId") == "badge.phone":
            continue
        if "id" not in receipt or not path.with_suffix(".png").exists():
            continue
        annotation = annotate(receipt, path.with_suffix(".png"))
        if not annotation:
            continue
        if annotation["manifestState"] not in STATES.get(
            annotation["manifestScreenId"], set()
        ):
            raise ValueError(f"Unknownmanifeststate {annotation}")
        receipt.update(annotation)
        path.write_text(json.dumps(receipt, indent=2) + "\n")
        summary.append(
            {
                "id": receipt["id"],
                "screen": annotation["manifestScreenId"],
                "state": annotation["manifestState"],
                "verified": annotation["stateVerified"],
                "checks": annotation["stateEvidence"]["controlAssertions"],
                "sameFrame": annotation["stateEvidence"]["snapshotBoundaryVerified"],
            }
        )
    output = {
        "schemaVersion": 1,
        "receiptsAnnotated": len(summary),
        "statesVerified": sum(row["verified"] for row in summary),
        "receipts": summary,
        "interpretation": "Actual state assertions only; this does not establish rendering parity or matched dynamicinputs.",
    }
    (ROOT / "reports/m5-stopwatch/factory-state-annotations.json").write_text(
        json.dumps(output, indent=2) + "\n"
    )
    print(
        output["receiptsAnnotated"],
        "annotated",
        output["statesVerified"],
        "sameframeverified",
    )


if __name__ == "__main__":
    main()
