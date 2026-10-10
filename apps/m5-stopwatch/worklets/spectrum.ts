// MIT. Factory FFT behavior, running as compiled TypeScript on the audio engine.
class SpectrumProcessor extends AudioWorkletProcessor {
  samples = new Float32Array(512)
  real = new Float32Array(512)
  imaginary = new Float32Array(512)
  window = new Float32Array(512)
  cosine = new Float32Array(256)
  sine = new Float32Array(256)
  power = new Float32Array(256)
  reversed = new Uint16Array(512)
  bandStart = new Uint16Array(20)
  bandEnd = new Uint16Array(20)
  noiseFloor = new Float32Array(20)
  rawBands = new Float32Array(20)
  smoothedBands = new Float32Array(20)
  lowEmphasis = new Float32Array(20)
  bandInverseCounts = new Float32Array(20)
  normalizationLevel = Math.fround(0.03)
  position = 0
  total = 0
  hop = 0
  publicationPhase = 0
  publicationStarted = false
  peakFrequency = 0

  constructor() {
    super()
    for (let index = 0; index < 512; index++) {
      this.window[index] = 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / 511)

      let value = index
      let reversed = 0

      for (let bit = 0; bit < 9; bit++) {
        reversed = (reversed << 1) | (value & 1)
        value >>= 1
      }

      this.reversed[index] = reversed
    }

    for (let index = 0; index < 256; index++) {
      this.cosine[index] = Math.cos((-2 * Math.PI * index) / 512)
      this.sine[index] = Math.sin((-2 * Math.PI * index) / 512)
    }

    const logMin = Math.log10(sampleRate / 512)
    const logMax = Math.log10(sampleRate * 0.5)
    let previous = 1

