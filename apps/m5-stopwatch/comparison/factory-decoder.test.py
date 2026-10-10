#!/usr/bin/env python3
"""Check M5GFX swap565 host decoding and lossless recovery of early captures."""

import importlib.util
import sys
import unittest
from pathlib import Path

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location(
    "factory_device", Path(__file__).with_name("factory-device.py")
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def decode(wire):
    word = ((wire & 255) << 8) | (wire >> 8)
    return (
        (word >> 11) * 255 // 31,
        ((word >> 5) & 63) * 255 // 63,
        (word & 31) * 255 // 31,
    )


class DecoderTest(unittest.TestCase):
    def test_known_colors(self):
        for word, expected in [
            (0xFFFF, (255, 255, 255)),
            (0xF800, (255, 0, 0)),
            (0x07E0, (0, 255, 0)),
            (0x001F, (0, 0, 255)),
            (0, (0, 0, 0)),
        ]:
            self.assertEqual(decode(((word & 255) << 8) | (word >> 8)), expected)

    def test_all_wire_words_recover_exactly(self):
        for word in range(65536):
            r, g, b = (
                (word >> 11) * 255 // 31,
                ((word >> 5) & 63) * 255 // 63,
                (word & 31) * 255 // 31,
            )
            recovered = (
                (round(r * 31 / 255) << 11)
                | (round(g * 63 / 255) << 5)
                | round(b * 31 / 255)
            )
            self.assertEqual(recovered, word)


class ActualDecoderTest(unittest.TestCase):
    def test_actual_bit_replication_all_words(self):
        for word in range(65536):
            wire = ((word & 255) << 8) | (word >> 8)
            r, g, b = module.decode_wire_pixel(wire)
            self.assertEqual(((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3), word)

    def test_intact_records_with_log_prefix(self):
        self.assertEqual(
            module.decode_rows(
                ["log SWCAP ROW 0 ffff00f8", "SWCAP ROW 1 e0071f00"], 2, 2
            ),
            {0: "ffff00f8", 1: "e0071f00"},
        )

    def test_partial_duplicate_and_interleaved_rows_rejected(self):
        for rows in [
            ["SWCAP ROW 0 ffff00f8"],
            ["SWCAP ROW 0 ffff00f8", "SWCAP ROW 0 e0071f00"],
            ["SWCAP ROW 0 ffff LOG 00f8", "SWCAP ROW 1 e0071f00"],
            ["SWCAP ROW 2 ffff00f8", "SWCAP ROW 1 e0071f00"],
        ]:
            with self.assertRaises(ValueError):
                module.decode_rows(rows, 2, 2)


if __name__ == "__main__":
    unittest.main()
