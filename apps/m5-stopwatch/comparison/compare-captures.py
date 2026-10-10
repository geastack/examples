#!/usr/bin/env python3
"""Compare unscaled paired captures; count only explicitly attested state coverage."""
import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image

try:
    import numpy as np
except ImportError:
    np = None


def array_pixel_metrics(left, right, circular):
    width, height = left.size
    errors = np.abs(np.asarray(left, dtype=np.int16) - np.asarray(right, dtype=np.int16))
    selected = np.ones((height, width), dtype=bool)
    if circular:
        y, x = np.ogrid[:height, :width]
        selected = ((x + 0.5 - width / 2) ** 2 + (y + 0.5 - height / 2) ** 2
                    <= (min(width, height) / 2) ** 2)
    changed = np.any(errors != 0, axis=2) & selected
    count = int(np.count_nonzero(changed))
    evaluated = int(np.count_nonzero(selected))
    rows, columns = np.nonzero(changed)
    return {"comparable": True, "size": [width, height], "evaluatedPixels": evaluated,
            "region": "inscribed_circle_pixel_centers" if circular else "entire_rectangle",
            "changedPixels": count, "changedPixelFraction": count / evaluated,
            "meanAbsoluteChannelError": int(errors[selected].sum(dtype=np.int64)) / (evaluated * 3),
            "maximumChannelError": int(errors[selected].max()),
            "differenceBounds": None if not count else [int(columns.min()), int(rows.min()),
                                                       int(columns.max()) + 1, int(rows.max()) + 1],
            "pixelIdentical": count == 0}


def pixel_metrics(left, right, circular=False):
    left = left.convert("RGB")
    right = right.convert("RGB")
    if left.size != right.size:
        return {"comparable": False, "reason": "dimensions_differ",
                "factorySize": list(left.size), "geaSize": list(right.size)}
    if np is not None:
        return array_pixel_metrics(left, right, circular)
    changed = 0
    total_error = 0
    max_error = 0
    min_x, min_y = left.size
    max_x = max_y = -1
    width, height = left.size
    evaluated = 0
    radius = min(width, height) / 2
    for index, (a, b) in enumerate(zip(left.getdata(), right.getdata())):
        x, y = index % width, index // width
        if circular and (x + 0.5 - width / 2) ** 2 + (y + 0.5 - height / 2) ** 2 > radius ** 2:
            continue
        evaluated += 1
        errors = [abs(x - y) for x, y in zip(a, b)]
        total_error += sum(errors)
        max_error = max(max_error, *errors)
        if any(errors):
            changed += 1
            x, y = index % width, index // width
            min_x, min_y = min(min_x, x), min(min_y, y)
            max_x, max_y = max(max_x, x), max(max_y, y)
    pixels = evaluated
    return {"comparable": True, "size": [width, height], "evaluatedPixels": pixels,
            "region": "inscribed_circle_pixel_centers" if circular else "entire_rectangle",
            "changedPixels": changed,
            "changedPixelFraction": changed / pixels,
            "meanAbsoluteChannelError": total_error / (pixels * 3),
            "maximumChannelError": max_error,
            "differenceBounds": None if not changed else [min_x, min_y, max_x + 1, max_y + 1],
            "pixelIdentical": changed == 0}



def canonical_rgb565(image):
    # Reconstruct stored channel bits. Both floor scaling and bit replication
    # are injective expansions of RGB565 and round-trip under these masks.
    red_blue = [value & 0xF8 for value in range(256)]
    green = [value & 0xFC for value in range(256)]
    return image.convert("RGB").point(red_blue + green + red_blue)

def receipts(directory):
    found = {}
    for path in sorted(directory.glob("*.json")):
        rows = json.loads(path.read_text())
        if isinstance(rows, dict):
            if "id" not in rows:
                continue
            rows = [rows]
        if not isinstance(rows, list):
            raise ValueError(f"{path}: expected capture receipt object or array")
        for row in rows:
            key = row["id"]
            if key in found:
                raise ValueError(f"duplicate capture receipt {key} in {directory}")
            found[key] = row
    return found


