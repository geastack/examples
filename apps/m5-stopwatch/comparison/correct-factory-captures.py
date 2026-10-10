#!/usr/bin/env python3
"""Recover exact16-bit wire words from the original injective RGB expansion, then decode swap565."""

import json
from pathlib import Path

from PIL import Image

root = Path(__file__).resolve().parents[3] / "reports/m5-stopwatch/captures/factory"
for path in root.glob("*.png"):
    metadata_path = path.with_suffix(".json")
    metadata = json.loads(metadata_path.read_text())
    if (
        metadata.get("rgbExpansion")
        == "bit replication, matching cli/src/device/image.mjs"
    ):
        continue
    if path.with_suffix(".rgb565").exists():
        wire = path.with_suffix(".rgb565").read_bytes()
        rgb = bytearray()
        for index in range(0, len(wire), 2):
            original = int.from_bytes(wire[index : index + 2], "little")
            word = ((original & 255) << 8) | (original >> 8)
            r5, g6, b5 = word >> 11, (word >> 5) & 63, word & 31
            rgb.extend(
                ((r5 << 3) | (r5 >> 2), (g6 << 2) | (g6 >> 4), (b5 << 3) | (b5 >> 2))
            )
        Image.frombytes(
            "RGB", (metadata["width"], metadata["height"]), bytes(rgb)
        ).save(path)
        metadata["rgbExpansion"] = "bit replication, matching cli/src/device/image.mjs"
        metadata_path.write_text(json.dumps(metadata, indent=2) + "\n")
        continue
    image = Image.open(path).convert("RGB")
    wire = bytearray()
    rgb = bytearray()
    for r, g, b in image.getdata():
        # Exact inverse: every possible expanded5/6bit component is distinct.
        word = (
            (round(r * 31 / 255) << 11)
            | (round(g * 63 / 255) << 5)
            | round(b * 31 / 255)
        )
        assert (r, g, b) == (
            (word >> 11) * 255 // 31,
            ((word >> 5) & 63) * 255 // 63,
            (word & 31) * 255 // 31,
        )
        wire.extend(word.to_bytes(2, "little"))
        word = ((word & 255) << 8) | (word >> 8)
        r5, g6, b5 = word >> 11, (word >> 5) & 63, word & 31
        rgb.extend(
            ((r5 << 3) | (r5 >> 2), (g6 << 2) | (g6 >> 4), (b5 << 3) | (b5 >> 2))
        )
    path.with_suffix(".rgb565").write_bytes(wire)
    Image.frombytes("RGB", image.size, bytes(rgb)).save(path)
    metadata["rgbExpansion"] = "bit replication, matching cli/src/device/image.mjs"
    metadata["wireEncoding"] = "M5GFX swap565_t little-endian uint16 words"
    metadata["decodeCorrection"] = (
        "Exact inverse of injective5/6bit channel expansion, then byte swap; original wire words retained."
    )
    metadata_path.write_text(json.dumps(metadata, indent=2) + "\n")
    print(path.name)
