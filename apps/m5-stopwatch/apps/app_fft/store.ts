import { Store } from '@geastack/core'
import { fftReducedBand, fftSmoothBand, wrap } from '../../lib/model'
import { microphone, peak, spectrum } from '../../lib/audio'

export class FftStore extends Store {
  fftLabels = true
  bands: number[] = []
  fftReduced = [0, 0, 0, 0]
  fftRevision = 0
  fftDiscSize = 137
  peakHz = '0'
  fftBlend = 0
  fftOffset = 0
  fftRotation = 0
  fftHits = 0
  fftCooldown = 0
  fftScale = 1

  init() {
    for (let n = 0; n < 20; n++) {
      this.bands.push(0)
    }
  }

  enter(): Promise<void> {
    this.fftLabels = true
    this.bands.fill(0)
    this.fftReduced.fill(0)
    this.fftRevision++
    this.fftDiscSize = 137
    this.fftScale = 1
    this.fftBlend = 0
    this.fftOffset = 0
    this.fftRotation = 0
    this.fftHits = 0
    this.fftCooldown = 0

    return microphone(true)
  }

  tapScreen() {
    this.fftLabels = !this.fftLabels
  }

  tick() {
    let changed = false

    for (let n = 0; n < 20; n++) {
      const target = spectrum(n)

      const current = Math.fround(this.bands[n])
      const smoothed = Math.fround(fftSmoothBand(current, target))

      if (Math.abs(Math.fround(smoothed - current)) > Math.fround(0.0015)) {
        changed = true
      }

      this.bands[n] = smoothed
    }

    if (changed) {
      this.fftRevision++
    }

    for (let group = 0; group < 4; group++) {
      this.fftReduced[group] = fftReducedBand(this.bands, group)
    }

    this.peakHz = peak().toFixed(0)

    this.fftBlend = Math.fround(Math.fround(this.fftBlend) + Math.fround(0.035))

    if (this.fftBlend >= 1) {
      this.fftBlend = Math.fround(this.fftBlend - 1)
      this.fftOffset = wrap(this.fftOffset + 1, 10)
    }

    const bass = this.fftReduced[0]

    if (this.fftCooldown > 0) {
      this.fftCooldown--
    }

    if (bass > Math.fround(0.84) && this.fftCooldown === 0) {
      this.fftHits++
      this.fftCooldown = 14
      if (this.fftHits >= 3) {
        this.fftHits = 0
        this.fftOffset = wrap(this.fftOffset + 1, 10)
      }
    }

    if (bass < Math.fround(0.12)) {
      this.fftRotation = wrap(this.fftRotation + 1, 20)
    }

    const pulse = Math.max(
      0,
      Math.min(
        Math.fround(0.1),
        Math.fround(
          Math.fround(this.fftReduced[0] * Math.fround(0.08)) +
            Math.fround(this.fftReduced[1] * Math.fround(0.025)),
        ),
      ),
    )

    this.fftScale = Math.fround(
      this.fftScale +
        Math.fround(Math.fround(Math.fround(1 + pulse) - this.fftScale) * Math.fround(0.4)),
    )

    this.fftDiscSize = Math.round(Math.fround(137 * this.fftScale))
  }
}

export const fft = new FftStore()
