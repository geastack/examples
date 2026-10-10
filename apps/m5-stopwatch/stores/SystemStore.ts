import { Clock, Haptics, Store } from '@geastack/core'
import { tone, microphone } from '../lib/audio'
import { setting, saveSetting } from '../lib/settings'
import { launcher } from '../apps/app_launcher/store'
import { watchFace } from '../apps/app_watch_face/store'
import { stopwatch } from '../apps/app_stopwatch/store'
import { alarmClock } from '../apps/app_alarm_clock/store'
import { badge } from '../apps/app_badge/store'
import { imu } from '../apps/app_imu/store'
import { fft } from '../apps/app_fft/store'
import { luckyWheel } from '../apps/app_lucky_wheel/store'
import { setup } from '../apps/app_setup/store'
import { battery } from '../common/status_bar/store'

export class SystemStore extends Store {
  screen = 'menu'
  now = 0
  dialog = ''
  error = ''

  get navigationBlocked(): boolean {
    return alarmClock.ringing || this.dialog !== '' || this.screen === 'badge-edit'
  }

  feedback(frequency: number) {
    if (setup.sfx) {
      tone(frequency, 20)
    }

    if (setup.vibration) {
      Haptics.vibrate(20, 60)
    }
  }

  init() {
    badge.init()
    battery.init(this.now)
    setup.init()
    fft.init()
    alarmClock.init()
    const bootCount = setting('bootCount', 0)

    this.screen = bootCount < 5 ? 'guide' : 'menu'
    if (this.screen === 'menu') {
      launcher.startLauncher()
    }

    saveSetting('bootCount', Math.min(5, bootCount + 1))
  }

  home() {
    if (this.navigationBlocked) {
      return
    }

    microphone(false)
    if (this.screen === 'badge-edit') {
      badge.close()
    }

    this.screen = 'menu'
    launcher.startLauncher()
    this.dialog = ''
    stopwatch.reset()
    luckyWheel.reset()
  }

  openApp(id: string) {
    if (this.navigationBlocked) {
      return
    }

    this.screen = id
    if (id === 'watch') {
      watchFace.enter(this.now)
    } else if (id === 'stopwatch') {
      stopwatch.enter(this.now)
    } else if (id === 'imu') {
      imu.enter(this.now)
    } else if (id === 'fft') {
      fft.enter().catch(() => {
        this.error = 'Microphone unavailable'
      })
    } else if (id === 'badge') {
      badge.enter()
    } else if (id === 'wheel') {
      luckyWheel.reset()
    } else if (id === 'settings') {
      setup.versionClicks = 0
    }
  }

  go(direction: number) {
    if (this.navigationBlocked) {
      return
    }

    if (this.screen === 'menu') {
      launcher.go(direction)
    } else if (this.screen === 'watch') {
      watchFace.go(direction, this.now)
    } else if (this.screen === 'badge') {
      badge.go(direction)
    } else if (this.screen === 'wheel' && luckyWheel.wheelReady) {
      luckyWheel.spin(direction > 0)
    }
  }

  confirmDialog() {
    if (this.dialog === 'badge') {
      badge.startBadgeEdit()
    } else {
      alarmClock.deleteAlarm()
    }
  }

  cancelDialog() {
    this.dialog = ''
  }

  clearError() {
    this.error = ''
  }

  showBattery(duration: number) {
    battery.show(duration, this.now)
  }

  hideBattery() {
    battery.hide(this.now)
  }

  valueFor(field: string): number {
    if (field === 'options') return luckyWheel.options
    if (field === 'year') return setup.adjustYear
    if (field === 'month') return setup.adjustMonth
    if (field === 'day') return setup.adjustDay
    if (this.screen === 'alarm-add') {
      return field === 'hour' ? alarmClock.adjustHour : alarmClock.adjustMinute
    }
    if (field === 'hour') return setup.adjustHour
    return field === 'minute' ? setup.adjustMinute : setup.adjustSecond
  }

  changeValue(field: string, direction: number) {
    if (this.screen === 'alarm-add') {
      alarmClock.changeValue(field, direction)
    } else if (field === 'options') {
      luckyWheel.options = Math.max(2, Math.min(18, luckyWheel.options + direction))
    } else {
      setup.changeValue(field, direction)
    }
  }

  tick(timestamp: number) {
    this.now = timestamp
    if (this.screen === 'menu') {
      launcher.tick(timestamp)
    }

    battery.tick(timestamp)
    setup.tick(timestamp)
    if (this.screen === 'watch') {
      watchFace.tick(timestamp)
    }

    stopwatch.tick(timestamp, this.screen === 'stopwatch')
    luckyWheel.tick(timestamp, this.screen === 'wheel')
    if (this.screen === 'imu') {
      imu.tick(timestamp)
    }

    if (this.screen === 'fft') {
      fft.tick()
    }

    if (watchFace.pollClock(timestamp)) {
      battery.refresh()
      badge.poll()
      alarmClock.poll(new Date(Clock.epochMs()))
    }

    alarmClock.tick(timestamp)
  }
}

export const system = new SystemStore()
