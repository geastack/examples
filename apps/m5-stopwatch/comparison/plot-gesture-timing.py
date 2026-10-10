#!/usr/bin/env python3
"""Plot source-mapped staged/consumed times without alignment or interpolation."""

import hashlib
import importlib.util
import json
import math
from pathlib import Path

from reportlab.graphics import renderPDF
from reportlab.graphics.charts.lineplots import LinePlot
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics.widgets.markers import makeMarker
from reportlab.lib import colors

ROOT = Path(__file__).resolve().parents[4]
REPORTS = ROOT / "examples" / "reports" / "m5-stopwatch"
HERE = Path(__file__).resolve().parent
PLAN = HERE / "gesture-plan.json"
CASES = ("launcher.short-fast-throw", "roller.interrupted-snap")
INK = colors.HexColor("#152d3a")
MUTED = colors.HexColor("#536b78")
FACTORY = colors.HexColor("#39799b")
GEA = colors.HexColor("#16785f")
REQUESTED = colors.HexColor("#78858c")

spec = importlib.util.spec_from_file_location("gesture_analysis", HERE / "compare-gestures.py")
analysis = importlib.util.module_from_spec(spec)
spec.loader.exec_module(analysis)


def chart(drawing, series, bottom, height, x_max, y_min, y_max, y_step, y_format="%.0f"):
    """Use point markers only; the chart never connects or resamples points."""
    plot = LinePlot()
    plot.x, plot.y, plot.width, plot.height = 100, bottom, 384, height
    usable = [s for s in series if s["points"]]
    if not usable:
        raise ValueError("No retained points for input timing plot")
    plot.data = [s["points"] for s in usable]
    plot.joinedLines = 0
    plot.xValueAxis.valueMin, plot.xValueAxis.valueMax = 0, x_max
    plot.xValueAxis.valueStep = 25 if x_max <= 350 else 100
    plot.yValueAxis.valueMin, plot.yValueAxis.valueMax = y_min, y_max
    plot.yValueAxis.valueStep = y_step
    plot.yValueAxis.labelTextFormat = y_format
    for axis in (plot.xValueAxis, plot.yValueAxis):
        axis.labels.fontName, axis.labels.fontSize = "Helvetica", 8
        axis.labels.fillColor = MUTED
        axis.strokeColor = colors.HexColor("#bdcbd3")
        axis.strokeWidth = 0.5
        axis.visibleGrid = True
        axis.gridStrokeColor = colors.HexColor("#e0e8ec")
        axis.gridStrokeWidth = 0.35
    for index, series in enumerate(usable):
        plot.lines[index].strokeColor = series["color"]
        plot.lines[index].symbol = makeMarker(
            series.get("marker", "Circle"), size=4.5,
            strokeColor=series["color"], strokeWidth=0.7,
            fillColor=colors.white if series.get("open") else series["color"],
        )
    drawing.add(plot)
    drawing.add(String(484, bottom - 22, "Time from each device's gesture origin (ms)",
                       textAnchor="end", fontName="Helvetica", fontSize=8, fillColor=MUTED))


def state_series(rows, x_key, y_key, color, lane=None, upper_us=None):
    result = []
    for state in (1, 0):
        points = [(row[x_key] / 1000, lane if lane is not None else row[y_key]) for row in rows
                  if row["state"] == state and (upper_us is None or row[x_key] <= upper_us)]
        result.append({"points": points, "color": color, "open": not state})
    return result


