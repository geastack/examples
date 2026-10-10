import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

function processor(rate = 16000, publishEveryFft = true) {
  let Processor
  const frames = []
  const source = ts.transpileModule(
    fs.readFileSync(new URL('../worklets/spectrum.ts', import.meta.url), 'utf8'),
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } },
  ).outputText

  vm.runInNewContext(source, {
    AudioWorkletProcessor: class {
      port = { postMessage: (buffer) => frames.push(new Float32Array(buffer)) }
    },
    Float32Array,
    Uint16Array,
    Math,
    sampleRate: rate,
    registerProcessor: (name, ctor) => {
      assert.equal(name, 'm5-spectrum')
      Processor = ctor
    },
  })

  const instance = new Processor()

  if (publishEveryFft) {
    // Numerical factory tests inspect every DSP result. Force only the UI
    // publication decision; the production transform and state updates run.
    const publish = instance.publish.bind(instance)

    instance.publish = () => {
      instance.publicationStarted = false
      publish()
    }
  }

  return { instance, frames }
}

test('microphone worklet measures a 1 kHz tone and publishes normalized bands', () => {
  const { instance, frames } = processor()

  for (let block = 0; block < 12; block++) {
    const input = Float32Array.from(
      { length: 128 },
      (_, index) => 0.5 * Math.sin((2 * Math.PI * 1000 * (block * 128 + index)) / 16000),
    )

    assert.equal(instance.process([[input]], [[new Float32Array(128)]]), true)
  }

  assert.equal(frames.length, 5)
  for (const frame of frames) {
    assert.equal(frame.length, 21)
    assert.ok(Math.abs(frame[20] - 1000) < 1)
    assert.ok(frame.slice(0, 20).every((value) => value >= 0 && value <= 1))
    assert.ok(Math.max(...frame.slice(0, 20)) > 0.8)
  }
})

test('microphone worklet removes DC and keeps silence silent', () => {
  const { instance, frames } = processor()

  for (let block = 0; block < 4; block++) {
    instance.process([[new Float32Array(128).fill(0.25)]], [])
  }

  assert.equal(frames.length, 1)
  assert.ok(frames[0].every((value) => value === 0))
})

function feed(instance, rate, frequency, amplitude, blocks, offset = 0) {
  for (let block = 0; block < blocks; block++) {
    const input = Float32Array.from(
      { length: 128 },
      (_, index) =>
        amplitude * Math.sin((2 * Math.PI * frequency * (offset + block * 128 + index)) / rate),
    )

    instance.process([[input]], [])
  }
}

test('factory logarithmic band boundaries remain contiguous at both microphone rates', () => {
  const edges = [1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 16, 21, 28, 37, 49, 64, 84, 111, 147, 194, 256]

  for (const rate of [16000, 44100]) {
    const { instance, frames } = processor(rate)

    assert.deepEqual(Array.from(instance.bandStart), edges.slice(0, -1))
    assert.deepEqual(Array.from(instance.bandEnd), edges.slice(1))
    feed(instance, rate, (rate * 32) / 512, 0.5, 8)
    assert.equal(frames.length, 3)
    assert.ok(Math.abs(frames[2][20] - (rate * 32) / 512) < 0.1)
    assert.ok(Math.abs(Math.max(...frames[0].slice(0, 20)) - 0.82) < 1e-6)
    assert.ok(Math.abs(Math.max(...frames[1].slice(0, 20)) - 0.9676) < 1e-6)
  }
})

