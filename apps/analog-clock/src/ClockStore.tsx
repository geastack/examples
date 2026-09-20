import { Store } from '@geastack/core'

export class ClockStore extends Store {
  startMs = -1
  secondAngle = 0
  minuteAngle = 600
  hourAngle = 3050
  timeText = '10:10:00'
  displaySecond = -1

  init() {
    this.startMs = -1
    this.displaySecond = -1
    this.updateHands(0)
  }

  tick(timestampMs: number) {
    if (this.startMs < 0) this.startMs = timestampMs
    this.updateHands(timestampMs - this.startMs)
  }

  updateHands(elapsedMs: number) {
    const secondMs = elapsedMs % 60000
    const minuteMs = (600000 + elapsedMs) % 3600000
    const hourMs = (36600000 + elapsedMs) % 43200000

    this.secondAngle = (secondMs * 3600) / 60000
    this.minuteAngle = minuteMs / 1000
    this.hourAngle = hourMs / 12000

    const totalSeconds = Math.floor(elapsedMs / 1000)
    if (totalSeconds == this.displaySecond) return
    this.displaySecond = totalSeconds

    const hourRaw = 10 + Math.floor(totalSeconds / 3600)
    const hour12 = hourRaw % 12
    const displayHour = hour12 == 0 ? 12 : hour12
    const minute = (10 + Math.floor(totalSeconds / 60)) % 60
    const second = totalSeconds % 60

    if (minute < 10 && second < 10) this.timeText = displayHour + ':0' + minute + ':0' + second
    else if (minute < 10) this.timeText = displayHour + ':0' + minute + ':' + second
    else if (second < 10) this.timeText = displayHour + ':' + minute + ':0' + second
    else this.timeText = displayHour + ':' + minute + ':' + second
  }
}

export const analogClock = new ClockStore()
