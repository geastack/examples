import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  StopwatchModel,
  elapsedText,
  fftReducedBand,
  fftSmoothBand,
  fftBarRadii,
  fillFftBarRadii,
  factoryUnwrapAngle,
  fftBarColor,
  alarmDue,
  dateKey,
  daysInMonth,
  spinTarget,
  wheelColors,
  wrap,
} from '../lib/model.ts'

test('stopwatch excludes pause duration, records cumulative laps and resets', () => {
  const watch = new StopwatchModel()

  watch.start(100)
  watch.start(200)
  assert.equal(watch.elapsed(1100), 1000)
  watch.lap(1100)
  watch.pause(2100)
  watch.lap(2200)
  assert.deepEqual(watch.laps, [1000])
  assert.equal(watch.elapsed(4000), 2000)
  watch.start(5000)
  watch.lap(5500)
  assert.deepEqual(watch.laps, [1000, 2500])
  watch.reset()
  assert.equal(watch.elapsed(9000), 0)
  assert.deepEqual(watch.laps, [])
  assert.equal(elapsedText(3661230), 'O1:O1:O1.23')
  assert.equal(elapsedText(0), 'OO:OO:OO.OO')
})
test('daily alarms trigger once per calendar date and respect disable', () => {
  const date = new Date(2026, 9, 5, 8, 30)
  const alarm = { id: 1, hour: 8, minute: 30, enabled: true, lastDate: -1 }

  assert.equal(alarmDue(alarm, date), true)
  alarm.lastDate = dateKey(date)
  assert.equal(alarmDue(alarm, date), false)
  assert.equal(alarmDue(alarm, new Date(2026, 9, 6, 8, 30)), true)
  alarm.enabled = false
  assert.equal(alarmDue(alarm, new Date(2026, 9, 6, 8, 30)), false)
})
test('date selectors clamp leap days correctly', () => {
  assert.equal(daysInMonth(2024, 2), 29)
  assert.equal(daysInMonth(2100, 2), 28)
  assert.equal(daysInMonth(2000, 2), 29)
  assert.equal(daysInMonth(2026, 4), 30)
})
test('wheel outcomes stay within selected sector in either spin direction', () => {
  for (let count = 2; count <= 18; count++) {
    for (let sector = 0; sector < count; sector++) {
      for (const clockwise of [true, false]) {
        for (const jitter of [-1, 0, 1]) {
          const target = spinTarget(733, sector, count, 4, clockwise, jitter)

          assert.equal(Math.floor(wrap(target, 360) / (360 / count)), sector)
          assert.ok(clockwise ? target - 733 >= 1440 : 733 - target >= 1440)
        }
      }
    }
  }
})
test('wheel color order has no neighboring or wraparound duplicates', () => {
  for (let count = 2; count <= 18; count++) {
    const order = wheelColors(count)

    assert.equal(order.length, count)
    for (let n = 0; n < count; n++) {
      assert.notEqual(order[n], order[(n + 1) % count])
    }
  }
})

test('FFT groups use the factory weighted average and retain each fifth band', () => {
  assert.equal(fftReducedBand(Array(20).fill(1), 0), 1)
  assert.equal(fftReducedBand(Array(20).fill(0), 3), 0)

  const bands = Array(20).fill(0)

  bands[4] = 1
  assert.ok(Math.abs(fftReducedBand(bands, 0) - 0.65 / 4.125) < 1e-7)
  assert.equal(fftReducedBand(bands, 1), 0)
  bands[0] = 1
  assert.ok(Math.abs(fftReducedBand(bands, 0) - 1.65 / 4.125) < 1e-7)
})

test('FFT overlapping lobes fit the native canvas with all four bands saturated', () => {
  const maximum = [
    134, 132, 136, 149, 160, 160, 143, 118, 93, 109, 134, 109, 86, 92, 99, 160, 116, 123, 129, 132,
  ]

  assert.deepEqual(fftBarRadii([1, 1, 1, 1]), maximum)
  assert.deepEqual(fftBarRadii([0, 0, 0, 0]), Array(20).fill(82))
  assert.equal(Math.max(...maximum), 160)
  for (let sample = 0; sample < 100; sample++) {
    const reduced = Array.from(
      { length: 4 },
      (_, group) => ((sample * 17 + group * 31) % 101) / 100,
    )
    const radii = fftBarRadii(reduced)

    assert.ok(radii.every((radius, index) => radius >= 82 && radius <= maximum[index]))
  }
})

test('FFT colors match factory stops, integer interpolation and saturated overlap', () => {
  assert.equal(fftBarColor(79), 0xc19bffff)
  assert.equal(fftBarColor(80), 0xc19bffff)
  assert.equal(fftBarColor(90), 0xd48aefff)
  assert.equal(fftBarColor(100), 0xe97ae0ff)
  assert.equal(fftBarColor(128), 0xf370ceff)
  assert.equal(fftBarColor(156), 0xff66bcff)
  assert.equal(fftBarColor(160), 0xff66bcff)
})