def validated_state(factory, gea, screens):
    """A filename or route assertion alone cannot prove matching dynamic state."""
    required = ("manifestScreenId", "manifestState", "stateEvidence")
    if not all(factory.get(key) and gea.get(key) for key in required):
        return {"verified": False, "reason": "missing_explicit_state_evidence"}
    if any(factory[key] != gea[key] for key in ("manifestScreenId", "manifestState")):
        return {"verified": False, "reason": "different_attested_states"}
    screen = screens.get(factory["manifestScreenId"])
    if screen is None or factory["manifestState"] not in screen["states"]:
        raise ValueError("capture receipt references an unknown manifest screen/state")
    if factory.get("stateVerified") is not True or gea.get("stateVerified") is not True:
        return {"verified": False, "reason": "state_not_verified"}
    factory_parameters = factory.get("comparisonParameters", {})
    gea_parameters = gea.get("comparisonParameters", {})
    if factory_parameters or gea_parameters:
        if not factory_parameters or not gea_parameters:
            return {"verified": False, "reason": "missing_controlled_parameters"}
        if factory_parameters != gea_parameters:
            return {"verified": False, "reason": "different_controlled_parameters",
                    "factoryParameters": factory_parameters, "geaParameters": gea_parameters}
    return {"verified": True, "screen": screen["id"], "state": factory["manifestState"],
            "factoryEvidence": factory["stateEvidence"], "geaEvidence": gea["stateEvidence"],
            "comparisonParameters": factory_parameters}



def receipt_crop(image, receipt, enabled):
    geometry = receipt.get("pixelGeometry")
    if not enabled or geometry is None:
        return image.copy(), None
    if geometry.get("rawSize") != list(image.size) or not (geometry.get("evidence") or geometry.get("sourceAuthority")):
        raise ValueError("crop requires matching rawSize and nonempty geometry evidence")
    crop = geometry.get("crop")
    if crop is None:
        # Explicitly absent scene geometry cannot authorize any inferred crop.
        # Preserve the raw dimensions so unequal frames remain incomparable.
        return image.copy(), geometry
    if not isinstance(crop, list) or len(crop) != 4 or any(type(value) is not int for value in crop):
        raise ValueError("crop must contain integer x,y,width,height")
    x, y, width, height = crop
    if x < 0 or y < 0 or width <= 0 or height <= 0 or x + width > image.width or y + height > image.height:
        raise ValueError("crop exceeds raw image")
    return image.crop((x, y, x + width, y + height)), geometry

def pixel_provenance_ready(receipt, dimensions):
    if receipt.get("captureSource") != "playwright-browser":
        transport = receipt.get("captureTransport", {})
        if transport:
            return (transport.get("source") == "co5300-submitted-rgb565" and
                    transport.get("encoding") == "rgb565-rle-v1" and
                    str(transport.get("completed_dma")) == "1" and
                    [int(transport.get("width", 0)), int(transport.get("height", 0))] == list(dimensions))
        return bool(receipt.get("wireEncoding"))
    evidence = receipt.get("stateEvidence", {})
    extent = receipt.get("captureExtent")
    size = receipt.get("viewport") if extent == "viewport" else receipt.get("imageSize")
    actual_size = [size.get("width"), size.get("height")] if isinstance(size, dict) else size
    if actual_size != list(dimensions):
        return False
    return (receipt.get("manifestScreenId") == "badge.phone" and
            bool(evidence.get("assertedControls")) and isinstance(evidence.get("backendState"), dict) and
            bool(evidence.get("backendState")) and isinstance(evidence.get("slots"), int) and
            bool(evidence.get("preview", {}).get("pixels")))


