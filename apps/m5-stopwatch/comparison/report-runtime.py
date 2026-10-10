#!/usr/bin/env python3
"""Populate measured runtime sections from all retained sampling repetitions."""

import argparse
import json
from pathlib import Path


REPORTS = Path(__file__).resolve().parents[3] / 'reports/m5-stopwatch'
SCENES = (
    ('menu-idle', 'Launcher idle'), ('classic-active', 'Classic watch'),
    ('number-flow-active', 'NumberFlow'), ('imu-stationary', 'Stationary IMU'),
    ('fft-passive', 'Passive FFT'), ('stopwatch-running', 'Running stopwatch'),
    ('wheel-idle', 'Wheel idle'),
)


def measured(index, framework, variant, optimization, scene, metric):
    sample = index[(framework, variant, optimization, scene)]
    if sample['repetitions'] != 3:
        raise ValueError('Primary report requires all three repetitions')
    value = sample['metrics'][metric]
    if value is not None and value['n'] != 3:
        return None
    return value


def interval(value, decimals=2):
    if value is None:
        return 'Unavailable'
    return f"{value['median']:.{decimals}f} ({value['min']:.{decimals}f}–{value['max']:.{decimals}f})"


def populate(data, summary):
    index = {(s['framework'], s['variant'], s['optimization'], s['scenario']): s
             for s in summary['summary']}
    rows = [['Workload', 'Factory Og 33ms', 'Factory O2 33ms', 'Factory O2 16ms', 'Gea O2']]
    heaps = [['Workload', 'Factory internal free', 'Gea internal free', 'Factory PSRAM free', 'Gea PSRAM free']]
    timing = [['Workload', 'Factory upload p99 bound', 'Gea upload p99 bound', 'Factory wall work', 'Gea wall work']]
    for scene, label in SCENES:
        row = [label]
        for framework, variant, opt in (
            ('factory', 'original33', 'Og'), ('factory', 'original33', 'O2'),
            ('factory', 'refresh16', 'O2'), ('gea', 'benchmark-fenced', 'O2'),
        ):
            row.append(interval(measured(index, framework, variant, opt, scene, 'presented_fps')))
        rows.append(row)
        heap_row = [label]
        for metric in ('internal_free_bytes', 'psram_free_bytes'):
            for framework, variant in (('factory', 'refresh16'), ('gea', 'benchmark-fenced')):
                value = measured(index, framework, variant, 'O2', scene, metric)
                heap_row.append('Unavailable' if value is None else f"{value['median']:,.0f} B")
        heaps.append(heap_row)
        timing_row = [label]
        for framework, variant in (('factory', 'refresh16'), ('gea', 'benchmark-fenced')):
            value = measured(index, framework, variant, 'O2', scene, 'presented_cadence_p99_upper_us')
            timing_row.append('Unavailable' if value is None else f"≤{value['median'] / 1000:.0f} ms")
        for framework, variant in (('factory', 'refresh16'), ('gea', 'benchmark-fenced')):
            value = measured(index, framework, variant, 'O2', scene, 'wall_work_fraction_percent')
            timing_row.append('Unavailable' if value is None else f"{value['median']:.2f}%")
        timing.append(timing_row)
    runtime = next(section for section in data['sections'] if section['id'] == 'runtime')
    runtime['paragraphs'][0] = (
        'Each primary workload cold-boots, warms up for three seconds and records three '
        'ten-second windows without screenshot or control commands inside them. All '
        'repetitions are retained. The table reports completed-DMA-upload FPS as median '
        '(minimum–maximum), with original Og and optimized O2 factory results separated. '
        'The O2 factory 16 ms experiment changes refresh policy; its original 10 ms '
        'timer-service loop remains in place.')
    runtime['table'] = rows
    runtime['columnWeights'] = [1.15, 1.15, 1.15, 1.15, 0.95]
    runtime['paragraphs'] = runtime['paragraphs'][:2] + [
        'Idle dirty rendering and active throughput are different findings. A zero '
        'upload rate on an unchanged screen means no redundant display transfer; '
        'it does not measure the maximum redraw rate. The launcher shows hours '
        'and minutes, while the classic watch changes once per second. Compare '
        'animation cadence and state semantics before treating a higher upload '
        'rate as a better visual result.',
        f"The retained bundle contains {len(summary['runs'])} windows, including "
        'fenced primary runs and separately labelled unfenced controls. Unfenced '
        'completion FPS remains unavailable. Stationary IMU and passive microphone '
        'runs do not control each individual sensor sample or audio waveform.',
    ]
    extra = [
        {
            'id': 'runtime-cadence', 'title': 'Upload cadence and wall work',
            'paragraphs': [
                'These compare factory O2 at 16 ms with Gea O2. Upload p99 is the median '
                'of each run’s 1 ms histogram upper bound. An empty histogram or its '
                'unbounded overflow bin is unavailable. A metric is unavailable unless '
                'all three repetitions yield valid values. Sparse dirty updates on idle '
                'screens are normal and are not a 60 FPS rendering failure.',
                'Wall work is total measured frame-work wall time divided by window '
                'duration. It includes blocking and DMA waits; it is not CPU utilization '
                'or energy consumption. Different scheduler iteration rates remain in '
                'the raw results and must not be renamed visual FPS.',
            ],
            'table': timing, 'columnWeights': [1.2, 1.15, 1.15, 1, 1],
        },
        {
            'id': 'runtime-heap', 'title': 'Live heap after each workload',
            'paragraphs': [
                'End-of-window free heap medians in bytes, from three repetitions on '
                'factory O2 at 16 ms and Gea O2. These are diagnostics with capture and '
                'gesture buffers disarmed. SDK heap totals can differ; free bytes alone '
                'are not a portable application-memory budget.',
                'The evidence bundle also records region totals, used bytes, largest '
                'free blocks, boot-lifetime minima and before/after scene readings. '
                'Static allocations are reported separately and must not be double '
                'counted with heap use.',
            ],
            'table': heaps, 'columnWeights': [1.15, 1.15, 1.15, 1.15, 1.15],
        },
    ]
    controls = [['Framework / policy', 'Workload', 'Rendered FPS', 'Completed-upload FPS']]
    for framework, variant, opt, scene, label in (
        ('factory', 'original33-unfenced', 'Og', 'fft-passive', 'Factory Og 33 ms'),
        ('factory', 'original33-unfenced', 'O2', 'fft-passive', 'Factory O2 33 ms'),
        ('factory', 'refresh16-unfenced', 'Og', 'fft-passive', 'Factory Og 16 ms'),
        ('factory', 'refresh16-unfenced', 'O2', 'fft-passive', 'Factory O2 16 ms'),
        ('gea', 'benchmark-unfenced', 'O2', 'fft-passive', 'Gea O2'),
        ('gea', 'benchmark-unfenced', 'O2', 'imu-stationary', 'Gea O2'),
    ):
        controls.append([
            label, 'Passive FFT' if scene == 'fft-passive' else 'Stationary IMU',
            interval(measured(index, framework, variant, opt, scene, 'rendered_fps')),
            interval(measured(index, framework, variant, opt, scene, 'presented_fps')),
        ])
    extra.append({
        'id': 'runtime-unfenced', 'title': 'Control runs without the final frame fence',
        'paragraphs': [
            'These runs remove the explicit end-of-frame DMA completion wait. Normal '
            'buffer ownership and transfer synchronization remain. Rendered FPS is '
            'not completed-upload FPS or panel scan rate. Three ten-second windows '
            'per row are retained; medians and ranges use every valid repetition.',
        ],
        'table': controls, 'columnWeights': [1.2, 1, 1.2, 1.2],
    })
    data['sections'] = [s for s in data['sections'] if s['id'] not in {e['id'] for e in extra}]
    position = next(i for i, s in enumerate(data['sections']) if s['id'] == 'runtime') + 1
    data['sections'][position:position] = extra
    memory = next(s for s in data['sections'] if s['id'] == 'memory')
    memory['paragraphs'][1] = (
        'The static internal data allocation is larger in Gea. Its IRAM allocation '
        'lies between the original factory and factory O2 values. Dynamic buffers, '
        'caches, task stacks and application objects are reflected separately in '
        'the live-heap section and raw device records.')
    for row in memory['table']:
        if row[0] in ('Internal live / minimum / largest free', 'PSRAM live / minimum / largest free'):
            row[1:] = ['Retained raw samples', 'See live-heap section', 'See live-heap section']
    data['measurementState']['runtimeWindows'] = 'recorded; all repetitions retained'
    data['provenance']['runtimeSummary'] = 'runtime-summary.json'
    return data


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--summary', type=Path, default=REPORTS / 'runtime-summary.json')
    parser.add_argument('--data', type=Path, default=REPORTS / 'report-data.json')
    args = parser.parse_args()
    data = populate(json.loads(args.data.read_text()), json.loads(args.summary.read_text()))
    args.data.write_text(json.dumps(data, indent=2) + '\n')
    print('Recorded complete runtime, cadence and heap tables')


if __name__ == '__main__':
    main()
