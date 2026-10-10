#!/usr/bin/env python3
"""Build the presentation report from recorded measurements and capture receipts."""

import json
import argparse
from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

from PIL import Image as PillowImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

HERE = Path(__file__).resolve().parents[3] / 'reports' / 'm5-stopwatch'
DATA = HERE / "report-data.json"
OUTPUT = HERE / "stopwatch-comparison.pdf"
INK = colors.HexColor("#152d3a")
MUTED = colors.HexColor("#536b78")
ACCENT = colors.HexColor("#16785f")
PALE = colors.HexColor("#edf3f5")
styles = getSampleStyleSheet()
styles.add(ParagraphStyle("CoverTitle", fontName="Helvetica-Bold", fontSize=31,
                          leading=36, textColor=INK, spaceAfter=18))
styles.add(ParagraphStyle("Deck", fontSize=14, leading=20, textColor=MUTED, spaceAfter=14))
styles.add(ParagraphStyle("Section", fontName="Helvetica-Bold", fontSize=18, leading=23,
                          textColor=INK, spaceBefore=8, spaceAfter=14))
styles.add(ParagraphStyle("Copy", fontSize=10.5, leading=15, textColor=INK, spaceAfter=10))
styles.add(ParagraphStyle("SmallCopy", fontSize=8.3, leading=11.5, textColor=MUTED, spaceAfter=7))
styles.add(ParagraphStyle("Cell", fontSize=8.6, leading=12, textColor=INK))
styles.add(ParagraphStyle("CellHead", fontName="Helvetica-Bold", fontSize=8.6, leading=12,
                          textColor=colors.white))
styles.add(ParagraphStyle("CaptureTitle", fontName="Helvetica-Bold", fontSize=11, leading=14,
                          textColor=INK, spaceAfter=6))
styles.add(ParagraphStyle("ColumnLabel", fontSize=9, leading=12, alignment=TA_CENTER,
                          textColor=MUTED))
styles.add(ParagraphStyle("CodeExample", fontName="Courier", fontSize=8,
                          leading=11, textColor=INK, spaceAfter=12))


def para(text, style="Copy"):
    return Paragraph(text, styles[style])


def table(rows, widths=None):
    cells = [[para(escape(str(cell)), "CellHead" if index == 0 else "Cell")
              for cell in row] for index, row in enumerate(rows)]
    result = Table(cells, colWidths=widths, repeatRows=1, hAlign="LEFT")
    result.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), INK),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LINEBELOW", (0, 0), (-1, 0), 0.6, INK),
    ]))
    return result


def footer(canvas, doc):
    canvas.saveState()
    width, height = doc.pagesize
    canvas.setStrokeColor(colors.HexColor("#cbd8df"))
    canvas.line(16 * mm, 14 * mm, width - 16 * mm, 14 * mm)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(16 * mm, 9 * mm, doc.report_footer)
    canvas.drawRightString(width - 16 * mm, 9 * mm, str(doc.page))
    if doc.page > 1:
        canvas.setFont("Helvetica", 8)
        canvas.drawString(16 * mm, height - 11 * mm, doc.report_header)
    canvas.restoreState()


def capture_card(pair, width):
    image_size = (width - 14) / 2
    image_height = 160 * mm if pair.get("layout") == "browser" else image_size
    columns = []
    for framework in ("factory", "gea"):
        filename = pair.get(framework)
        omission = pair.get("displayOmissions", {}).get(framework)
        if omission:
            picture = para(escape(omission), "SmallCopy")
        elif filename:
            path = HERE / filename
            if not path.is_file():
                raise FileNotFoundError(path)
            image_source = str(path)
            geometry = pair.get("appliedGeometry", {}).get(framework)
            if geometry and geometry.get("crop") is not None:
                with PillowImage.open(path) as raw:
                    if list(raw.size) != geometry.get("rawSize") or not (
                        geometry.get("evidence") or geometry.get("sourceAuthority")
                    ):
                        raise ValueError("Report crop requires source-backed matching raw geometry")
                    x, y, crop_width, crop_height = geometry["crop"]
                    if min(x, y) < 0 or min(crop_width, crop_height) <= 0 or (
                        x + crop_width > raw.width or y + crop_height > raw.height
                    ):
                        raise ValueError("Report crop exceeds raw image")
                    image_source = BytesIO()
                    raw.crop((x, y, x + crop_width, y + crop_height)).save(image_source, format="PNG")
                    image_source.seek(0)
            picture = Image(image_source, width=image_size, height=image_height,
                            kind="proportional")
        else:
            picture = para("No verified capture recorded", "SmallCopy")
        columns.append([para("M5Stack / LVGL" if framework == "factory" else "Gea / native", "ColumnLabel"),
                        Spacer(1, 4), picture])
    images = Table([[columns[0], columns[1]]], colWidths=[image_size + 7, image_size + 7])
    images.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"),
                               ("LEFTPADDING", (0, 0), (-1, -1), 0),
                               ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))
    caption = escape(pair.get("notes", ""))
    metric = pair.get("metricLabel")
    if metric:
        caption += ("<br/>" if caption else "") + escape(metric)
    return KeepTogether([
        para(escape(pair.get("label", pair["id"])), "CaptureTitle"),
        images, Spacer(1, 5), para(caption, "SmallCopy"), Spacer(1, 12),
    ])


