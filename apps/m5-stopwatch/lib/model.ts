// SPDX-License-Identifier: MIT
// Ported behavior from M5StopWatch-UserDemo at 6b4aa125; no hardware dependencies.
export function pad(value: number): string {
  return value < 10 ? '0' + value : String(value)
}

export function elapsedText(ms: number): string {
  const hundredths = Math.floor(Math.max(0, ms) / 10)

  return (
    pad(Math.floor(hundredths / 360000)) +
    ':' +
    pad(Math.floor(hundredths / 6000) % 60) +
    ':' +
    pad(Math.floor(hundredths / 100) % 60) +
    '.' +
    pad(hundredths % 100)
  ).replaceAll('0', 'O')
}

export class StopwatchModel {
  state = 0 // stopped, running, paused
  startMs = 0
  accumulated = 0
  laps: number[] = []

  elapsed(now: number): number {
    return this.accumulated + (this.state === 1 ? now - this.startMs : 0)
  }

  start(now: number) {
    if (this.state !== 1) {
      this.startMs = now
      this.state = 1
    }
  }

  pause(now: number) {
    if (this.state === 1) {
      this.accumulated = this.elapsed(now)
      this.state = 2
    }
  }

  reset() {
    this.state = 0
    this.startMs = 0
    this.accumulated = 0
    this.laps = []
  }

  lap(now: number) {
    if (this.state === 1) {
      this.laps.push(this.elapsed(now))
    }
  }
}
export interface AlarmEntry {
  id: number
  hour: number
  minute: number
  enabled: boolean
  lastDate: number
}
export function dateKey(date: Date): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
}

export function alarmDue(alarm: AlarmEntry, date: Date): boolean {
  return (
    alarm.enabled &&
    alarm.hour === date.getHours() &&
    alarm.minute === date.getMinutes() &&
    alarm.lastDate !== dateKey(date)
  )
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28
  }

  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31
}

export function wrap(value: number, count: number): number {
  return ((value % count) + count) % count
}

export function spinTarget(
  current: number,
  sector: number,
  count: number,
  turns: number,
  clockwise: boolean,
  jitter: number,
): number {
  const width = 360 / count
  const safe = Math.min(width * 0.22, 8)
  const angle = wrap((sector + 0.5) * width + jitter * (width / 2 - safe), 360)

  return clockwise
    ? current + turns * 360 + wrap(angle - current, 360)
    : current - turns * 360 - wrap(current - angle, 360)
}

export function wheelColors(count: number): number[] {
  const usage = [0, 0, 0, 0, 0]
  const order: number[] = []

  for (let n = 0; n < count; n++) {
    let best = 0
    let score = -100000

    for (let color = 0; color < 5; color++) {
      if (n > 0 && order[n - 1] === color) {
        continue
      }

      if (n === count - 1 && order[0] === color) {
        continue
      }

      let candidate = -usage[color] * 100

      if (n > 0) {
        const distance = Math.abs(color - order[n - 1])

        candidate += Math.min(distance, 5 - distance) * 10
      }

      if (candidate > score) {
        score = candidate
        best = color
      }
    }

    order.push(best)
    usage[best]++
  }

  return order
}

export function fftReducedBand(bands: number[], group: number): number {
  const emphasisStep = Math.fround(0.35)
  let weighted = Math.fround(0)
  let weights = Math.fround(0)

  for (let local = 0; local < 5; local++) {
    const emphasis = Math.fround(1 - Math.fround(Math.fround(local / 4) * emphasisStep))

    weighted = Math.fround(weighted + Math.fround(Math.fround(bands[group * 5 + local]) * emphasis))
    weights = Math.fround(weights + emphasis)
  }

  return Math.fround(weighted / weights)
}

export function fftSmoothBand(current: number, target: number): number {
  const previous = Math.fround(current)
  const next = Math.fround(Math.max(0, Math.min(1, target)))
  const attack = Math.fround(0.6)
  const release = Math.fround(0.36)
  const coefficient = next > previous ? attack : release

  return Math.fround(previous + Math.fround(Math.fround(next - previous) * coefficient))
}

const fftLobeWidths = new Uint8Array([20, 8, 4, 2])
const fftLobeModulation = new Uint16Array(34)
const fftLobeIndices = new Uint8Array(34)
let fftLobeEntry = 0

for (let group = 0; group < 4; group++) {
  const width = fftLobeWidths[group]

  for (let position = 0; position < width; position++) {
    fftLobeModulation[fftLobeEntry] =
      Math.round(Math.cos((((position * 360) / width + 180) * Math.PI) / 180) * 180) + 180
    fftLobeIndices[fftLobeEntry] = wrap(group * 5 - width / 2 + position, 20)
    fftLobeEntry++
  }
}

export function fillFftBarRadii(reduced: number[], radii: Uint16Array): void {
  radii.fill(82)
  let entry = 0

  for (let group = 0; group < 4; group++) {
    const maximum = Math.fround(74)
    const band = Math.fround(Math.max(0, Math.min(1, reduced[group])))
    const amplitude = Math.trunc(Math.fround(maximum * band)) | 0

    for (let position = 0; position < fftLobeWidths[group]; position++) {
      const index = fftLobeIndices[entry]
      const modulation = fftLobeModulation[entry]

      radii[index] = (radii[index] | 0) + (Math.imul(amplitude, modulation) >> 9)
      entry++
    }
  }
}

export function fftBarRadii(reduced: number[]): number[] {
  const radii = new Uint16Array(20)

  fillFftBarRadii(reduced, radii)

  return Array.from(radii)
}

export function fftBarColor(radius: number): number {
  if (radius < 80) {
    return 0xc19bffff
  }

  if (radius > 156) {
    return 0xff66bcff
  }

  const second = radius > 100
  const mix = Math.trunc(((radius - (second ? 100 : 80)) * 255) / (second ? 56 : 20))
  const red = Math.floor(((second ? 255 : 233) * mix + (second ? 233 : 193) * (255 - mix)) / 255)
  const green = Math.floor(((second ? 102 : 122) * mix + (second ? 122 : 155) * (255 - mix)) / 255)
  const blue = Math.floor(((second ? 188 : 224) * mix + (second ? 224 : 255) * (255 - mix)) / 255)

  return ((red << 24) | (green << 16) | (blue << 8) | 255) >>> 0
}

export function factoryUnwrapAngle(previous: number, next: number): number {
  const fullTurn = Math.fround(360)
  const last = Math.fround(previous)
  let previousAngle = Math.fround(last % fullTurn)

  if (previousAngle < 0) {
    previousAngle = Math.fround(previousAngle + fullTurn)
  }

  let delta = Math.fround(Math.fround(Math.fround(next) - previousAngle) % fullTurn)

  if (delta < -180) {
    delta = Math.fround(delta + fullTurn)
  } else if (delta > 180) {
    delta = Math.fround(delta - fullTurn)
  }

  return Math.fround(last + delta)
}