test('factory attack and decay follow the microphone signal while removing learned stationary noise', () => {
  const { instance, frames } = processor()

  feed(instance, 16000, 1000, 0.5, 16)

  const toneBand = Array.from(frames.at(-1).slice(0, 20)).indexOf(
    Math.max(...frames.at(-1).slice(0, 20)),
  )
  const floorBeforeSilence = instance.noiseFloor[toneBand]

  feed(instance, 16000, 1000, 0, 8, 2048)

  const last = frames.at(-1)
  const previous = frames.at(-2)

  assert.equal(last[20], 0)
  assert.ok(Math.abs(last[toneBand] - previous[toneBand] * 0.6) < 1e-6)
  assert.ok(instance.noiseFloor[toneBand] < floorBeforeSilence * 0.2)
  assert.ok(instance.normalizationLevel >= 0.0015 && instance.normalizationLevel <= 1)

  const steady = processor()

  feed(steady.instance, 16000, 1000, 0.5, 600)
  assert.ok(Math.max(...steady.frames[0].slice(0, 20)) > 0.8)
  assert.ok(Math.max(...steady.frames.at(-1).slice(0, 20)) < 0.001)
})

test('44.1 kHz microphone retains frequencies above the 16 kHz capture Nyquist limit', () => {
  const { instance, frames } = processor(44100)
  const frequency = (44100 * 140) / 512

  feed(instance, 44100, frequency, 0.5, 12)
  assert.ok(Math.abs(frames.at(-1)[20] - frequency) < 0.1)
  assert.ok(Math.max(...frames.at(-1).slice(0, 20)) > 0.9)
})

test('flattened FFT matches an independent direct transform of a broadband microphone window', () => {
  const { instance, frames } = processor(44100)
  const input = Float32Array.from(
    { length: 512 },
    (_, index) =>
      0.1 +
      0.31 * Math.sin((2 * Math.PI * 37 * index) / 512) +
      0.17 * Math.cos((2 * Math.PI * 83 * index) / 512) +
      (((index * 29) % 41) - 20) / 2000,
  )
  let mean = 0

  for (const value of input) {
    mean = Math.fround(mean + value)
  }

  mean = Math.fround(mean / 512)

  const window = Float32Array.from(input, (value, index) =>
    Math.fround(
      Math.fround(value - mean) * Math.fround(0.5 - 0.5 * Math.cos((2 * Math.PI * index) / 511)),
    ),
  )

  for (let offset = 0; offset < 512; offset += 128) {
    instance.process([[input.subarray(offset, offset + 128)]], [])
  }

  assert.equal(frames.length, 1)
  for (let bin = 1; bin < 256; bin++) {
    let real = 0
    let imaginary = 0

    for (let index = 0; index < 512; index++) {
      const angle = (-2 * Math.PI * bin * index) / 512

      real += window[index] * Math.cos(angle)
      imaginary += window[index] * Math.sin(angle)
    }

    assert.ok(Math.abs(instance.real[bin] - real) < 0.0001, `real bin ${bin}`)
    assert.ok(Math.abs(instance.imaginary[bin] - imaginary) < 0.0001, `imaginary bin ${bin}`)
  }
})

function feedSamples(instance, samples, chunks = [128]) {
  let offset = 0
  let chunk = 0

  while (offset < samples.length) {
    const count = Math.min(chunks[chunk % chunks.length], samples.length - offset)

    instance.process([[samples.subarray(offset, offset + count)]], [])
    offset += count
    chunk++
  }
}

test('UI publication starts at the first ready window and stays near 60 Hz at both capture rates', () => {
  for (const rate of [16000, 44100]) {
    const { instance, frames } = processor(rate, false)

    feedSamples(instance, new Float32Array(511))
    assert.equal(frames.length, 0)
    feedSamples(instance, new Float32Array(1))
    assert.equal(frames.length, 1)

    let previous = frames.length

    for (let second = 0; second < 10; second++) {
      feedSamples(instance, new Float32Array(rate))

      const published = frames.length - previous

      assert.ok(Math.abs(published - 60) <= 1, `${rate} Hz second ${second}: ${published}`)
      previous = frames.length
      assert.ok(instance.publicationPhase >= 0 && instance.publicationPhase < rate)
    }

    assert.ok(Math.abs(frames.length - 1 - 600) <= 1)
  }
})