test('precomputed FFT lobes preserve the factory formula for deterministic random inputs', () => {
  let seed = 0x48219037

  for (let sample = 0; sample < 5000; sample++) {
    const reduced = Array.from({ length: 4 }, () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0

      return (seed / 0x100000000) * 1.4 - 0.2
    })
    const expected = Array(20).fill(82)

    for (let group = 0; group < 4; group++) {
      const width = [20, 8, 4, 2][group]
      const amplitude = Math.trunc(
        Math.fround(Math.fround(74) * Math.fround(Math.max(0, Math.min(1, reduced[group])))),
      )

      for (let position = 0; position < width; position++) {
        const modulation =
          Math.round(Math.cos((((position * 360) / width + 180) * Math.PI) / 180) * 180) + 180
        const index = wrap(group * 5 - width / 2 + position, 20)

        expected[index] += (amplitude * modulation) >> 9
      }
    }

    assert.deepEqual(fftBarRadii(reduced), expected)
  }
})

test('actual FFT triangle kernel preserves native rounded coordinates within its radius bounds', () => {
  const source = readFileSync(new URL('../apps/app_fft/view/view.tsx', import.meta.url), 'utf8')
  const begin = source.indexOf('const ax = Math.fround')
  const end = source.indexOf('ctx.fillTrianglesRgb565Sorted', begin)
  const body = source
    .slice(begin, end)
    .trim()
    .replace(/\n\s*}$/, '')
  const names = ['triangleX0', 'triangleY0', 'triangleX1', 'triangleY1', 'triangleX2', 'triangleY2']
  const kernel = new Function(
    'n',
    'radius',
    'watch',
    'wedgeCosine',
    'wedgeSine',
    'fftBarColor',
    'center',
    'inner',
    ...names,
    'triangleColors',
    body,
  )
  const cosine = new Float32Array(40)
  const sine = new Float32Array(40)

  for (let n = 0; n < 20; n++) {
    for (let edge = 0; edge < 2; edge++) {
      const angle = ((n * 9 + (edge === 0 ? 91 : 98)) * Math.PI) / 180

      cosine[n * 2 + edge] = Math.cos(angle)
      sine[n * 2 + edge] = Math.sin(angle)
    }
  }

  const arrays = names.map(() => new Float32Array(80))
  const colors = new Uint32Array(80)
  let changedFloatBits = 0

  for (let radius = 82; radius <= 160; radius++) {
    for (let discSize = 137; discSize <= 160; discSize++) {
      const inner = discSize / 2 - 1

      for (let n = 0; n < 20; n++) {
        kernel(
          n,
          radius,
          { fftDiscSize: discSize },
          cosine,
          sine,
          fftBarColor,
          166,
          Math.fround(inner),
          ...arrays,
          colors,
        )
        for (const mirror of [-1, 1]) {
          const triangle = n * 4 + (mirror === -1 ? 0 : 2)
          const ax = cosine[n * 2]
          const ay = sine[n * 2]
          const bx = cosine[n * 2 + 1]
          const by = sine[n * 2 + 1]
          const expected = [
            [
              166 + ax * inner * mirror,
              166 + ay * inner,
              166 + ax * radius * mirror,
              166 + ay * radius,
              166 + bx * radius * mirror,
              166 + by * radius,
            ],
            [
              166 + ax * inner * mirror,
              166 + ay * inner,
              166 + bx * radius * mirror,
              166 + by * radius,
              166 + bx * inner * mirror,
              166 + by * inner,
            ],
          ]

          for (let offset = 0; offset < 2; offset++) {
            for (let coordinate = 0; coordinate < 6; coordinate++) {
              const previous = Math.fround(expected[offset][coordinate])
              const actual = arrays[coordinate][triangle + offset]

              if (actual !== previous) {
                changedFloatBits++
              }

              assert.equal(Math.round(actual), Math.round(previous))
            }
          }
        }
      }
    }
  }

  // This proves bounded pixel equivalence, not exact Float32 bit equality.
  assert.ok(changedFloatBits > 0)
})

test('FFT display smoothing follows factory Float32 attack and release within normalized bounds', () => {
  let smoothed = 0
  const expected = [0.6000000238418579, 0.8400000333786011, 0.537600040435791, 0.34406399726867676]

  for (const [index, target] of [1, 1, 0, 0].entries()) {
    smoothed = fftSmoothBand(smoothed, target)
    assert.equal(smoothed, expected[index])
  }

  let oldDouble = 0

  smoothed = 0
  let seed = 0x837abc01

  for (let index = 0; index < 50000; index++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const target = Math.fround(seed / 0x100000000)

    oldDouble += (target - oldDouble) * (target > oldDouble ? 0.6 : 0.36)
    smoothed = fftSmoothBand(smoothed, target)
    assert.equal(smoothed, Math.fround(smoothed))
    assert.ok(smoothed >= 0 && smoothed <= 1)
    assert.ok(Math.abs(smoothed - oldDouble) < 2e-7)
  }

  assert.equal(fftSmoothBand(0, 3), Math.fround(0.6))
  assert.equal(fftSmoothBand(1, -3), Math.fround(1 - Math.fround(0.36)))
})