def plot_case(case, recipe, receipts):
    traces = {name: analysis.normalize(receipt, name) for name, receipt in receipts.items()}
    for name, trace in traces.items():
        if trace["issues"]:
            raise ValueError(f"Incomplete {name} evidence: {trace['issues']}")
        staged = [{key: row.get(key) for key in analysis.recipe_events(recipe)[0]}
                  for row in trace["raw"]["events"]]
        if staged != analysis.recipe_events(recipe):
            raise ValueError("Actual staged recipe differs after source coordinate mapping")
        if set(trace["observations"]) != set(recipe["observeAtMs"]):
            raise ValueError("Actual observation schedule is incomplete")
    requested = [{"relative_us": e["atMs"] * 1000, "state": int(e["type"] != "up"),
                  "x": e["x"], "y": e["y"]} for e in recipe["events"]]
    staged = {}
    for name, trace in traces.items():
        staged[name] = [{**row, "relative_us": row["actual_at_us"] - trace["raw"]["clock_origin_us"]}
                        for row in trace["raw"]["events"]]
    # A disclosed burst bound contains every actual handled state change and
    # injected event. Later unchanged release polls remain in the full receipt.
    last_change_us = max(row["relative_us"] for row in requested
                         + staged["factory"] + staged["gea"]
                         + traces["factory"]["changes"] + traces["gea"]["changes"])
    burst_ms = (math.ceil(last_change_us / 25000) + 1) * 25
    axis = "x" if recipe["scene"] == "launcher" else "y"
    figure = Drawing(504, 432)
    figure.add(Rect(0, 0, 504, 432, fillColor=colors.white, strokeColor=None))
    title = "Launcher: short fast throw" if recipe["scene"] == "launcher" else "Hour picker: interrupted snap"
    figure.add(String(16, 415, title, fontName="Helvetica-Bold", fontSize=14, fillColor=INK))
    figure.add(String(16, 399, "Input panels: filled = pressed; open = released. No lines, interpolation or time alignment.",
                      fontName="Helvetica", fontSize=8, fillColor=MUTED))
    figure.add(String(16, 380, f"Requested / injected / consumed input - burst view, 0-{burst_ms} ms",
                      fontName="Helvetica-Bold", fontSize=9, fillColor=INK))
    lanes = {5: "Requested", 4: "Factory injected", 3: "Gea injected",
             2: "Factory HAL polls", 1: "Gea consumed"}
    input_series = state_series(requested, "relative_us", axis, REQUESTED, lane=5)
    input_series += state_series(staged["factory"], "relative_us", axis, FACTORY, lane=4)
    input_series += state_series(staged["gea"], "relative_us", axis, GEA, lane=3)
    input_series += state_series(traces["factory"]["rows"], "relative_us", axis, FACTORY,
                                 lane=2, upper_us=burst_ms * 1000)
    input_series += state_series(traces["gea"]["rows"], "relative_us", axis, GEA,
                                 lane=1, upper_us=burst_ms * 1000)
    chart(figure, input_series, 287, 75, burst_ms, 0, 6, 1,
          lambda value: lanes.get(int(value), "") if value == int(value) else "")

    figure.add(String(16, 251, f"Actual UI-handled pointer {axis.upper()} (px) - same burst bound",
                      fontName="Helvetica-Bold", fontSize=9, fillColor=INK))
    positions = state_series(requested, "relative_us", axis, REQUESTED)
    for name, color in (("factory", FACTORY), ("gea", GEA)):
        positions += state_series(traces[name]["rows"], "relative_us", "handler_" + axis,
                                  color, upper_us=burst_ms * 1000)
        releases = [{**row, "raw_release": row[axis]} for row in traces[name]["rows"]
                    if not row["state"] and row[axis] != row["handler_" + axis]]
        positions.append({"points": [(row["relative_us"] / 1000, row["raw_release"])
                                     for row in releases if row["relative_us"] <= burst_ms * 1000],
                          "color": color, "open": True, "marker": "Square"})
    values = [point[1] for series in positions for point in series["points"]]
    minimum = math.floor(min(values) / 20) * 20 - 20
    maximum = math.ceil(max(values) / 20) * 20 + 20
    chart(figure, positions, 165, 70, burst_ms, minimum, maximum, 20)
    figure.add(String(16, 128, "Native observations - full requested schedule (vertical: requested ms)",
                      fontName="Helvetica-Bold", fontSize=9, fillColor=INK))
    observations = [{"points": [(time, time) for time in recipe["observeAtMs"]],
                     "color": REQUESTED, "marker": "Diamond"}]
    for name, color in (("factory", FACTORY), ("gea", GEA)):
        observations.append({"points": [(row["relative_us"] / 1000, time)
                                         for time, row in traces[name]["observations"].items()],
                             "color": color, "marker": "Square" if name == "factory" else "Circle"})
    observation_max = math.ceil(max(point[0] for s in observations for point in s["points"]) / 100) * 100
    requested_max = math.ceil(max(recipe["observeAtMs"]) / 200) * 200
    chart(figure, observations, 41, 70, observation_max, 0, requested_max, 200)
    figure.add(String(16, 4, "Grey = requested; blue = factory; green = Gea. Open squares = raw HAL release point when different.",
                      fontName="Helvetica", fontSize=7.5, fillColor=MUTED))
    output = REPORTS / ("gesture-timing-" + case + ".pdf")
    renderPDF.drawToFile(figure, str(output))
    receipt = {
        "schema_version": 1, "case_id": case, "recipe": recipe,
        "sources": {name: receipt["_source"] for name, receipt in receipts.items()},
        "coordinate_mappings": {name: trace["coordinate_mapping"] for name, trace in traces.items()},
        "clock_origins_us": {name: trace["raw"]["clock_origin_us"] for name, trace in traces.items()},
        "requested": requested, "actual_staged": staged,
        "actual_consumed": {name: trace["rows"] for name, trace in traces.items()},
        "actual_observations": {name: list(trace["observations"].values()) for name, trace in traces.items()},
        "burst_view": {"min_ms": 0, "max_ms": burst_ms,
                       "authority": "Next 25 ms tick after all actual injected events and handled state changes",
                       "omitted_unchanged_polls": {name: sum(row["relative_us"] > burst_ms * 1000
                                                           for row in trace["rows"])
                                                  for name, trace in traces.items()}},
        "time_alignment_search": False, "interpolation": False,
        "note": "Factory normal LVGL polls and Gea consumed dispatch events are different sampling authorities. "
                "Factory release uses the previous pressed point; raw coordinates remain retained separately. "
                "Later unchanged release polls are excluded only from the disclosed burst view and remain in this receipt.",
        "plot": str(output.relative_to(ROOT)),
        "plot_sha256": hashlib.sha256(output.read_bytes()).hexdigest(),
    }
    output.with_suffix(".json").write_text(json.dumps(receipt, indent=2) + "\n")
    print(output)


def build():
    plan = json.loads(PLAN.read_text())
    receipts = {name: analysis.read_receipts(REPORTS / "gestures" / name) for name in ("factory", "gea")}
    expected = {recipe["id"] for recipe in plan["cases"]}
    if any(set(rows) != expected for rows in receipts.values()):
        raise ValueError("Publication plots require both complete 21-case receipt sets")
    recipes = {recipe["id"]: recipe for recipe in plan["cases"]}
    for case in CASES:
        plot_case(case, recipes[case], {name: rows[case] for name, rows in receipts.items()})


if __name__ == "__main__":
    build()
