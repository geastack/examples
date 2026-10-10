import { Battery, Store } from '@geastack/core'
import { system } from '../../stores/SystemStore'
import { battery } from '../../common/status_bar/store'
import { wrap } from '../../lib/model'

export class LauncherStore extends Store {
  menuIndex = 0
  requestRevision = 0
  requestDirection = 0
  names = [
    'AlarmClock',
    'WatchFace',
    'Stopwatch',
    'Badge',
    'IMU',
    'Audio.FFT',
    'LuckyWheel',
    'Settings',
  ]
  ids = ['alarms', 'watch', 'stopwatch', 'badge', 'imu', 'fft', 'wheel', 'settings']
  launcherStarted = false
  launcherInitialBatteryAt = -1
  lastChargeTick = -1000

  startLauncher() {
    if (!this.launcherStarted) {
      this.launcherStarted = true
      this.launcherInitialBatteryAt = system.now + 800
    }

    this.lastChargeTick = system.now - 1000
    battery.plugged = Battery.charging()
  }

  select(index: number) {
    this.menuIndex = wrap(index, this.ids.length)
  }

  open(offset = 0) {
    if (!system.navigationBlocked) {
      this.select(this.menuIndex + offset)
      system.openApp(this.ids[this.menuIndex])
    }
  }

  go(direction: number) {
    this.requestDirection = direction
    this.requestRevision++
  }

  tick(timestamp: number) {
    if (this.launcherInitialBatteryAt >= 0 && timestamp >= this.launcherInitialBatteryAt) {
      this.launcherInitialBatteryAt = -1
      system.showBattery(1800)
    }

    if (timestamp - this.lastChargeTick >= 1000) {
      this.lastChargeTick = timestamp
      const charging = Battery.charging()

      if (!battery.plugged && charging) {
        system.showBattery(6000)
      }

      battery.plugged = charging
    }
  }
}

export const launcher = new LauncherStore()
