#!/usr/bin/env python3
"""Import pinned factory glyph bitmaps/metrics; the application contains no LVGL code."""
import base64
import importlib.util
import json
from pathlib import Path
import sys

sys.dont_write_bytecode = True
APP = Path(__file__).resolve().parents[1]
WORKSPACE = APP.parents[2]
REFERENCE = WORKSPACE / "vendored-sources/M5StopWatch-UserDemo"
spec = importlib.util.spec_from_file_location("factory_font_parser", APP / "comparison/analyze-fonts.py")
parser = importlib.util.module_from_spec(spec)
spec.loader.exec_module(parser)
REVISION = "6b4aa125288b6fe9dca661f10159f6e1e5ee785c"


def export(family, cases, filename):
    fonts = []
    for size, path in cases:
        source = parser.factory_font(path)
        glyphs = [{"codepoint": codepoint, "width": glyph["width"], "height": glyph["height"],
                   "advance16": glyph["advance16"], "bearingX": glyph["x"], "bearingY": -glyph["y"],
                   "coverage": base64.b64encode(bytes(glyph["coverage"])).decode()}
                  for codepoint, glyph in sorted(source["glyphs"].items())]
        line_height = source["lineHeight"]
        missing_width = line_height // 2 + 2
        missing_coverage = bytes(255 if x in (0, missing_width - 1) or y in (0, line_height - 1) else 0
                                 for y in range(line_height) for x in range(missing_width))
        glyphs.append({"codepoint": 65533, "width": missing_width, "height": line_height,
                       "advance16": missing_width * 16, "bearingX": 0,
                       "bearingY": line_height - source["baselineFromBottom"],
                       "coverage": base64.b64encode(missing_coverage).decode()})
        if 32 in source["glyphs"]:
            glyphs.append({"codepoint": 9, "width": 0, "height": 0,
                           "advance16": source["glyphs"][32]["advance16"] * 2,
                           "bearingX": 0, "bearingY": 0, "coverage": ""})
        fonts.append({"sizePx": size, "fallbackCodepoint": 65533, "lineHeight": source["lineHeight"],
                      "ascender": source["lineHeight"] - source["baselineFromBottom"],
                      "descender": source["baselineFromBottom"], "glyphs": glyphs, "kerning": source["kerning"],
                      "provenance": {"source": str(path.relative_to(REFERENCE)), "sha256": source["sha256"],
                                     "originalBitsPerPixel": source["bpp"], "kernScale": source["kernScale"], "placeholderAuthority": "LVGL9.5 lv_font.c132..151 and lv_draw_label.c487..490; LV_USE_FONT_PLACEHOLDER=y;1pxborder usesadvancewidth andline-heightbg_coords"}})
    output = {"schemaVersion": 1, "format": "gea-bitmap-font", "family": family,
              "provenance": {"repository": "https://github.com/m5stack/M5StopWatch-UserDemo", "commit": REVISION,
                             "dependency": "LVGL v9.5.0", "conversion": "Exact uncompressed2/4bpp source coverage expanded to0..255; advance16 and integer pair adjustment retained. No outline rasterization."},
              "fonts": fonts}
    (APP / "assets" / filename).write_text(json.dumps(output, separators=(",", ":")) + "\n")
    print(f"{filename}: {len(fonts)} source faces, {sum(len(font['glyphs']) for font in fonts)} glyphs")


export("Montserrat", [(size, REFERENCE / f"components/lvgl/src/font/lv_font_montserrat_{size}.c")
                       for size in (10, 14, 16, 18, 20, 22, 24, 26, 28, 36)], "factory-montserrat.json")
export("Maple", [(size, REFERENCE / f"main/assets/fonts/lv_font_maple_mono_medium_{size}.c")
                  for size in (24, 28, 48)], "factory-maple.json")
export("Commissioner", [(size, REFERENCE / f"main/assets/fonts/CommissionerMedium{size}.c")
                         for size in (64, 108)], "factory-commissioner.json")
export("MontserratBold", [(26, REFERENCE / "main/assets/fonts/MontserratSemiBold26.c")], "factory-montserrat-semibold.json")
