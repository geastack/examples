import { audioContext } from '@geastack/core'

export function playTone(soundsEnabled: number, frequency: number, durationMs: number) {
  if (!soundsEnabled) return
  const oscillator = audioContext.createOscillator()
  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  oscillator.connect(audioContext.destination)
  const start = audioContext.currentTime
  oscillator.start(start)
  oscillator.stop(start + durationMs / 1000)
}
