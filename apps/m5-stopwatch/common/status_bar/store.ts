import { Battery, Store } from '@geastack/core'
import { FactorySpring } from '../../apps/app_watch_face/view/animation'

const batterySlide = new FactorySpring(0.3, 0.1)

export class BatteryStore extends Store {
  batteryLevel = 0
  plugged = false
  batteryVisible = false
  batteryShowing = false
  batteryY = -85
  batteryUntil = 0

  init(timestamp: number) {
    batterySlide.teleport(-85, timestamp)
  }

  refresh() {
    this.batteryLevel = Battery.level()
  }

  show(duration: number, timestamp: number) {
    this.batteryVisible = true
    this.batteryShowing = true
    this.batteryUntil = timestamp + duration
    batterySlide.move(-17, timestamp)
  }

  hide(timestamp: number) {
    this.batteryShowing = false
    batterySlide.move(-85, timestamp)
  }

  tick(timestamp: number) {
    if (this.batteryShowing && timestamp > this.batteryUntil) {
      this.hide(timestamp)
    }

    if (this.batteryVisible) {
      this.batteryY = batterySlide.update(timestamp)
      if (!this.batteryShowing && batterySlide.done) {
        this.batteryVisible = false
      }
    }
  }
}

export const battery = new BatteryStore()
