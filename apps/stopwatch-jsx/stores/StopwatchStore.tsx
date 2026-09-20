import { Store } from '@geastack/core'

export class StopwatchStore extends Store {
  running = 0
  startMs = -1
  baseElapsedMs = 0
  elapsedMs = 0
  lapCount = 0
  timeText = '00:00.00'
  status = ''
  lap1 = '--:--.--'
  lap2 = '--:--.--'
  lap3 = '--:--.--'
  lap4 = '--:--.--'
  lap5 = '--:--.--'

  init() {
    this.reset()
  }

  start() {
    if (this.running) return
    this.running = 1
    this.startMs = -1
    this.status = 'Running'
  }

  pause() {
    if (!this.running) return
    this.baseElapsedMs = this.elapsedMs
    this.running = 0
    this.startMs = -1
    this.status = 'Paused'
  }

  toggle() {
    if (this.running) this.pause()
    else this.start()
  }

  reset() {
    this.running = 0
    this.startMs = -1
    this.baseElapsedMs = 0
    this.elapsedMs = 0
    this.lapCount = 0
    this.timeText = '00:00.00'
    this.status = 'Ready'
    this.lap1 = '--:--.--'
    this.lap2 = '--:--.--'
    this.lap3 = '--:--.--'
    this.lap4 = '--:--.--'
    this.lap5 = '--:--.--'
  }

  lap() {
    if (!this.running && this.elapsedMs == 0) return
    this.lapCount = this.lapCount + 1
    if (this.lapCount > 5) this.lapCount = 5
    if (this.lapCount == 1) this.lap1 = this.timeText
    else if (this.lapCount == 2) this.lap2 = this.timeText
    else if (this.lapCount == 3) this.lap3 = this.timeText
    else if (this.lapCount == 4) this.lap4 = this.timeText
    else if (this.lapCount == 5) this.lap5 = this.timeText
    this.status = 'Lap saved'
  }

  tick(timestampMs: number) {
    if (!this.running) return
    if (this.startMs < 0) this.startMs = timestampMs
    this.elapsedMs = this.baseElapsedMs + timestampMs - this.startMs
    this.updateTimeText()
  }

  updateTimeText() {
    const totalHundredths = Math.floor(this.elapsedMs / 10)
    const minutes = Math.floor(totalHundredths / 6000) % 100
    const seconds = Math.floor(totalHundredths / 100) % 60
    const hundredths = totalHundredths % 100

    if (minutes < 10 && seconds < 10 && hundredths < 10) this.timeText = '0' + minutes + ':0' + seconds + '.0' + hundredths
    else if (minutes < 10 && seconds < 10) this.timeText = '0' + minutes + ':0' + seconds + '.' + hundredths
    else if (minutes < 10 && hundredths < 10) this.timeText = '0' + minutes + ':' + seconds + '.0' + hundredths
    else if (seconds < 10 && hundredths < 10) this.timeText = minutes + ':0' + seconds + '.0' + hundredths
    else if (minutes < 10) this.timeText = '0' + minutes + ':' + seconds + '.' + hundredths
    else if (seconds < 10) this.timeText = minutes + ':0' + seconds + '.' + hundredths
    else if (hundredths < 10) this.timeText = minutes + ':' + seconds + '.0' + hundredths
    else this.timeText = minutes + ':' + seconds + '.' + hundredths
  }
}

export const stopwatch = new StopwatchStore()
