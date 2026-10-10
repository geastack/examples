#!/usr/bin/env python3
"""Verify figure page layout using in-memory images and PDF bytes only."""

import importlib.util
from io import BytesIO
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

from PIL import Image as PillowImage
from pypdf import PdfReader
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Spacer

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("report", Path(__file__).with_name("report.py"))
report = importlib.util.module_from_spec(spec)
spec.loader.exec_module(report)


def image_bytes(width=2000, height=1800):
    result = BytesIO()
    PillowImage.new("RGB", (width, height), "white").save(result, format="PNG")
    result.seek(0)
    return result


class FigureLayout(unittest.TestCase):
    def test_image_preserves_aspect_ratio_and_page_bounds(self):
        picture = report.figure_image(image_bytes(), 178 * mm)
        self.assertLessEqual(picture.drawWidth, 178 * mm)
        self.assertLessEqual(picture.drawHeight, 155 * mm)
        self.assertAlmostEqual(picture.drawWidth / picture.drawHeight, 2000 / 1800)

    def test_explanation_plot_and_caption_remain_on_one_a4_page(self):
        output = BytesIO()
        doc = SimpleDocTemplate(output, pagesize=(210 * mm, 297 * mm),
                                leftMargin=16 * mm, rightMargin=16 * mm,
                                topMargin=19 * mm, bottomMargin=21 * mm)
        section = {"title": "Actual consumed input timing", "figure": "memory.png",
                   "paragraphs": ["Requested, injected and consumed times are shown separately. "
                                  "The plot does not interpolate or align the two input streams."]}
        figure = [report.figure_image(image_bytes(), doc.width), Spacer(1, 5),
                  report.para("Actual clock-relative observations; no inferred tolerance.", "SmallCopy")]
        with patch.object(report, "figure_flowables", return_value=figure):
            story = report.section_flowables(section, doc.width, doc.height - 12)
        doc.build(story)
        output.seek(0)
        pdf = PdfReader(output)
        self.assertEqual(len(pdf.pages), 1)
        text = pdf.pages[0].extract_text()
        self.assertIn("Actual consumed input timing", text)
        self.assertIn("does not interpolate", text)
        self.assertIn("no inferred tolerance", text)

    def test_oversized_explanation_is_rejected_instead_of_splitting_plot(self):
        section = {"title": "Oversized plot page", "figure": "memory.png",
                   "paragraphs": ["A long retained explanation. " * 20] * 20}
        with patch.object(report, "figure_flowables", return_value=[report.figure_image(image_bytes(), 178 * mm)]):
            with self.assertRaisesRegex(ValueError, "exceeds one report page"):
                report.section_flowables(section, 178 * mm, 257 * mm - 12)

    def test_missing_retained_figure_is_not_rendered_as_a_placeholder(self):
        with self.assertRaises(FileNotFoundError):
            report.figure_flowables({"figure": "unrecorded-gesture-figure.png"}, 178 * mm)


if __name__ == "__main__":
    unittest.main()