def compare(manifest, factory_dir, gea_dir, use_receipt_crops=False):
    screens = {screen["id"]: screen for screen in manifest["screens"]}
    factory_receipts, gea_receipts = receipts(factory_dir), receipts(gea_dir)
    factory_files = {path.stem: path for path in factory_dir.glob("*.png")}
    gea_files = {path.stem: path for path in gea_dir.glob("*.png")}
    results = []
    covered = set()
    for key in sorted(factory_files.keys() & gea_files.keys()):
        fpath, gpath = factory_files[key], gea_files[key]
        with Image.open(fpath) as left, Image.open(gpath) as right:
            provenance_ready = pixel_provenance_ready(factory_receipts.get(key, {}), left.size)
            gea_provenance_ready = pixel_provenance_ready(gea_receipts.get(key, {}), right.size)
            raw_metrics = pixel_metrics(left, right)
            factory_image, factory_geometry = receipt_crop(left, factory_receipts.get(key, {}), use_receipt_crops)
            gea_image, gea_geometry = receipt_crop(right, gea_receipts.get(key, {}), use_receipt_crops)
            metrics = pixel_metrics(factory_image, gea_image)
            circular_metrics = pixel_metrics(factory_image, gea_image, circular=True)
            word_metrics = pixel_metrics(canonical_rgb565(factory_image), canonical_rgb565(gea_image))
            word_circle_metrics = pixel_metrics(canonical_rgb565(factory_image), canonical_rgb565(gea_image), circular=True)
        state = validated_state(factory_receipts.get(key, {}), gea_receipts.get(key, {}), screens)
        wire_encoding = factory_receipts.get(key, {}).get("wireEncoding")
        if not provenance_ready:
            state = {"verified": False, "reason": "factory_wire_encoding_unverified"}
        elif not gea_provenance_ready:
            state = {"verified": False, "reason": "gea_display_upload_unverified"}
        if state["verified"] and metrics["comparable"]:
            covered.add((state["screen"], state["state"]))
        results.append({"id": key, "factory": str(fpath), "gea": str(gpath),
                        "factorySha256": hashlib.sha256(fpath.read_bytes()).hexdigest(),
                        "geaSha256": hashlib.sha256(gpath.read_bytes()).hexdigest(),
                        "stateValidation": state, "factoryWireEncoding": wire_encoding, "pixelInterpretationReady": provenance_ready and gea_provenance_ready, "rawPixels": raw_metrics, "pixels": metrics,
                        "circularPixels": circular_metrics,
                        "canonicalRgb565": word_metrics, "canonicalCircularRgb565": word_circle_metrics,
                        "canonicalEncodingAuthority": "r&0xf8,g&0xfc,b&0xf8 reconstruct stored RGB565 bits from injective PNG expansion; no tolerance",
                        "appliedGeometry": {"factory": factory_geometry, "gea": gea_geometry},
                        "interpretation": "Pixel differences are descriptive; feature parity requires behavior evidence."})
    coverage = [{"screen": screen["id"],
                 "verifiedPairedStates": [state for state in screen["states"] if (screen["id"], state) in covered],
                 "unverifiedStates": [state for state in screen["states"] if (screen["id"], state) not in covered]}
                for screen in manifest["screens"]]
    return {"schemaVersion": 1, "referenceCommit": manifest["referenceCommit"],
            "policy": "No scaling, automatic alignment, tolerance or dynamic-state normalization is applied. Explicit receipt-backed crops are optional; rectangular and separately labelled inscribed-circle metrics are retained. Missing state evidence is unverified, even for identical images.",
            "pairedImages": len(results), "verifiedFiniteStates": len(covered),
            "totalFiniteStates": sum(len(screen["states"]) for screen in manifest["screens"]),
            "factoryOnly": sorted(factory_files.keys() - gea_files.keys()),
            "geaOnly": sorted(gea_files.keys() - factory_files.keys()),
            "coverage": coverage, "comparisons": results}


def main():
    here = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=here / "screen-test-manifest.json")
    reports = here.parents[2] / "reports/m5-stopwatch"
    parser.add_argument("--factory", type=Path, default=reports / "captures/factory")
    parser.add_argument("--gea", type=Path, default=reports / "captures/gea")
    parser.add_argument("--output", type=Path, default=reports / "paired-capture-analysis.json")
    parser.add_argument("--use-receipt-crops", action="store_true", help="apply only crops with raw geometry and evidence in receipts")
    args = parser.parse_args()
    if not args.factory.is_dir() or not args.gea.is_dir():
        parser.error("both existing capture directories are required")
    result = compare(json.loads(args.manifest.read_text()), args.factory, args.gea, args.use_receipt_crops)
    args.output.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({key: result[key] for key in ("pairedImages", "verifiedFiniteStates", "totalFiniteStates")}))


if __name__ == "__main__":
    main()