test('publication pacing keeps every FFT state update bitwise identical to the unrestricted baseline', () => {
  for (const rate of [16000, 44100]) {
    const limited = processor(rate, false)
    const baseline = processor(rate, true)

    for (let block = 0; block < 320; block++) {
      const amplitude = block < 80 ? 0.45 : block < 120 ? 0 : block < 240 ? 0.08 : 0.6
      const frequency = block < 160 ? 1000 : 3000
      const input = Float32Array.from(
        { length: 128 },
        (_, index) =>
          0.2 + amplitude * Math.sin((2 * Math.PI * frequency * (block * 128 + index)) / rate),
      )

      limited.instance.process([[input]], [])
      baseline.instance.process([[input]], [])
      for (const field of [
        'samples',
        'real',
        'imaginary',
        'power',
        'noiseFloor',
        'rawBands',
        'smoothedBands',
      ]) {
        assert.deepEqual(
          Buffer.from(limited.instance[field].buffer),
          Buffer.from(baseline.instance[field].buffer),
          `${rate} Hz block ${block}, ${field}`,
        )
      }

      assert.equal(limited.instance.normalizationLevel, baseline.instance.normalizationLevel)
      assert.equal(limited.instance.peakFrequency, baseline.instance.peakFrequency)
    }

    assert.ok(limited.frames.length < baseline.frames.length)
    assert.deepEqual(Array.from(limited.frames[0]), Array.from(baseline.frames[0]))
  }
})

test('latest-spectrum publication is invariant to microphone chunk partitioning', () => {
  for (const rate of [16000, 44100]) {
    const fixed = processor(rate, false)
    const varying = processor(rate, false)
    const input = Float32Array.from(
      { length: rate * 2 },
      (_, index) => 0.3 * Math.sin((2 * Math.PI * 1377 * index) / rate),
    )

    feedSamples(fixed.instance, input)
    feedSamples(varying.instance, input, [37, 511, 1024, 3, 128])
    assert.deepEqual(
      fixed.frames.map((frame) => Array.from(frame)),
      varying.frames.map((frame) => Array.from(frame)),
    )
    assert.equal(fixed.instance.publicationPhase, varying.instance.publicationPhase)
  }
})

test('capture rates below 60 FFTs per second publish every result without accumulating phase debt', () => {
  const limited = processor(8000, false)
  const baseline = processor(8000, true)
  const input = new Float32Array(8000 * 10)

  feedSamples(limited.instance, input)
  feedSamples(baseline.instance, input)
  assert.equal(limited.frames.length, baseline.frames.length)
  assert.ok(limited.instance.publicationPhase >= 0 && limited.instance.publicationPhase < 8000)
})

function audioModule() {
  const buffers = []
  const sources = []
  const nodes = []
  let modules = 0
  let stoppedTracks = 0
  let volume = 100
  const source = ts.transpileModule(
    fs
      .readFileSync(new URL('../lib/audio.ts', import.meta.url), 'utf8')
      .replace('import.meta.url', '"file:///audio.ts"'),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } },
  ).outputText
  const exports = {}

  vm.runInNewContext(source, {
    exports,
    require: (name) =>
      name === '@geastack/core' ? { Audio: { getVolume: () => volume } } : { default: 'boot.wav' },
    AudioContext: class {
      sampleRate = 44100
      destination = {}
      audioWorklet = { addModule: async () => modules++ }

      createBuffer(channels, length, rate) {
        const data = new Float32Array(length)
        const buffer = { data, channels, rate, copyToChannel: (samples) => data.set(samples) }

        buffers.push(buffer)

        return buffer
      }

      createBufferSource() {
        const source = {
          connect() {},
          start() {},
          stop() {
            this.stopped = true
          },
        }

        sources.push(source)

        return source
      }

      createMediaStreamSource() {
        return {
          connect(node) {
            node.connections++
          },
          disconnect() {},
        }
      }
    },
    AudioWorkletNode: class {
      port = {}
      connections = 0

      constructor() {
        nodes.push(this)
      }

      disconnect() {}
    },
    MediaStream: class {
      getTracks() {
        return []
      }
    },
    navigator: {
      mediaDevices: {
        getUserMedia: async () => ({ getTracks: () => [{ stop: () => stoppedTracks++ }] }),
      },
    },
    Audio: class {
      static getVolume() {
        return volume
      }

      play() {}
    },
    Float32Array,
    Math,
    URL,
  })

  return {
    exports,
    buffers,
    sources,
    nodes,
    modules: () => modules,
    stoppedTracks: () => stoppedTracks,
    setVolume: (next) => {
      volume = next
    },
  }
}

