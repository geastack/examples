#!/usr/bin/env python3
"""Identify intrinsic-size portal fixtures in actual submitted display captures."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

from PIL import Image

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("capture_analysis", Path(__file__).with_name("compare-captures.py"))
analysis = importlib.util.module_from_spec(spec)
spec.loader.exec_module(analysis)

PALETTES = ["#206080", "#803020", "#208040", "#602080", "#807020"]


def verify(fixture, capture, slot):
    if slot not in range(0, 6):
        raise ValueError("Source fixtures are slots0..5; slot0 requires its actual cropped readback")
    if capture.size != (466, 466):
        raise ValueError("Explicit source-authorized crop to466x466 is required; images are never resized")
    width, height = fixture.size
    if width < 90 or height < 90 or width > 466 or height > 466:
        raise ValueError("Known fixture geometry must fit466x466 with its marker and artwork")
    x, y = (466 - width) // 2, (466 - height) // 2
    expected = Image.new("RGB", (466, 466), "black")
    expected.paste(fixture.convert("RGB"), (x, y))
    source, actual = analysis.canonical_rgb565(expected), analysis.canonical_rgb565(capture)
    if slot == 0:
        full = analysis.pixel_metrics(source, actual)
        source_colors, actual_colors = len(set(source.getdata())), len(set(actual.getdata()))
        return {"schemaVersion": 1, "fixtureSlot": 0,
                "visualFixtureIdentified": source_colors > 4 and actual_colors > 4 and full["meanAbsoluteChannelError"] <= 8,
                "exactQuantizedPixels": full["pixelIdentical"], "canonicalRgb565": full,
                "intrinsicImage": {"width": width, "height": height, "centeredX": x, "centeredY": y},
                "artworkColorCounts": {"source": source_colors, "capture": actual_colors},
                "identificationPolicy": "Actual cropped JPEG readback; full-frame canonical mean error<=8 and nonuniform content. Not exact pixel parity or backend active-slot proof."}
    icon_size = min(200, width - 60, height - 60)
    icon_x, icon_y = x + (width - icon_size) // 2, y + (height - icon_size) // 2
    regions = {
        "upperBackground": (x + 5, y + 5, x + 15, y + 15),
        "lowerBackground": (x + width - 15, y + height - 15, x + width - 5, y + height - 5),
        "whiteMarker": (x + 23, y + 23, x + 20 + slot * 25 - 3, y + 29),
        "markerTermination": (x + 20 + slot * 25 + 5, y + 23, x + 20 + slot * 25 + 12, y + 29),
        "clockArtwork": (icon_x, icon_y, icon_x + icon_size, icon_y + icon_size),
    }
    if x > 15 or y > 15:
        regions["outsideIntrinsicImage"] = (2, 2, 12, 12)
    metrics = {name: analysis.pixel_metrics(source.crop(box), actual.crop(box))
               for name, box in regions.items()}
    flat_regions = [name for name in regions if name != "clockArtwork"]
    # Identification tolerances are disclosed and apply only to flat interiors,
    # not exact parity. Separate clock coverage ensures a solid-color substitute
    # cannot pass. Quantized JPEG decoders may differ near edges/artwork.
    flat_matches = all(metrics[name]["meanAbsoluteChannelError"] <= 8 and
                       metrics[name]["maximumChannelError"] <= 16 for name in flat_regions)
    icon_box = regions["clockArtwork"]
    source_icon, actual_icon = source.crop(icon_box), actual.crop(icon_box)
    source_colors = len(set(source_icon.getdata()))
    actual_colors = len(set(actual_icon.getdata()))
    artwork_matches = source_colors > 4 and actual_colors > 4 and metrics["clockArtwork"]["meanAbsoluteChannelError"] <= 8
    full = analysis.pixel_metrics(source, actual)
    return {"schemaVersion": 1, "fixtureSlot": slot, "fixturePalette": PALETTES[slot - 1],
            "intrinsicImage": {"width": width, "height": height, "centeredX": x, "centeredY": y},
            "visualFixtureIdentified": flat_matches and artwork_matches,
            "exactQuantizedPixels": full["pixelIdentical"], "canonicalRgb565": full,
            "regions": {name: {"bounds": list(regions[name]), "metrics": value} for name, value in metrics.items()},
            "artworkColorCounts": {"source": source_colors, "capture": actual_colors},
            "identificationPolicy": {"flatMeanChannelErrorMaximum": 8, "flatMaximumChannelError": 16,
                                     "artworkMeanChannelErrorMaximum": 8, "requiresNonuniformArtwork": True},
            "interpretation": "Fixture identification proves distinctive source content rendered; tolerances do not establish exact pixels, decoder equivalence, active backend slot or A/B cycling."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixture", type=Path, required=True)
    parser.add_argument("--capture", type=Path, required=True)
    parser.add_argument("--slot", type=int, required=True)
    parser.add_argument("--capture-crop", type=int, nargs=4, metavar=("X", "Y", "W", "H"))
    parser.add_argument("--crop-authority", help="Required source/tree evidence for any raw factory crop")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    with Image.open(args.fixture) as fixture, Image.open(args.capture) as capture:
        raw_size = list(capture.size)
        if args.capture_crop:
            if not args.crop_authority:
                raise ValueError("A crop requires explicit source/tree authority")
            x, y, width, height = args.capture_crop
            if min(x, y) < 0 or min(width, height) <= 0 or x + width > capture.width or y + height > capture.height:
                raise ValueError("Crop exceeds raw capture")
            capture = capture.crop((x, y, x + width, y + height))
        result = verify(fixture.convert("RGB"), capture.convert("RGB"), args.slot)
    result.update({"fixture": str(args.fixture), "fixtureSha256": hashlib.sha256(args.fixture.read_bytes()).hexdigest(),
                   "capture": str(args.capture), "captureSha256": hashlib.sha256(args.capture.read_bytes()).hexdigest(),
                   "geometry": {"rawSize": raw_size, "crop": args.capture_crop, "authority": args.crop_authority},
                   "hostDecoder": "Pillow; actual target JPEG decoder differences are reported, not assumed absent"})
    text = json.dumps(result, indent=2) + "\n"
    if args.output:
        args.output.write_text(text)
    else:
        print(text, end="")


if __name__ == "__main__":
    main()
