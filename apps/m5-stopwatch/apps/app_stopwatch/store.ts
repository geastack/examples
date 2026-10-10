import { Profiler, Store } from '@geastack/core'
import { elapsedText } from '../../lib/model'
import { FactorySpring } from '../app_watch_face/view/animation'

const swLeftPress = new FactorySpring(0.3, 0.5)
const swRightPress = new FactorySpring(0.3, 0.5)

export class StopwatchStore extends Store {
  swLeftX = 0
  swLeftY = 0
  swRightX = 0
  swRightY = 0
  swState = 0
  swStart = 0
  swAccumulated = 0
  elapsed = 'OO:OO:OO.OO'
  laps: { id: number; text: string }[] = []

  right() {
    const timestamp = Profiler.nowUs() / 1000

    if (this.swState === 1) {
      this.swAccumulated += timestamp - this.swStart
      this.swState = 2
      this.elapsed = elapsedText(this.swAccumulated)
    } else {
      this.swStart = timestamp
      this.swState = 1
    }
  }

  left() {
    if (this.swState === 1) {
      this.laps.unshift({
        id: this.laps.length + 1,
        text: elapsedText(this.swAccumulated + Profiler.nowUs() / 1000 - this.swStart),
      })
    } else if (this.swState === 2) {
      this.swAccumulated = 0
      this.swState = 0
      this.laps = []
      this.elapsed = 'OO:OO:OO.OO'
    }
  }

  enter(timestamp: number) {
    swLeftPress.teleport(0, timestamp)
    swRightPress.teleport(0, timestamp)
    this.swLeftX = 0
    this.swLeftY = 0
    this.swRightX = 0
    this.swRightY = 0
  }

  reset() {
    this.swState = 0
    this.swAccumulated = 0
    this.laps = []
    this.elapsed = 'OO:OO:OO.OO'
  }

  press(code: number, pressed: boolean, timestamp: number) {
    if (code === 37) {
      swLeftPress.move(pressed ? 1 : 0, timestamp)
      if (pressed) {
        this.left()
      }
    } else {
      swRightPress.move(pressed ? 1 : 0, timestamp)
      if (pressed) {
        this.right()
      }
    }
  }

  tick(timestamp: number, active: boolean) {
    if (active) {
      const left = swLeftPress.update(timestamp)

      const right = swRightPress.update(timestamp)

      this.swLeftX = left * 8

      this.swLeftY = left * 8

      this.swRightX = right * -8

      this.swRightY = right * 8
    }

    if (this.swState === 1) {
      this.elapsed = elapsedText(this.swAccumulated + Profiler.nowUs() / 1000 - this.swStart)
    }
  }
}

export const stopwatch = new StopwatchStore()