test('factory tone uses quantized 44.1 kHz PCM, default half gain and a 200 sample fade', () => {
  const { exports, buffers, sources } = audioModule()
  const samples = exports.factoryToneSamples(1760, 20)

  assert.equal(samples.length, 882)
  assert.equal(samples[0], 0)
  assert.ok(Math.max(...samples) <= 32767 / 10 / 32768)
  assert.ok(Math.abs(samples[881]) < 0.0006)
  assert.ok(samples.every((value) => Number.isInteger(value * 32768)))
  assert.deepEqual(exports.factoryToneSamples(1864.99, 20), exports.factoryToneSamples(1864, 20))
  exports.tone(1760, 20)
  assert.equal(buffers[0].rate, 44100)
  assert.deepEqual(buffers[0].data, samples)
  exports.tone(880, 70)
  assert.equal(sources[0].stopped, true)
  exports.tone(0, 0)
  assert.equal(sources[1].stopped, true)
})

test('FFT capture reopens with the same worklet and retained spectrum state', async () => {
  const audio = audioModule()

  await audio.exports.microphone(true)
  const frame = new Float32Array(21)

  frame[0] = 0.5
  frame[20] = 440
  audio.nodes[0].port.onmessage({ data: frame.buffer })
  await audio.exports.microphone(false)
  await audio.exports.microphone(true)
  assert.equal(audio.modules(), 1)
  assert.equal(audio.nodes.length, 1)
  assert.equal(audio.nodes[0].connections, 2)
  assert.equal(audio.stoppedTracks(), 1)
  assert.equal(audio.exports.spectrum(0), 0.5)
  assert.equal(audio.exports.peak(), 440)
})

test('muted positive tones preserve the existing PCM while explicit cancellation still stops it', () => {
  const audio = audioModule()

  audio.exports.tone(880, 70)
  audio.setVolume(0)
  audio.exports.tone(1760, 20)
  assert.equal(audio.sources.length, 1)
  assert.equal(audio.sources[0].stopped, undefined)
  audio.exports.tone(0, 0)
  assert.equal(audio.sources[0].stopped, true)
})

test('factory off-bin peak interpolation preserves its normalized-center/raw-neighbor units', () => {
  const rate = 44100
  const { instance, frames } = processor(rate)

  feed(instance, rate, 1000, 0.5, 4)
  const f = Math.fround
  const rawPower = (bin) =>
    f(
      f(instance.real[bin] * instance.real[bin]) +
        f(instance.imaginary[bin] * instance.imaginary[bin]),
    )
  let magnitude = f(0)
  let bin = 0

  for (let index = 1; index < 256; index++) {
    const candidate = f(f(Math.sqrt(rawPower(index))) * f(2 / 512))

    if (candidate > magnitude) {
      magnitude = candidate
      bin = index
    }
  }

  const left = rawPower(bin - 1)
  const right = rawPower(bin + 1)
  const center = f(magnitude * magnitude)
  const denominator = f(f(left - f(2 * center)) + right)
  const adjustment = f(f(0.5 * f(left - right)) / denominator)
  const refined = f(bin + Math.max(-0.5, Math.min(0.5, adjustment)))
  const sourceFrequency = f(f(refined * f(rate)) / f(512))

  assert.equal(frames.length, 1)
  assert.equal(frames[0][20], sourceFrequency)
  // This source-preserving label is knowingly less accurate than the previous
  // consistent-power interpolation. The visual comparison must use the source.
  assert.ok(Math.abs(sourceFrequency - 1000) > 20)
})
