import { Profiler, Store } from '@geastack/core'
import { spinTarget, wheelColors, wrap } from '../../lib/model'

interface WheelLabel {
  id: number
  rotation: string
  color: string
}

export class LuckyWheelStore extends Store {
  options = 2
  wheelReady = false
  wheelLabels: WheelLabel[] = []
  spinning = false
  angle = 0
  spinFrom = 0
  spinTo = 0
  spinAt = 0
  spinDuration = 0
  pointerRotation = 'rotate(0deg)'

  selectOptions() {
    const colorOrder = wheelColors(this.options)
    const colors = ['#028b40', '#2e78a9', '#a87e17', '#85489e', '#b32b54']

    this.wheelLabels = []
    for (let index = 0; index < this.options; index++) {
      const rotation = 180 + Math.floor((360 * (2 * index + 1)) / (2 * this.options))

      this.wheelLabels.push({
        id: index + 1,
        rotation: 'rotate(' + rotation + 'deg)',
        color: colors[colorOrder[index]],
      })
    }

    this.wheelReady = true
    this.angle = 0
    this.pointerRotation = 'rotate(0deg)'
  }

  spin(clockwise: boolean) {
    if (this.spinning) {
      return
    }

    this.spinning = true
    this.spinFrom = this.angle
    this.spinAt = Profiler.nowUs() / 1000
    this.spinDuration = 2400 + Math.floor(Math.random() * 1201)
    this.spinTo = spinTarget(
      this.angle,
      Math.floor(Math.random() * this.options),
      this.options,
      4 + Math.floor(Math.random() * 4),
      clockwise,
      Math.random() * 2 - 1,
    )
  }

  reset() {
    this.options = 2
    this.wheelReady = false
    this.spinning = false
  }

  tick(timestamp: number, active: boolean) {
    if (this.spinning) {
      const t = Math.min(1, (timestamp - this.spinAt) / this.spinDuration)

      this.angle = this.spinFrom + (this.spinTo - this.spinFrom) * (1 - Math.pow(1 - t, 3))

      if (t === 1) {
        this.spinning = false
        this.angle = wrap(this.angle, 360)
      }
    }

    if (active) {
      this.pointerRotation = 'rotate(' + this.angle + 'deg)'
    }
  }
}

export const luckyWheel = new LuckyWheelStore()
