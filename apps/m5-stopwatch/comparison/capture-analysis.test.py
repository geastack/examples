#!/usr/bin/env python3
"""Offline checks for pixel accounting and fail-closed state coverage."""
import importlib.util
from pathlib import Path
import sys
import unittest

from PIL import Image

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("capture_analysis", Path(__file__).with_name("compare-captures.py"))
analysis = importlib.util.module_from_spec(spec)
spec.loader.exec_module(analysis)


class CaptureAnalysis(unittest.TestCase):
    def test_optional_vectorization_preserves_exact_reference_accounting(self):
        backend = analysis.np
        if backend is None:
            self.skipTest('Optional NumPy backend is unavailable')
        for size in ((1, 1), (1, 8), (8, 1), (7, 8), (64, 65)):
            left = Image.new('RGB', size)
            right = Image.new('RGB', size)
            count = size[0] * size[1]
            left.putdata([(i % 256, i * 7 % 256, i * 19 % 256) for i in range(count)])
            right.putdata([((255 - i) % 256, i * 5 % 256, i * 17 % 256) for i in range(count)])
            for circular in (False, True):
                accelerated = analysis.pixel_metrics(left, right, circular)
                try:
                    analysis.np = None
                    reference = analysis.pixel_metrics(left, right, circular)
                finally:
                    analysis.np = backend
                self.assertEqual(accelerated, reference)

    def test_gea_capture_requires_completed_actual_upload_and_geometry(self):
        receipt = {"captureTransport": {"source": "co5300-submitted-rgb565",
                   "encoding": "rgb565-rle-v1", "completed_dma": "1", "width": "466", "height": "466"}}
        self.assertTrue(analysis.pixel_provenance_ready(receipt, (466, 466)))
        self.assertFalse(analysis.pixel_provenance_ready(receipt, (468, 466)))
        receipt['captureTransport']['source'] = 'scene-replay'
        self.assertFalse(analysis.pixel_provenance_ready(receipt, (466, 466)))
        receipt['captureTransport']['source'] = 'co5300-submitted-rgb565'
        receipt['captureTransport']['completed_dma'] = '0'
        self.assertFalse(analysis.pixel_provenance_ready(receipt, (466, 466)))

    def test_browser_provenance_is_narrow_and_dimension_verified(self):
        receipt = {"captureSource": "playwright-browser", "manifestScreenId": "badge.phone",
                   "captureExtent": "viewport", "viewport": {"width": 1280, "height": 900},
                   "stateEvidence": {"assertedControls": ["six actual tiles"], "backendState": {"slots": []},
                                     "slots": 6, "preview": {"pixels": "actual-canvas-sha"}}}
        self.assertTrue(analysis.pixel_provenance_ready(receipt, (1280, 900)))
        self.assertFalse(analysis.pixel_provenance_ready(receipt, (1280, 901)))
        receipt["manifestScreenId"] = "badge.display"
        self.assertFalse(analysis.pixel_provenance_ready(receipt, (1280, 900)))
        receipt["manifestScreenId"] = "badge.phone"
        receipt["captureExtent"] = "fullPage"
        self.assertFalse(analysis.pixel_provenance_ready(receipt, (1280, 1000)))
        receipt["imageSize"] = [1280, 1000]
        self.assertTrue(analysis.pixel_provenance_ready(receipt, (1280, 1000)))
        self.assertFalse(analysis.pixel_provenance_ready({"captureSource": "device"}, (468, 466)))
        self.assertTrue(analysis.pixel_provenance_ready({"wireEncoding": "verified-rgb565"}, (468, 466)))

    def test_exact_pixels_and_difference_bounds(self):
        left = Image.new("RGB", (3, 2), "black")
        right = left.copy()
        right.putpixel((2, 1), (30, 0, 0))
        result = analysis.pixel_metrics(left, right)
        self.assertEqual(result["changedPixels"], 1)
        self.assertEqual(result["differenceBounds"], [2, 1, 3, 2])
        self.assertEqual(result["meanAbsoluteChannelError"], 30 / 18)
        self.assertEqual(result["maximumChannelError"], 30)
        self.assertFalse(result["pixelIdentical"])
        self.assertTrue(analysis.pixel_metrics(left, left)["pixelIdentical"])

    def test_all_rgb565_words_roundtrip_both_expansions(self):
        scaled = Image.new("RGB", (256, 256))
        replicated = Image.new("RGB", (256, 256))
        floor_pixels, replicated_pixels = [], []
        for word in range(65536):
            r, g, b = word >> 11, (word >> 5) & 63, word & 31
            floor_pixels.append((r * 255 // 31, g * 255 // 63, b * 255 // 31))
            replicated_pixels.append(((r << 3) | (r >> 2), (g << 2) | (g >> 4), (b << 3) | (b >> 2)))
        scaled.putdata(floor_pixels)
        replicated.putdata(replicated_pixels)
        self.assertTrue(analysis.pixel_metrics(analysis.canonical_rgb565(scaled), analysis.canonical_rgb565(replicated))["pixelIdentical"])
        for word, pixel in enumerate(analysis.canonical_rgb565(scaled).getdata()):
            self.assertEqual(((pixel[0] >> 3) << 11) | ((pixel[1] >> 2) << 5) | (pixel[2] >> 3), word)

    def test_dimensions_are_never_rescaled(self):
        result = analysis.pixel_metrics(Image.new("RGB", (2, 2)), Image.new("RGB", (3, 2)))
        self.assertFalse(result["comparable"])
        self.assertEqual(result["reason"], "dimensions_differ")

    def test_geometry_crop_requires_receipt_and_keeps_source(self):
        source = Image.new("RGB", (468, 466))
        receipt = {"pixelGeometry": {"rawSize": [468, 466], "crop": [1, 0, 466, 466],
                                     "evidence": "factory logical center x234 vs Gea233"}}
        cropped, geometry = analysis.receipt_crop(source, receipt, True)
        self.assertEqual(cropped.size, (466, 466))
        self.assertEqual(source.size, (468, 466))
        self.assertEqual(geometry["crop"], [1, 0, 466, 466])
        with self.assertRaises(ValueError):
            analysis.receipt_crop(source, {"pixelGeometry": {"rawSize": [468, 466], "crop": [1, 0, 466, 466]}}, True)
        with self.assertRaises(ValueError):
            analysis.receipt_crop(source, {"pixelGeometry": dict(receipt["pixelGeometry"], rawSize=[466, 466])}, True)

    def test_circle_metrics_exclude_only_outside_pixel_centers(self):
        left = Image.new("RGB", (10, 10))
        right = left.copy()
        right.putpixel((0, 0), (255, 255, 255))
        right.putpixel((5, 5), (30, 0, 0))
        self.assertEqual(analysis.pixel_metrics(left, right)["changedPixels"], 2)
        circle = analysis.pixel_metrics(left, right, circular=True)
        self.assertEqual(circle["changedPixels"], 1)
        self.assertEqual(circle["evaluatedPixels"], 80)

    def test_filename_route_and_equal_pixels_do_not_attest_state(self):
        row = {"id": "fft-labels", "expectedClass": "graphic", "node": "valid route"}
        self.assertFalse(analysis.validated_state(row, row, {})["verified"])

    def test_explicit_matching_state_and_evidence_are_required(self):
        screens = {"fft": {"id": "fft", "states": ["labels enabled", "labels disabled"]}}
        row = {"manifestScreenId": "fft", "manifestState": "labels enabled",
               "stateVerified": True, "stateEvidence": "asserted toggle state and fixed input"}
        self.assertTrue(analysis.validated_state(row, row, screens)["verified"])
        changed = dict(row, manifestState="labels disabled")
        self.assertFalse(analysis.validated_state(row, changed, screens)["verified"])
        self.assertFalse(analysis.validated_state(row, dict(row, stateVerified=False), screens)["verified"])
        with self.assertRaises(ValueError):
            analysis.validated_state(dict(row, manifestState="unknown"), dict(row, manifestState="unknown"), screens)

    def test_matching_class_does_not_hide_different_button_or_picker_parameters(self):
        screens = {"settings.button": {"id": "settings.button", "states": ["SFX on/off"]}}
        row = {"manifestScreenId": "settings.button", "manifestState": "SFX on/off",
               "stateVerified": True, "stateEvidence": "actual source-backed switch pixels",
               "comparisonParameters": {"sfx": True, "vibration": True}}
        self.assertTrue(analysis.validated_state(row, row, screens)["verified"])
        other = dict(row, comparisonParameters={"sfx": False, "vibration": False})
        self.assertEqual(analysis.validated_state(row, other, screens)["reason"], 'different_controlled_parameters')
        self.assertEqual(analysis.validated_state(row, dict(row, comparisonParameters={}), screens)["reason"],
                         'missing_controlled_parameters')


class MissingGeometryTests(unittest.TestCase):
    def test_explicitly_absent_crop_preserves_unmatched_raw_frame(self):
        image = Image.new('RGB', (468, 466))
        geometry = {'rawSize': [468, 466], 'crop': None,
                    'sourceAuthority': 'No actual matched scene container'}
        actual, retained = analysis.receipt_crop(image, {'pixelGeometry': geometry}, True)
        self.assertEqual(actual.size, (468, 466))
        self.assertEqual(retained, geometry)
        self.assertFalse(analysis.pixel_metrics(actual, Image.new('RGB', (466, 466)))['comparable'])


if __name__ == "__main__":
    unittest.main()
