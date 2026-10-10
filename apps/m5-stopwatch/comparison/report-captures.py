#!/usr/bin/env python3
"""Populate the PDF appendix from the retained paired-capture assessment."""

import argparse
import json
from pathlib import Path


REPORTS = Path(__file__).resolve().parents[3] / 'reports/m5-stopwatch'


def appendix(analysis, reports=REPORTS):
    pairs = []
    for row in analysis['comparisons']:
        browser = row['id'].startswith('portal-')
        # The viewport version is readable on paper; retain full-page originals
        # and their assessments in the evidence bundle.
        if browser and not row['id'].endswith('-viewport'):
            continue
        state = row['stateValidation']
        notes = ('Attested state: ' + state['screen'] + ' / ' + state['state']) if state['verified'] else (
            'State equivalence unverified: ' + state['reason'])
        metrics = row['pixels'] if browser else row['canonicalCircularRgb565']
        metric_label = 'Image dimensions differ; no pixel-difference score.'
        if metrics['comparable']:
            metric_label = ('Browser rectangle' if browser else 'Logical circular RGB565 region') + (
                f": {metrics['changedPixelFraction'] * 100:.2f}% differing pixels; "
                f"mean absolute channel difference {metrics['meanAbsoluteChannelError']:.2f}/255. "
                'A difference score is not a feature-parity verdict.')
        pair = {
            'id': row['id'], 'label': row['id'].replace('-', ' '),
            'factory': str(Path(row['factory']).resolve().relative_to(reports.resolve())),
            'gea': str(Path(row['gea']).resolve().relative_to(reports.resolve())),
            'notes': notes, 'metricLabel': metric_label,
            'appliedGeometry': row['appliedGeometry'],
        }
        if browser:
            pair['layout'] = 'browser'
        if row['id'] in ('badge-edit-cancel', 'badge-edit-dialog'):
            pair['displayOmissions'] = {
                'factory': 'Factory screenshot contains a previously stored personal image. '
                'Its local receipt and measured comparison are retained; that image is omitted '
                'from this presentation PDF. The Gea dialog or cancellation screen is shown.'
            }
        pairs.append(pair)
    return pairs


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--analysis', type=Path, default=REPORTS / 'paired-capture-analysis.json')
    parser.add_argument('--data', type=Path, default=REPORTS / 'report-data.json')
    args = parser.parse_args()
    analysis = json.loads(args.analysis.read_text())
    data = json.loads(args.data.read_text())
    data['pairs'] = appendix(analysis)
    args.data.write_text(json.dumps(data, indent=2) + '\n')
    print(f"Recorded {len(data['pairs'])} appendix comparisons; all source captures retained")


if __name__ == '__main__':
    main()
