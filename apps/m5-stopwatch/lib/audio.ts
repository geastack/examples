import { Audio as AudioController } from '@geastack/core'
import type {
  AudioWorkletNode,
  MediaStreamAudioSourceNode,
  AudioBufferSourceNode,
} from '@geastack/core'
import bootSoundUrl from '../assets/boot-sfx.wav'

const audioContext = new AudioContext({ sampleRate: 44100 })
let toneSource: AudioBufferSourceNode | null = null
let spectrumNode: AudioWorkletNode | null = null
let microphoneSource: MediaStreamAudioSourceNode | null = null
let microphoneStream = new MediaStream()
let captureGeneration = 0
let captureEnabled = false
let peakFrequency = 0
const bands = new Float32Array(20)

export function factoryToneSamples(
  frequency: number,
  durationMs: number,
  volumeScale = 0.5,
): Float32Array {
  const rate = Math.fround(44100)
  const duration = Math.fround(durationMs / 1000)
  const count = Math.max(0, Math.trunc(Math.fround(rate * duration)))
  const samples = new Float32Array(count)
  const turn = Math.fround(Math.fround(2) * Math.fround(Math.PI))
  const step = Math.fround(Math.fround(turn * Math.fround(Math.trunc(frequency))) / rate)
  const amplitude = Math.fround(Math.fround(32767 / 5) * Math.fround(Math.max(0, volumeScale)))
  let phase = Math.fround(0)

  for (let index = 0; index < count; index++) {
    let gain = amplitude

    if (index >= count - 200) {
      gain = Math.fround(gain * Math.fround((count - index) / 200))
    }

    const pcm = Math.trunc(Math.fround(gain * Math.fround(Math.sin(phase))))

    samples[index] = pcm / 32768
    phase = Math.fround(phase + step)

    if (phase > turn) {
      phase = Math.fround(phase - turn)
    }
  }

  return samples
}

export function tone(frequency: number, durationMs: number): void {
  if (frequency > 0 && AudioController.getVolume() <= 0) {
    return
  }

  if (toneSource !== null) {
    toneSource.stop()
  }

  if (frequency <= 0 || durationMs <= 0) {
    toneSource = null

    return
  }

  const samples = factoryToneSamples(frequency, durationMs)
  const buffer = audioContext.createBuffer(1, samples.length, 44100)
  const next = audioContext.createBufferSource()

  buffer.copyToChannel(samples, 0)
  next.buffer = buffer
  next.connect(audioContext.destination)
  next.start()
  toneSource = next
}

export function bootSound(): void {
  const sound = new Audio(bootSoundUrl)

  sound.play()
}

export function spectrum(index: number): number {
  return bands[index]
}

export function peak(): number {
  return peakFrequency
}

export async function microphone(enabled: boolean): Promise<void> {
  captureEnabled = enabled
  const generation = ++captureGeneration

  if (!enabled) {
    if (microphoneSource !== null) {
      microphoneSource.disconnect()
    }

    if (spectrumNode !== null) {
      spectrumNode.disconnect()
    }

    for (const track of microphoneStream.getTracks()) {
      track.stop()
    }

    microphoneSource = null

    return
  }

  if (spectrumNode === null) {
    await audioContext.audioWorklet.addModule(new URL('../worklets/spectrum.ts', import.meta.url))
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { sampleRate: audioContext.sampleRate, channelCount: 1, echoCancellation: false },
  })

  if (!captureEnabled || generation !== captureGeneration) {
    for (const track of stream.getTracks()) {
      track.stop()
    }

    return
  }

  let node = spectrumNode

  if (node === null) {
    node = new AudioWorkletNode(audioContext, 'm5-spectrum', {
      numberOfInputs: 1,
      numberOfOutputs: 0,
      channelCount: 1,
    })

    node.port.onmessage = (event) => {
      if (typeof event.data === 'string') {
        return
      }

      const frame = new Float32Array(event.data)

      if (frame.length !== 21) {
        return
      }

      for (let index = 0; index < 20; index++) {
        bands[index] = frame[index]
      }

      peakFrequency = frame[20]
    }

    spectrumNode = node
  }

  const source = audioContext.createMediaStreamSource(stream)

  source.connect(node)
  microphoneStream = stream
  microphoneSource = source
  spectrumNode = node
}
