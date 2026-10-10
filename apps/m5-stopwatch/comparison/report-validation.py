#!/usr/bin/env python3
"""Populate observed screen coverage and strict gesture evidence in the PDF."""

import argparse
import json
from pathlib import Path


REPORTS = Path(__file__).resolve().parents[3] / 'reports/m5-stopwatch'


def populate(data, captures, gestures):
    coverage = captures['coverage']
    reference = [row for row in coverage if row['screen'] != 'error.overlay']
    screen_count = sum(bool(row['verifiedPairedStates']) for row in reference)
    finite_states = sum(len(row['verifiedPairedStates']) + len(row['unverifiedStates']) for row in reference)
    validation = next(section for section in data['sections'] if section['id'] == 'validation')
    validation['paragraphs'][1] = (
        f"The paired assessment contains {captures['pairedImages']} image pairs. "
        f"Public state evidence attests {captures['verifiedFiniteStates']} of "
        f"{finite_states} reference finite classes across {screen_count} of "
        f"{len(reference)} installed reference screen groups. The thirtieth inventory "
        'group is Gea’s extra error overlay, which has no factory counterpart. '
        'This counts displayed state classes, not '
        'identical dynamic parameters or pixel parity. The appendix shows every '
        'paired device capture and readable browser viewport. Unpaired files and '
        'every original full-page browser image remain in the evidence bundle.')
    validation['table'][0][2] = 'Observed status'
    validation['table'][3][2] = (
        f"{captures['pairedImages']} pairs; {captures['verifiedFiniteStates']} "
        f"attested finite classes; {screen_count}/{len(reference)} reference groups")
    summary = gestures['summary']
    validation['table'][4][2] = (
        f"{summary['paired_receipts']}/{summary['planned_cases']} paired gesture recipes; "
        'strict timing and outcomes reported separately')
    sections = [
        {
            'id': 'screen-coverage', 'title': 'Screen coverage and remaining evidence gaps',
            'paragraphs': [
                'Only captures with both actual pixel-source provenance and explicit '
                'matching public state assertions count here. Missing state evidence '
                'remains unverified, including visually similar or identical frames. '
                'Representative numeric and continuous input boundaries do not enumerate '
                'all possible inputs.',
            ],
            'table': [['Screen group', 'Attested classes', 'Unverified classes']] + [
                [row['screen'], str(len(row['verifiedPairedStates'])),
                 ('Gea-only error surface; absent from reference' if row['screen'] == 'error.overlay' else
                  '; '.join(row['unverifiedStates']) or 'None in this finite inventory')]
                for row in coverage
            ],
            'columnWeights': [1.1, 0.6, 2.3],
        },
        {
            'id': 'gesture-evidence', 'title': 'Drag and picker dynamics',
            'paragraphs': [
                'Twenty-one shared pointer recipes are staged on the device clock '
                'and consumed through each normal input path. Actual input histories '
                'and transformed geometry are retained. The strict assessment uses '
                'zero timing and pixel tolerance, identical requested observation times, '
                'and no nearest-time pairing, interpolation or alignment search.',
                'Factory LVGL polling and Gea dispatch can consume different stages or '
                'consume them at different times. Such inputs do not establish identical '
                'drag trajectories. A committed public outcome is assessed separately '
                'and cannot establish momentum or transformed-corner equality.',
            ],
            'table': [['Evidence', 'Available', 'Different']] + [
                ['Input timing comparisons', str(summary['input_comparisons_available']), 'See raw histories'],
                ['State observations', str(summary['state_observations_comparable']), 'See per-case records'],
                ['Transformed corner observations', str(summary['corner_observations_comparable']),
                 str(summary['corner_observations_different'])],
                ['Launcher motif observations', str(summary['launcher_motif_observations_comparable']),
                 str(summary['launcher_motif_observations_different'])],
                ['Committed outcomes', str(summary['committed_outcomes_comparable']),
                 str(summary['committed_outcomes_different'])],
            ],
            'columnWeights': [2, 0.7, 1.3],
            'notes': ['Exact drag parity is not established by this assessment. Missing or mismatched sampling remains unavailable.'],
        },
    ]
    ids = {section['id'] for section in sections}
    data['sections'] = [section for section in data['sections'] if section['id'] not in ids]
    position = next(i for i, section in enumerate(data['sections']) if section['id'] == 'validation') + 1
    data['sections'][position:position] = sections
    data['measurementState']['pairedCaptureAssessment'] = 'recorded; remaining evidence gaps explicit'
    data['provenance']['pairedCaptures'] = 'paired-capture-analysis.json'
    data['provenance']['gestures'] = 'gesture-comparison.json'
    return data


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data', type=Path, default=REPORTS / 'report-data.json')
    parser.add_argument('--captures', type=Path, default=REPORTS / 'paired-capture-analysis.json')
    parser.add_argument('--gestures', type=Path, default=REPORTS / 'gesture-comparison.json')
    args = parser.parse_args()
    data = populate(json.loads(args.data.read_text()), json.loads(args.captures.read_text()),
                    json.loads(args.gestures.read_text()))
    args.data.write_text(json.dumps(data, indent=2) + '\n')
    print('Recorded observed screen coverage and strict gesture evidence')


if __name__ == '__main__':
    main()
