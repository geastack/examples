#!/usr/bin/env python3
"""Verify the actual generated carrier against pinned factory glyph descriptors."""
import importlib.util
from pathlib import Path
import sys
import unittest

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("font_audit", Path(__file__).with_name("analyze-fonts.py"))
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


class FinalFontCarrier(unittest.TestCase):
    def test_all_generated_source_glyphs_metrics_and_pair_kerning_are_exact(self):
        root = Path(__file__).resolve().parents[4]
        reference = root / "vendored-sources/M5StopWatch-UserDemo"
        generated = audit.generated_fonts(root / "examples/.gea/build/esp32-s3-m5stack-stopwatch/app-builds/m5-stopwatch/apps/m5-stopwatch/gea_embedded_font_generated.cpp")
        sources = [("Montserrat", size, reference / f"components/lvgl/src/font/lv_font_montserrat_{size}.c") for size in (10, 14, 16, 18, 20, 22, 24, 26, 28, 36)]
        sources += [("Maple", size, reference / f"main/assets/fonts/lv_font_maple_mono_medium_{size}.c") for size in (24, 28, 48)]
        sources += [("Commissioner", size, reference / f"main/assets/fonts/CommissionerMedium{size}.c") for size in (64, 108)]
        sources += [("MontserratBold", 26, reference / "main/assets/fonts/MontserratSemiBold26.c")]
        compared = 0
        for family, size, source in sources:
            with self.subTest(family=family, size=size):
                factory, gea = audit.factory_font(source), generated[(family, size)]
                self.assertTrue(gea["strictGlyphLookup"])
                self.assertEqual(gea["fallbackCodepoint"], 65533)
                self.assertEqual(gea["lineHeight"], factory["lineHeight"])
                self.assertEqual(gea["descender"], factory["baselineFromBottom"])
                shared = factory["glyphs"].keys() & gea["glyphs"].keys()
                self.assertGreater(len(shared), 0)
                for cp in shared:
                    for key in ("width", "height", "x", "y", "advance16", "advance", "coverage"):
                        self.assertEqual(gea["glyphs"][cp][key], factory["glyphs"][cp][key], (family, size, cp, key))
                expected_pairs = [pair for pair in factory["kerning"] if pair["left"] in gea["glyphs"] and pair["right"] in gea["glyphs"]]
                self.assertEqual(gea["kerning"], expected_pairs)
                compared += len(shared)
        self.assertGreater(compared, 1500)
        pair = next(p for p in generated[("Montserrat", 28)]["kerning"] if p["left"] == 65 and p["right"] == 86)
        self.assertLess(pair["adjustment16"], 0)


if __name__ == "__main__":
    unittest.main()
