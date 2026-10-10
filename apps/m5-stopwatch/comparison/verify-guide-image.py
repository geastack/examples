"""Compare the real guide upload with the pinned bitmap at its source placement."""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image
import numpy as np

source_path, capture_path = map(Path, sys.argv[1:])
source = Image.open(source_path).convert('RGBA')
assert source.size == (375, 278)
background = Image.new('RGBA', source.size, (0, 0, 0, 255))
background.alpha_composite(source)
expected = np.asarray(background.convert('RGB'), dtype=np.uint16)
actual = np.asarray(Image.open(capture_path).convert('RGB').crop((45, 94, 420, 372)), dtype=np.uint16)

def words(rgb):
    return ((rgb[:, :, 0] >> 3) << 11) | ((rgb[:, :, 1] >> 2) << 5) | (rgb[:, :, 2] >> 3)

changed = int(np.count_nonzero(words(expected) != words(actual)))
print(json.dumps({'sourceSha256': hashlib.sha256(source_path.read_bytes()).hexdigest(), 'actualCaptureSha256': hashlib.sha256(capture_path.read_bytes()).hexdigest(), 'crop': [45, 94, 375, 278], 'changed565Pixels': changed, 'exact565': changed == 0, 'authority': 'Pinned guide asset and source CSS position; no scaling, tolerance or alignment search'}))