test('reusable FFT radii reset previous lobes and cached integer indices preserve blend geometry', () => {
  const radii = new Uint16Array(20)

  fillFftBarRadii([1, 1, 1, 1], radii)
  assert.deepEqual(Array.from(radii), fftBarRadii([1, 1, 1, 1]))
  fillFftBarRadii([0, 0, 0, 0], radii)
  assert.deepEqual(Array.from(radii), Array(20).fill(82))
  fillFftBarRadii([0.8, 0.2, 0.4, 1], radii)

  const source = readFileSync(new URL('../apps/app_fft/view/view.tsx', import.meta.url), 'utf8')
  const start = source.indexOf('const rotation = fft.fftRotation')
  const end = source.indexOf('const ax = Math.fround', start)
  const body = source.slice(start, end)
  const kernel = new Function(
    'fft',
    'fftRandom',
    'radii',
    `const result = []; ${body} result.push(radius); } return result;`,
  )
  const random = new Uint16Array([994, 285, 553, 11, 792, 707, 966, 641, 852, 827])

  for (let offset = 0; offset < 10; offset++) {
    for (let rotation = 0; rotation < 20; rotation++) {
      for (const blend of [0, 0.035, 0.5, 0.735, 0.99999999999999]) {
        const actual = kernel(
          { fftRotation: rotation, fftOffset: offset, fftBlend: blend, fftDiscSize: 137 },
          random,
          radii,
        )
        const expected = Array.from({ length: 20 }, (_, n) => {
          const j = (n + rotation + random[offset]) % 20
          const k = (n + rotation + random[(offset + 1) % 10]) % 20

          return Math.trunc(radii[k] * blend + radii[j] * (1 - blend))
        })

        assert.deepEqual(actual, expected)
      }
    }
  }
})

test('FFT amplitude uses the factory float product before integer truncation', () => {
  const band = Math.fround(5 / 74)
  const radii = fftBarRadii([band, 0, 0, 0])

  assert.equal(Math.trunc(74 * band), 4)
  assert.equal(Math.trunc(Math.fround(Math.fround(74) * band)), 5)
  // The first lobe's middle uses modulation360: (5*360)>>9 =3.
  assert.equal(radii[0], 85)
})

test('IMU orbit unwrap follows the shortest continuous angle across both boundaries', () => {
  assert.equal(factoryUnwrapAngle(350, 10), 370)
  assert.equal(factoryUnwrapAngle(-350, -10), -370)
  assert.equal(factoryUnwrapAngle(720, 359), 719)
  assert.equal(factoryUnwrapAngle(0, 180), 180)
  assert.equal(factoryUnwrapAngle(0, -180), -180)
})

test('IMU cross boxes use factory integer center alignment and foreground layering', () => {
  const view = readFileSync(new URL('../apps/app_imu/view/view.tsx', import.meta.url), 'utf8')
  const css = readFileSync(new URL('../apps/app_imu/view/view.css', import.meta.url), 'utf8')
  const dimension = (className, property) => {
    const block = css.match(new RegExp(`\\.${className} \\{([^}]+)\\}`))[1]

    return Number(block.match(new RegExp(`${property}: (\\d+)px`))[1])
  }

  const center = (size) => Math.trunc(466 / 2) - Math.trunc(size / 2)
  const moving = [...view.matchAll(/style=\{\{ left: ([^,]+), top: ([^}]+) \}\}/g)].map(
    (match) => new Function('imu', `return [${match[1]}, ${match[2]}]`),
  )

  assert.equal(moving.length, 2)
  for (const watch of [
    { ballX: 0, ballY: 0 },
    { ballX: -63, ballY: 42 },
  ]) {
    assert.deepEqual(moving[0](watch), [center(36) + watch.ballX, center(2) + watch.ballY])
    assert.deepEqual(moving[1](watch), [center(2) + watch.ballX, center(36) + watch.ballY])
  }

  for (const [name, width, height] of [
    ['imu-overlay-horizontal', 289, 2],
    ['imu-overlay-vertical', 2, 289],
  ]) {
    assert.equal(dimension(name, 'width'), width)
    assert.equal(dimension(name, 'height'), height)
    assert.equal(dimension(name, 'left'), center(width))
    assert.equal(dimension(name, 'top'), center(height))
  }

  assert.ok(view.indexOf('<CanvasSurface') < view.indexOf('class="imu-cross'))
  assert.ok(view.indexOf('imu-overlay-vertical') < view.indexOf('class="accel ax"'))
})