def figure_image(source, width, max_height=155 * mm):
    with PillowImage.open(source) as raw:
        image_width, image_height = raw.size
    if min(image_width, image_height) <= 0:
        raise ValueError("Report figure requires positive image dimensions")
    if hasattr(source, "seek"):
        source.seek(0)
    scale = min(width / image_width, max_height / image_height)
    picture = Image(source, width=image_width * scale, height=image_height * scale)
    picture.hAlign = "CENTER"
    return picture


def figure_flowables(section, width):
    filename = section.get("figure")
    if not isinstance(filename, str) or not filename:
        raise ValueError("Report figure must name a retained image")
    path = HERE / filename
    if not path.is_file():
        raise FileNotFoundError(path)
    result = [figure_image(str(path), width), Spacer(1, 5)]
    if section.get("figureCaption"):
        result.append(para(escape(section["figureCaption"]), "SmallCopy"))
    return result


def section_flowables(section, width, max_height):
    result = [para(escape(section["title"]), "Section")]
    result.extend(para(text) for text in section.get("paragraphs", []))
    for example in section.get("codeExamples", []):
        if example.get("label"):
            result.append(para(escape(example["label"]), "CaptureTitle"))
        result.append(Preformatted(example["code"], styles["CodeExample"]))
    if section.get("figure"):
        result.extend(figure_flowables(section, width))
    if section.get("table"):
        count = len(section["table"][0])
        proportions = section.get("columnWeights", [1] * count)
        widths = [width * value / sum(proportions) for value in proportions]
        result.extend([table(section["table"], widths), Spacer(1, 12)])
    result.extend(para(text, "SmallCopy") for text in section.get("notes", []))
    if section.get("figure"):
        # Keep the plot and explanation on one A4 page. Conservative spacing
        # accounting rejects oversized content instead of splitting the plot.
        height = sum(item.wrap(width, max_height)[1] + item.getSpaceBefore() + item.getSpaceAfter()
                     for item in result)
        if height > max_height:
            raise ValueError("Figure section exceeds one report page: " + section["title"])
        return [KeepTogether(result)]
    return result


def build(data_path=DATA, output_path=OUTPUT):
    data = json.loads(data_path.read_text())
    doc = SimpleDocTemplate(str(output_path), pagesize=(210 * mm, 297 * mm),
                            rightMargin=16 * mm, leftMargin=16 * mm,
                            topMargin=19 * mm, bottomMargin=21 * mm,
                            title=data.get("documentTitle", "Gea and M5Stack StopWatch: application comparison"),
                            author="Geastack", subject="Reproducible visual, functional and resource evaluation")
    doc.report_footer = data.get("footerLabel", "GEASTACK  /  M5STACK STOPWATCH COMPARISON")
    doc.report_header = data.get("headerLabel", "Same-board application evaluation")
    width = doc.width
    story = [Spacer(1, 24 * mm), para(data.get("coverTitle", "Gea and M5Stack<br/>StopWatch"), "CoverTitle"),
             para(data.get("coverDeck", "A native application comparison on the M5Stack C152"), "Deck"),
             HRFlowable(width="100%", thickness=2, color=ACCENT), Spacer(1, 18),
             para(escape(data["summary"]), "Deck"),
             para(escape(data["dateLabel"]), "SmallCopy"),
             para(escape(data["scopeLabel"]), "SmallCopy"), Spacer(1, 12)]
    for finding in data.get("headlineFindings", []):
        story.append(para(escape(finding)))
    story.append(PageBreak())
    for section in data["sections"]:
        story.extend(section_flowables(section, width, doc.height - 12))
        story.append(PageBreak())
    pairs = data["pairs"]
    offset = 0
    while offset < len(pairs):
        count = 1 if pairs[offset].get("layout") == "browser" else 2
        if count == 2 and offset + 1 < len(pairs) and pairs[offset + 1].get("layout") == "browser":
            count = 1
        story.append(para("Screen comparison appendix", "Section"))
        for pair in pairs[offset:offset + count]:
            story.append(capture_card(pair, width))
        offset += count
        if offset < len(pairs):
            story.append(PageBreak())
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(output_path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=DATA)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    build(args.data, args.output)
