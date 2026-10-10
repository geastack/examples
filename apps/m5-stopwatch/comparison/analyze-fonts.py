#!/usr/bin/env python3
"""Compare pinned LVGL glyph carriers with Gea's current generated atlas."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import re

from fontTools.ttLib import TTFont


def number(text, field):
    return int(re.search(r"\." + field + r"\s*=\s*(-?\d+)", text)[1])


def factory_font(path):
    text = path.read_text()
    bitmap_text = re.search(r"glyph_bitmap\[\]\s*=\s*\{(.*?)\};", text, re.S)[1]
    bitmap = bytes(int(value, 16) for value in re.findall(r"0x([0-9a-fA-F]+)", bitmap_text))
    descriptor_text = re.search(r"glyph_dsc\[\]\s*=\s*\{(.*?)\};", text, re.S)[1]
    descriptors = [{field: number(entry, field) for field in ("bitmap_index", "adv_w", "box_w", "box_h", "ofs_x", "ofs_y")}
                   for entry in re.findall(r"\{([^}]+)\}", descriptor_text)]
    ranges = re.findall(r"\.range_start\s*=\s*(\d+).*?\.range_length\s*=\s*(\d+).*?\.glyph_id_start\s*=\s*(\d+).*?\.unicode_list\s*=\s*(\w+).*?\.glyph_id_ofs_list\s*=\s*(\w+)", text, re.S)
    bpp = number(text, "bpp")
    glyphs = {}
    for start, length, first, unicode_name, offset_name in ranges:
        offsets = None
        if offset_name != "NULL":
            offset_text = re.search(offset_name + r"\[\]\s*=\s*\{(.*?)\}", text, re.S)[1]
            offsets = [int(value.strip(), 0) for value in offset_text.split(",") if value.strip()]
        unicode_offsets = None
        if unicode_name != "NULL":
            unicode_text = re.search(unicode_name + r"\[\]\s*=\s*\{(.*?)\}", text, re.S)[1]
            unicode_offsets = [int(value.strip(), 0) for value in unicode_text.split(",") if value.strip()]
        codes = [(int(start) + offset, index) for index, offset in enumerate(unicode_offsets)] if unicode_offsets is not None else [(codepoint, codepoint - int(start)) for codepoint in range(int(start), int(start) + int(length))]
        for codepoint, mapped_index in codes:
            if codepoint < 32:
                continue
            relative = mapped_index
            if offsets is not None and relative > 0 and offsets[relative] == 0:
                continue
            gid = int(first) + (offsets[relative] if offsets is not None else relative)
            descriptor = descriptors[gid]
            width, height = descriptor["box_w"], descriptor["box_h"]
            begin = descriptor["bitmap_index"]
            coverage = []
            for index in range(width * height):
                bit = index * bpp
                value = (bitmap[begin + bit // 8] >> (8 - bpp - bit % 8)) & ((1 << bpp) - 1)
                coverage.append(value * 255 // ((1 << bpp) - 1))
            glyphs[codepoint] = {"gid": gid, "width": width, "height": height, "x": descriptor["ofs_x"],
                                "y": -(height + descriptor["ofs_y"]), "advance16": descriptor["adv_w"],
                                "advance": (descriptor["adv_w"] + 8) >> 4, "coverage": coverage}
    kerning = []
    if number(text, "kern_scale") != 0:
        def array(name):
            body = re.search(name + r"\[\]\s*=\s*\{(.*?)\};", text, re.S)[1]
            body = re.sub(r"/\*.*?\*/", "", body, flags=re.S)
            return [int(value.strip(), 0) for value in body.split(",") if value.strip()]
        left_classes = array("kern_left_class_mapping")
        right_classes = array("kern_right_class_mapping")
        values = array("kern_class_values")
        right_count = number(text, "right_class_cnt")
        scale = number(text, "kern_scale")
        for left_cp, left in glyphs.items():
            for right_cp, right in glyphs.items():
                lc, rc = left_classes[left["gid"]], right_classes[right["gid"]]
                if lc and rc:
                    adjustment = (values[(lc - 1) * right_count + rc - 1] * scale) >> 4
                    if adjustment:
                        kerning.append({"left": left_cp, "right": right_cp, "adjustment16": adjustment})
    return {"kerning": kerning, "bpp": bpp, "lineHeight": number(text, "line_height"), "baselineFromBottom": number(text, "base_line"),
            "kernScale": number(text, "kern_scale"), "glyphs": glyphs,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}


def generated_fonts(path):
    text = path.read_text()
    atlases = {name: bytes(int(value, 16) for value in re.findall(r"0x([0-9a-fA-F]+)", data))
               for name, data in re.findall(r"const std::uint8_t (gea_font_atlas_\w+)\[\d+\]\s*=\s*\{(.*?)\};", text, re.S)}
    glyph_arrays = {int(index): [list(map(int, entry.split(','))) for entry in re.findall(r"\{([^}]+)\}", data)]
                    for index, data in re.findall(r"font_glyphs_(\d+)\[\d*\]\s*=\s*\{(.*?)\};", text, re.S)}
    kerning_arrays = {name: [dict(zip(("left", "right", "adjustment16"), map(int, entry.split(','))))
                             for entry in re.findall(r"\{([^}]+)\}", data)]
                      for name, data in re.findall(r"FontKerningPair (font_kerning_\d+)\[\d+\]\s*=\s*\{(.*?)\};", text, re.S)}
    fonts = {}
    for index, data in re.findall(r"font_data_(\d+)\s*=\s*\{([^}]+)\}", text):
        parts = [part.strip() for part in data.split(',')]
        index = int(index)
        _, size, line, ascender, descender, count = map(int, parts[:6])
        atlas_width, atlas_height = map(int, parts[7:9])
        atlas = atlases[parts[9]]
        glyphs = {}
        for entry in glyph_arrays[index]:
            cp, source_x, source_y, width, height, advance, x, bearing_y = entry[:8]
            advance16 = entry[8] if len(entry) > 8 else advance * 16
            coverage = [atlas[(source_y + y) * atlas_width + source_x + xx] for y in range(height) for xx in range(width)]
            glyphs[cp] = {"width": width, "height": height, "advance": advance, "advance16": advance16, "x": x, "y": -bearing_y, "coverage": coverage}
        fonts[index] = {"size": size, "lineHeight": line, "ascender": ascender, "descender": descender, "glyphs": glyphs,
                        "kerning": kerning_arrays.get(parts[12], []) if len(parts) > 12 else [],
                        "strictGlyphLookup": parts[13] == "true" if len(parts) > 13 else False,
                        "fallbackCodepoint": int(parts[14]) if len(parts) > 14 else -1}
    entries = re.search(r"generated_fonts\[\]\s*=\s*\{(.*?)\};", text, re.S)[1]
    family_ids = {int(font): int(family) for family, font in re.findall(r"\{\s*(\d+),\s*&font_data_(\d+)\s*\}", entries)}
    families = dict((int(index), name) for index, name in re.findall(r'\{\s*(\d+),\s*"([^"]+)"\s*\}', text))
    return {(families[family_ids[index]], font["size"]): font for index, font in fonts.items()}


def coverage_difference(left, right):
    x0, y0 = min(left["x"], right["x"]), min(left["y"], right["y"])
    x1 = max(left["x"] + left["width"], right["x"] + right["width"])
    y1 = max(left["y"] + left["height"], right["y"] + right["height"])
    def sample(glyph, x, y):
        x, y = x - glyph["x"], y - glyph["y"]
        return glyph["coverage"][y * glyph["width"] + x] if 0 <= x < glyph["width"] and 0 <= y < glyph["height"] else 0
    errors = [abs(sample(left, x, y) - sample(right, x, y)) for y in range(y0, y1) for x in range(x0, x1)]
    return {"unionPixels": len(errors), "differentCoveragePixels": sum(value != 0 for value in errors),
            "meanAbsoluteCoverageError": sum(errors) / len(errors) if errors else 0,
            "maximumCoverageError": max(errors, default=0)}


def main():
    root = Path(__file__).resolve().parents[4]
    reference = root / "vendored-sources/M5StopWatch-UserDemo"
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--generated", type=Path, default=root / "examples/.gea/build/esp32-s3-m5stack-stopwatch/app-builds/m5-stopwatch/apps/m5-stopwatch/gea_embedded_font_generated.cpp")
    parser.add_argument("--output", type=Path, default=root / "examples/reports/m5-stopwatch/font-audit-final.json")
    args = parser.parse_args()
    generated = generated_fonts(args.generated)
    cases = [("Montserrat", size, reference / f"components/lvgl/src/font/lv_font_montserrat_{size}.c") for size in (10, 14, 16, 18, 20, 22, 24, 26, 28, 36)]
    cases += [("Maple", size, reference / f"main/assets/fonts/lv_font_maple_mono_medium_{size}.c") for size in (24, 28, 48)]
    cases += [("Commissioner", size, reference / f"main/assets/fonts/CommissionerMedium{size}.c") for size in (64, 108)]
    cases += [("MontserratBold", 26, reference / "main/assets/fonts/MontserratSemiBold26.c")]
    result = []
    for family, size, path in cases:
        factory = factory_font(path)
        gea = generated[(family, size)]
        rows = []
        filename = {"Montserrat": "Montserrat-Medium.ttf", "MontserratBold": "Montserrat-SemiBold.ttf", "Commissioner": "Commissioner-Medium.ttf", "Maple": "MapleMono-Medium.ttf"}[family]
        ttf_path = root / "examples/apps/m5-stopwatch/assets" / filename
        ttf = TTFont(ttf_path)
        cmap, metrics, units = ttf.getBestCmap(), ttf["hmtx"].metrics, ttf["head"].unitsPerEm
        advance_differences = []
        for cp in sorted(factory["glyphs"].keys() & gea["glyphs"].keys()):
            f, g = factory["glyphs"][cp], gea["glyphs"][cp]
            advance16 = math.floor(metrics[cmap[cp]][0] * size * 16 / units + 0.5) if cp in cmap else None
            if advance16 is not None and advance16 != f["advance16"]:
                advance_differences.append({"codepoint": cp, "factoryAdv16": f["advance16"], "geaTtfAdv16": advance16})
            rows.append({"codepoint": cp, "character": chr(cp), "factory": {key: value for key, value in f.items() if key != "coverage"},
                         "gea": {key: value for key, value in g.items() if key != "coverage"}, "coverage": coverage_difference(f, g)})
        result.append({"family": family, "size": size, "factorySource": str(path.relative_to(root)),
                       "factoryMetadata": {key: value for key, value in factory.items() if key not in ("glyphs", "kerning")},
                       "geaMetadata": {key: value for key, value in gea.items() if key not in ("glyphs", "kerning")},
                       "sourceTtf": {"path": str(ttf_path.relative_to(root)), "sha256": hashlib.sha256(ttf_path.read_bytes()).hexdigest(), "fontVersion": ttf["name"].getDebugName(5), "weight": ttf["OS/2"].usWeightClass},
                       "sourceAdvance16Differences": advance_differences,
                       "sourceGlyphs": len(factory["glyphs"]),
                       "missingSourceGlyphs": sorted(factory["glyphs"].keys() - gea["glyphs"].keys()),
                       "lineMetricsExact": gea["lineHeight"] == factory["lineHeight"] and gea["descender"] == factory["baselineFromBottom"],
                       "fractionalAdvancesExact": all(row["factory"]["advance16"] == row["gea"]["advance16"] for row in rows),
                       "bearingsAndDimensionsExact": all(all(row["factory"][key] == row["gea"][key] for key in ("x", "y", "width", "height")) for row in rows),
                       "kerningExact": sorted([pair for pair in factory["kerning"] if pair["left"] in gea["glyphs"] and pair["right"] in gea["glyphs"]], key=lambda p: (p["left"], p["right"])) == sorted(gea["kerning"], key=lambda p: (p["left"], p["right"])),
                       "factoryKerningPairs": len(factory["kerning"]),
                       "generatedKerningPairs": len(gea["kerning"]),
                       "comparedGlyphs": len(rows), "differentWholePixelAdvances": sum(row["factory"]["advance"] != row["gea"]["advance"] for row in rows),
                       "identicalCoverageGlyphs": sum(row["coverage"]["differentCoveragePixels"] == 0 for row in rows), "glyphs": rows})
    output = {"schemaVersion": 1, "referenceCommit": "6b4aa125288b6fe9dca661f10159f6e1e5ee785c",
              "generatedFile": str(args.generated), "generatedSha256": hashlib.sha256(args.generated.read_bytes()).hexdigest(),
              "method": "Uncompressed LVGL2/4bpp bitmap carriers expanded exactly; generated8bpp atlas glyphs compared at common baseline/origin. No alignment search, raster regeneration or tolerance. Whole advances use LVGL(adv16+8)>>4. Kerning not applied in per-glyph comparison.",
              "sourceTtfIdentity": {"bodyByteIdenticalToPinnedLvgl": (reference / "components/lvgl/scripts/built_in_font/Montserrat-Medium.ttf").read_bytes() == (root / "examples/apps/m5-stopwatch/assets/Montserrat-Medium.ttf").read_bytes(), "customFontLimit": "Originalcustom TTF files/hashes are not committed in factory source; fractional metricsmatch buthash identity is unproved."},
              "fonts": result}
    output["assessment"] = "exact_factory_font_carriers_for_generated_glyph_subset" if all(
        font["lineMetricsExact"] and font["fractionalAdvancesExact"] and
        font["bearingsAndDimensionsExact"] and font["kerningExact"] and
        font["identicalCoverageGlyphs"] == font["comparedGlyphs"] for font in result
    ) else "font_carrier_mismatch"
    output["limits"] = "Exact generated glyph carrier verification does not prove whole-frame blending, layout, clipping or display parity."
    args.output.write_text(json.dumps(output, indent=2) + "\n")
    print(json.dumps([{key: font[key] for key in ("family", "size", "comparedGlyphs", "differentWholePixelAdvances", "identicalCoverageGlyphs")} for font in result], indent=2))


if __name__ == "__main__":
    main()
