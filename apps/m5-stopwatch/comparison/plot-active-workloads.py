#!/usr/bin/env python3
"""Plot recorded completed-upload FPS; retain the exact selected evidence."""

import hashlib
import json
import math
from pathlib import Path
import statistics

from reportlab.graphics import renderPDF
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.shapes import Drawing, Line, Rect, String
from reportlab.lib import colors

ROOT = Path(__file__).resolve().parents[4]
REPORTS = ROOT / "examples" / "reports" / "m5-stopwatch"
SOURCE = REPORTS / "runtime-summary.json"
OUTPUT = REPORTS / "active-workload-fps.pdf"
RECEIPT = REPORTS / "active-workload-fps.json"
SCENARIOS = (
    ("number-flow-active", "NumberFlow"),
    ("fft-passive", "Passive FFT"),
    ("stopwatch-running", "Running stopwatch"),
)
SERIES = (
    ("factory", "refresh16", "Factory O2 / 16 ms", "#39799b"),
    ("gea", "benchmark-fenced", "Gea O2", "#16785f"),
)
INK = colors.HexColor("#152d3a")
MUTED = colors.HexColor("#536b78")


def selected_data(data):
    rows = []
    for framework, variant, label, color in SERIES:
        values = []
        for scenario, _ in SCENARIOS:
            selected = [s for s in data["summary"] if (
                s["framework"], s["variant"], s["optimization"], s["scenario"]
            ) == (framework, variant, "O2", scenario)]
            if len(selected) != 1:
                raise ValueError("Expected one exact summary for " + str((framework, scenario)))
            row = selected[0]
            metric = row["metrics"]["presented_fps"]
            if row["repetitions"] != 3 or not metric or metric["n"] != 3:
                raise ValueError("Plot requires three recorded completed-upload windows")
            if not all(math.isfinite(metric[k]) and metric[k] >= 0 for k in ("min", "median", "max")):
                raise ValueError("Invalid FPS evidence")
            runs = [r for r in data["runs"] if (
                r["sample"]["framework"], r["sample"]["variant"],
                r["sample"]["optimization"], r["sample"]["scenario"]
            ) == (framework, variant, "O2", scenario)]
            if len(runs) != 3 or any(r["sample"]["completion_fence"] != 1 for r in runs):
                raise ValueError("Plot requires three completion-fenced raw windows")
            actual = [r["metrics"]["presented_fps"] for r in runs]
            if (min(actual), statistics.median(actual), max(actual)) != (
                metric["min"], metric["median"], metric["max"]
            ):
                raise ValueError("Summary does not match retained raw windows")
            sources = []
            for run in runs:
                source = run["sample"]["source"]
                path = ROOT / source["path"]
                sources.append({**source, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                                "run_id": run["sample"]["run_id"],
                                "window_us": run["sample"]["window_us"],
                                "presented_frames": run["sample"]["presented_frames"],
                                "presented_fps": run["metrics"]["presented_fps"]})
            values.append({"scenario": scenario, **metric, "sources": sources})
        rows.append({"framework": framework, "variant": variant, "optimization": "O2",
                     "label": label, "color": color, "values": values})
    return rows


def build():
    data = json.loads(SOURCE.read_text())
    selected = selected_data(data)
    drawing = Drawing(504, 365)
    drawing.add(Rect(0, 0, 504, 365, fillColor=colors.white, strokeColor=None))
    drawing.add(String(46, 344, "Completed uploads in three active workloads",
                       fontName="Helvetica-Bold", fontSize=14, fillColor=INK))
    drawing.add(String(46, 326, "Median of three 10-second windows; whiskers show observed min-max",
                       fontName="Helvetica", fontSize=9, fillColor=MUTED))
    for index, row in enumerate(selected):
        x = 46 + index * 172
        drawing.add(Rect(x, 300, 11, 11, fillColor=colors.HexColor(row["color"]), strokeColor=None))
        drawing.add(String(x + 17, 302, row["label"], fontName="Helvetica", fontSize=10, fillColor=INK))
    chart = VerticalBarChart()
    chart.x, chart.y, chart.width, chart.height = 46, 68, 434, 210
    chart.data = [[v["median"] for v in row["values"]] for row in selected]
    chart.categoryAxis.categoryNames = [label for _, label in SCENARIOS]
    chart.categoryAxis.labels.fontName = "Helvetica"
    chart.categoryAxis.labels.fontSize = 10
    chart.categoryAxis.labels.fillColor = INK
    chart.valueAxis.valueMin, chart.valueAxis.valueMax, chart.valueAxis.valueStep = 0, 70, 10
    chart.valueAxis.labels.fontSize = 9
    chart.valueAxis.labels.fillColor = MUTED
    chart.valueAxis.visibleGrid = True
    chart.valueAxis.gridStrokeColor = colors.HexColor("#dce5e9")
    chart.valueAxis.gridStrokeWidth = 0.5
    chart.barWidth, chart.groupSpacing, chart.barSpacing = 20, 30, 3
    for index, row in enumerate(selected):
        chart.bars[index].fillColor = colors.HexColor(row["color"])
        chart.bars[index].strokeColor = None
    drawing.add(chart)
    # Query the chart's own bar geometry, rather than duplicating its positioning.
    chart.draw()
    for series, row in enumerate(selected):
        for category, value in enumerate(row["values"]):
            x, _, width, _ = chart._barPositions[series][category]
            center = x + width / 2
            low = chart.y + value["min"] / 70 * chart.height
            high = chart.y + value["max"] / 70 * chart.height
            for line in (Line(center, low, center, high),
                         Line(center - 4, low, center + 4, low),
                         Line(center - 4, high, center + 4, high)):
                line.strokeColor, line.strokeWidth = INK, 0.8
                drawing.add(line)
            drawing.add(String(center, high + 7, f'{value["median"]:.2f}',
                               textAnchor="middle", fontName="Helvetica-Bold", fontSize=9, fillColor=INK))
    drawing.add(String(10, 286, "FPS", fontName="Helvetica-Bold", fontSize=9, fillColor=MUTED))
    drawing.add(String(46, 30, "n = 3 per bar. Observed ranges are not confidence intervals.",
                       fontName="Helvetica", fontSize=9, fillColor=MUTED))
    drawing.add(String(46, 15, "Diagnostic final-DMA fences enabled; panel scan rate is not measured.",
                       fontName="Helvetica", fontSize=9, fillColor=MUTED))
    renderPDF.drawToFile(drawing, str(OUTPUT))
    receipt = {
        "schema_version": 1, "metric": "completed_upload_frames_per_second",
        "source": str(SOURCE.relative_to(ROOT)),
        "source_sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        "plot": str(OUTPUT.relative_to(ROOT)), "series": selected,
        "statistic": "median", "whiskers": "observed_minimum_and_maximum_of_three_windows",
        "confidence_interval": False,
        "scope": "Same board, different application/native/SDK pipelines; not isolated renderer throughput.",
    }
    RECEIPT.write_text(json.dumps(receipt, indent=2) + "\n")
    print(OUTPUT)
    print(RECEIPT)


if __name__ == "__main__":
    build()
