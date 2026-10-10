"""Audit every retained Gea frame against the final diagnostic build identity."""
import hashlib
import importlib.util
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPORTS = HERE.parents[2] / 'reports/m5-stopwatch'
spec = importlib.util.spec_from_file_location('capture_comparison', HERE / 'compare-captures.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
build = json.loads((HERE / 'gea-benchmark-build.json').read_text())
expected = build['app_image']['sha256']
assert hashlib.sha256(Path(build['app_image']['path']).read_bytes()).hexdigest() == expected
directory = REPORTS / 'captures/gea'
receipts = module.receipts(directory)
rows = []
for frame in sorted(directory.glob('*.png')):
    receipt = receipts.get(frame.stem)
    if frame.stem.startswith('portal-'):
        continue
    matches = receipt is not None and receipt.get('firmwareBinarySha256') == expected
    rows.append({'id': frame.stem, 'captureSha256': hashlib.sha256(frame.read_bytes()).hexdigest(),
                 'receiptPresent': receipt is not None, 'finalArtifactIdentityMatches': matches,
                 'stateVerified': bool(receipt and receipt.get('stateVerified'))})
result = {'expectedFirmwareSha256': expected, 'frames': rows,
          'allRetainedDeviceFramesMatch': bool(rows) and all(row['finalArtifactIdentityMatches'] for row in rows),
          'authority': 'Retained binary hash plus exclusive flashing and capture receipts; not remote flash readback'}
(REPORTS / 'gea-final-capture-identity.json').write_text(json.dumps(result, indent=2) + '\n')
assert result['allRetainedDeviceFramesMatch'], 'Stale or unattested device frame retained in final collection'
print(f'Final artifact identity retained for {len(rows)} device frames')
