#!/usr/bin/env python3
import importlib.util
from pathlib import Path
import sys
import unittest
from PIL import Image, ImageDraw

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("badge_visual", Path(__file__).with_name("verify-badge-image.py"))
visual = importlib.util.module_from_spec(spec)
spec.loader.exec_module(visual)


class BadgeVisual(unittest.TestCase):
    def test_intrinsic_centered_fixture_rejects_stretch_and_solid_substitute(self):
        fixture = Image.new("RGB", (200, 200), "#206080")
        draw = ImageDraw.Draw(fixture)
        draw.rectangle((20, 20, 44, 31), fill="white")
        for index in range(10):
            draw.line((30, 30 + index * 13, 170, 170 - index * 11), fill=(index * 20, 255 - index * 20, index * 15), width=3)
        centered = Image.new("RGB", (466, 466), "black")
        centered.paste(fixture, (133, 133))
        result = visual.verify(fixture, centered, 1)
        self.assertTrue(result["visualFixtureIdentified"])
        self.assertTrue(result["exactQuantizedPixels"])
        self.assertFalse(visual.verify(fixture, fixture.resize((466, 466)), 1)["visualFixtureIdentified"])
        self.assertFalse(visual.verify(fixture, Image.new("RGB", (466, 466), "#206080"), 1)["visualFixtureIdentified"])
        with self.assertRaises(ValueError):
            visual.verify(fixture, Image.new("RGB", (468, 466)), 1)


if __name__ == "__main__":
    unittest.main()