    for (let band = 0; band < 20; band++) {
      this.bandStart[band] = previous

      const next = band + 1
      const edge = Math.round(
        (Math.pow(10, logMin + ((logMax - logMin) * next) / 20) * 512) / sampleRate,
      )

      previous = next === 20 ? 256 : Math.max(previous + 1, Math.min(256 - (20 - next), edge))
      this.bandEnd[band] = previous
      this.bandInverseCounts[band] = Math.fround(1 / (previous - this.bandStart[band]))
      this.lowEmphasis[band] = Math.fround(1.12 - Math.fround((0.22 * band) / 19))
    }
  }

  process(inputs: Float32Array[][], _outputs: Float32Array[][]): boolean {
    if (inputs.length === 0 || inputs[0].length === 0) {
      return true
    }

    const input = inputs[0][0]
    const samples = this.samples
    let position = this.position | 0
    let total = this.total | 0
    let hop = this.hop | 0

    for (let index = 0; index < input.length; index++) {
      samples[position] = input[index]
      position = (position + 1) & 511
      if (total < 512) {
        total = (total + 1) | 0
      }

      hop = (hop + 1) | 0
      if (total >= 512 && hop >= 256) {
        hop = 0
        this.position = position
        this.publish()
      }
    }

    this.position = position
    this.total = total
    this.hop = hop

    return true
  }

  publish(): void {
    const ZERO = Math.fround(0)
    const ONE = Math.fround(1)
    const RMS_WEIGHT = Math.fround(0.48)
    const PEAK_WEIGHT = Math.fround(0.52)
    const FLOOR_FALL = Math.fround(0.45)
    const FLOOR_RISE = Math.fround(0.004)
    const FLOOR_GAIN = Math.fround(2.2)
    const FLOOR_OFFSET = Math.fround(0.0018)
    const REFERENCE_FIRST = Math.fround(0.8)
    const REFERENCE_SECOND = Math.fround(0.14)
    const REFERENCE_THIRD = Math.fround(0.06)
    const MIN_NORMALIZATION = Math.fround(0.0015)
    const NORMALIZATION_ATTACK = Math.fround(0.44)
    const NORMALIZATION_DECAY = Math.fround(0.16)
    const BAND_EXPONENT = Math.fround(0.55)
    const BAND_THRESHOLD = Math.fround(0.035)
    const BAND_ATTACK = Math.fround(0.82)
    const BAND_DECAY = Math.fround(0.4)
    const POWER_SCALE = Math.fround(1 / 65536)
    const TWO = Math.fround(2)
    const HALF = Math.fround(0.5)
    const NEGATIVE_HALF = Math.fround(-0.5)
    const WINDOW_INVERSE = Math.fround(1 / 512)

    const samples = this.samples
    const position = this.position | 0
    const reals = this.real
    const imaginaries = this.imaginary
    const window = this.window
    const cosine = this.cosine
    const sine = this.sine
    const powers = this.power
    const reversed = this.reversed
    const bandStart = this.bandStart
    const bandEnd = this.bandEnd
    const noiseFloor = this.noiseFloor
    const rawBands = this.rawBands
    const smoothedBands = this.smoothedBands
    const lowEmphasis = this.lowEmphasis
    const bandInverseCounts = this.bandInverseCounts
    const sampleRateF32 = Math.fround(sampleRate)

    let mean = ZERO

    for (let index = 0; index < 512; index++) {
      mean = Math.fround(mean + samples[index])
    }

    mean = Math.fround(mean * WINDOW_INVERSE)
    for (let index = 0; index < 512; index++) {
      const centered = Math.fround(samples[(position + index) & 511] - mean)

      reals[reversed[index] & 511] = Math.fround(centered * window[index])
      imaginaries[index] = 0
    }

    // The first FFT stage has real inputs and a unit twiddle. Compute it
    // directly before the complex stages instead of multiplying by zero.
    for (let index = 0; index < 512; index += 2) {
      const a = reals[index & 511]
      const b = reals[(index + 1) & 511]

      reals[index & 511] = Math.fround(a + b)
      reals[(index + 1) & 511] = Math.fround(a - b)
    }

    for (let length = 4, twiddleShift = 7; length <= 512; length <<= 1, twiddleShift--) {
      const half = length >> 1

      const halfMask = half - 1

      // Enumerate each stage's butterflies in block order. Constant masks
      // expose one bounded array window per stage to the native compiler.
      for (let butterfly = 0; butterfly < 256; butterfly++) {
        const a = ((butterfly & -half) << 1) | (butterfly & halfMask)
        const b = a | half
        const aReal = reals[a & 511]
        const aImaginary = imaginaries[a & 511]
        const bReal = reals[b & 511]
        const bImaginary = imaginaries[b & 511]
        const c = cosine[((butterfly & halfMask) << twiddleShift) & 255]
        const s = sine[((butterfly & halfMask) << twiddleShift) & 255]
        const real = Math.fround(Math.fround(bReal * c) - Math.fround(bImaginary * s))
        const imaginary = Math.fround(Math.fround(bReal * s) + Math.fround(bImaginary * c))

        reals[b & 511] = Math.fround(aReal - real)
        imaginaries[b & 511] = Math.fround(aImaginary - imaginary)
        reals[a & 511] = Math.fround(aReal + real)
        imaginaries[a & 511] = Math.fround(aImaginary + imaginary)
      }
    }

    let best = ZERO
    let bestMagnitude = ZERO
    let bestBin = 0

    for (let index = 1; index < 256; index++) {
      const real = reals[index]
      const imaginary = imaginaries[index]
      const power = Math.fround(
        Math.fround(Math.fround(real * real) + Math.fround(imaginary * imaginary)) * POWER_SCALE,
      )

      powers[index] = power

      if (power > best) {
        const magnitude = Math.fround(Math.sqrt(power))

        if (magnitude > bestMagnitude) {
          best = power
          bestMagnitude = magnitude
          bestBin = index
        }
      }
    }

    let top1 = ZERO
    let top2 = ZERO
    let top3 = ZERO

    for (let band = 0; band < 20; band++) {
      const start = bandStart[band]
      const end = bandEnd[band]
      let energy = ZERO
      let peakPower = ZERO

      for (let index = start; index < end; index++) {
        const power = powers[index]

        energy = Math.fround(energy + power)
        if (power > peakPower) {
          peakPower = power
        }
      }

      const rms = Math.fround(Math.sqrt(Math.fround(energy * bandInverseCounts[band])))
      const peak = Math.fround(Math.sqrt(peakPower))
      let raw = Math.fround(Math.fround(rms * RMS_WEIGHT) + Math.fround(peak * PEAK_WEIGHT))

      raw = Math.fround(raw * lowEmphasis[band])

      const floorAlpha = raw < noiseFloor[band] ? FLOOR_FALL : FLOOR_RISE

      noiseFloor[band] = Math.fround(
        noiseFloor[band] + Math.fround(Math.fround(raw - noiseFloor[band]) * floorAlpha),
      )
      raw = Math.fround(
        raw - Math.fround(Math.fround(noiseFloor[band] * FLOOR_GAIN) + FLOOR_OFFSET),
      )
      if (raw < ZERO) {
        raw = ZERO
      }

      rawBands[band] = raw

      if (raw >= top1) {
        top3 = top2
        top2 = top1
        top1 = raw
      } else if (raw >= top2) {
        top3 = top2
        top2 = raw
      } else if (raw > top3) {
        top3 = raw
      }
    }

    const weightedReference = Math.fround(
      Math.fround(Math.fround(top1 * REFERENCE_FIRST) + Math.fround(top2 * REFERENCE_SECOND)) +
        Math.fround(top3 * REFERENCE_THIRD),
    )
    const reference = weightedReference > MIN_NORMALIZATION ? weightedReference : MIN_NORMALIZATION
    let normalizationLevel = Math.fround(this.normalizationLevel)
    const normAlpha = reference > normalizationLevel ? NORMALIZATION_ATTACK : NORMALIZATION_DECAY

    normalizationLevel = Math.fround(
      normalizationLevel + Math.fround(Math.fround(reference - normalizationLevel) * normAlpha),
    )
    if (normalizationLevel < MIN_NORMALIZATION) {
      normalizationLevel = MIN_NORMALIZATION
    } else if (normalizationLevel > ONE) {
      normalizationLevel = ONE
    }

    this.normalizationLevel = normalizationLevel

    let fractional = Math.fround(bestBin)

    if (bestBin > 1 && bestBin < 255) {
      const leftReal = reals[bestBin - 1]
      const leftImaginary = imaginaries[bestBin - 1]
      const rightReal = reals[bestBin + 1]
      const rightImaginary = imaginaries[bestBin + 1]
      const leftPower = Math.fround(
        Math.fround(leftReal * leftReal) + Math.fround(leftImaginary * leftImaginary),
      )
      const rightPower = Math.fround(
        Math.fround(rightReal * rightReal) + Math.fround(rightImaginary * rightImaginary),
      )
      // Preserve the factory's mixed units: the center magnitude is normalized,
      // but its neighboring FFT powers are raw. This intentionally affects the
      // reported peak frequency; consistent units would be a behavior change.
      const centerPower = Math.fround(bestMagnitude * bestMagnitude)
      const denominator = Math.fround(
        Math.fround(leftPower - Math.fround(TWO * centerPower)) + rightPower,
      )

      if (Math.abs(denominator) > 1e-9) {
        const offset = Math.fround(
          Math.fround(HALF * Math.fround(leftPower - rightPower)) / denominator,
        )

        const bounded = offset < NEGATIVE_HALF ? NEGATIVE_HALF : offset > HALF ? HALF : offset

        fractional = Math.fround(fractional + bounded)
      }
    }

    for (let band = 0; band < 20; band++) {
      const ratio = Math.fround(rawBands[band] / normalizationLevel)
      let normalized = Math.fround(Math.pow(ratio, BAND_EXPONENT))

      if (normalized > ONE) {
        normalized = ONE
      }

      if (normalized < BAND_THRESHOLD) {
        normalized = ZERO
      }

      const smoothAlpha = normalized > smoothedBands[band] ? BAND_ATTACK : BAND_DECAY

      smoothedBands[band] = Math.fround(
        smoothedBands[band] +
          Math.fround(Math.fround(normalized - smoothedBands[band]) * smoothAlpha),
      )
    }

    this.peakFrequency =
      best > ZERO ? Math.fround(Math.fround(fractional * sampleRateF32) * WINDOW_INVERSE) : ZERO

    // Keep every factory FFT/noise/AGC update above. The UI reads the latest
    // result at 60 Hz; only allocating and transferring that result is paced.
    if (this.publicationStarted) {
      const rate = sampleRate | 0
      const phase = ((this.publicationPhase | 0) + 256 * 60) | 0

      this.publicationPhase = phase
      if (phase < rate) {
        return
      }

      // At rates below 60 FFTs/sec every transform is published, and the
      // remainder stays bounded instead of accumulating missed UI deadlines.
      this.publicationPhase = (phase % rate) | 0
    } else {
      this.publicationStarted = true
    }

    const frame = new Float32Array(21)

    for (let band = 0; band < 20; band++) {
      frame[band] = smoothedBands[band]
    }

    frame[20] = this.peakFrequency
    this.port.postMessage(frame.buffer, [frame.buffer])
  }
}

registerProcessor('m5-spectrum', SpectrumProcessor)
