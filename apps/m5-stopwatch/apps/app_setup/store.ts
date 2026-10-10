import { Audio, Clock, Display, Store } from '@geastack/core'
import { system } from '../../stores/SystemStore'
import { daysInMonth, pad, wrap } from '../../lib/model'
import { saveSetting, setting } from '../../lib/settings'

export class SetupStore extends Store {
  brightness = 80
  speakerVolume = 80
  sfx = true
  vibration = true
  adjustHour = 0
  adjustMinute = 0
  adjustSecond = 0
  adjustYear = 2026
  adjustMonth = 1
  adjustDay = 1
  dateStage = 0
  versionClicks = 0
  progress = 0
  progressAt = 0
  progressBurst = 0

  toggleSfx() {
    this.sfx = !this.sfx
  }

  toggleVibration() {
    this.vibration = !this.vibration
  }

  get adjustTimeSummary(): string {
    return pad(this.adjustHour) + ':' + pad(this.adjustMinute) + ':' + pad(this.adjustSecond)
  }

  get adjustDateSummary(): string {
    const yearMonth = String(this.adjustYear) + '-' + pad(this.adjustMonth)

    return this.dateStage === 0 ? yearMonth : yearMonth + '-' + pad(this.adjustDay)
  }

  settingScreen(name: string) {
    system.screen = name
    const date = new Date(Clock.epochMs())

    this.adjustHour = date.getHours()
    this.adjustMinute = date.getMinutes()
    this.adjustSecond = date.getSeconds()
    this.adjustYear = date.getFullYear()
    this.adjustMonth = date.getMonth() + 1
    this.adjustDay = date.getDate()
    this.dateStage = 0
    if (name === 'brightness') {
      this.setPercentage(this.brightness)
    } else if (name === 'volume') {
      this.setPercentage(this.speakerVolume)
    }
  }

  setPercentage(value: number) {
    if (system.screen === 'brightness') {
      this.brightness = Math.max(10, Math.min(100, Math.round(value)))
      Display.setBrightness(this.brightness)
    } else {
      this.speakerVolume = Math.max(0, Math.min(100, Math.round(value / 5) * 5))
      Audio.setVolume(this.speakerVolume)
    }
  }

  saveSettings() {
    if (system.screen === 'set-time') {
      const date = new Date(Clock.epochMs())

      date.setHours(this.adjustHour, this.adjustMinute, this.adjustSecond)
      if (!Clock.setEpochMs(date.getTime())) {
        system.error = 'RTC write failed'

        return
      }
    } else if (system.screen === 'set-date') {
      if (this.dateStage === 0) {
        this.dateStage = 1

        return
      }

      const date = new Date(Clock.epochMs())

      date.setDate(1)
      date.setFullYear(this.adjustYear)
      date.setMonth(this.adjustMonth - 1)
      date.setDate(this.adjustDay)
      if (!Clock.setEpochMs(date.getTime())) {
        system.error = 'RTC write failed'

        return
      }
    }

    if (system.screen === 'brightness') {
      saveSetting('brightness', this.brightness)
    } else if (system.screen === 'volume') {
      saveSetting('volume', this.speakerVolume)
    } else if (system.screen === 'button') {
      saveSetting('sfx', this.sfx ? 1 : 0)
      saveSetting('vibration', this.vibration ? 1 : 0)
    }

    system.screen = 'settings'
  }

  versionTap() {
    this.versionClicks++
    if (this.versionClicks >= 10) {
      this.versionClicks = 0
      system.screen = 'about'
      this.progress = 0
      this.progressAt = system.now
      this.progressBurst = 0
    }
  }

  init() {
    this.brightness = Math.max(10, Math.min(100, setting('brightness', 80)))
    this.speakerVolume = Math.max(0, Math.min(100, setting('volume', 80)))
    this.sfx = setting('sfx', 1) !== 0
    this.vibration = setting('vibration', 1) !== 0
    Display.setBrightness(this.brightness)
    Audio.setVolume(this.speakerVolume)
  }

  changeValue(field: string, direction: number) {
    if (field === 'hour') {
      this.adjustHour = wrap(this.adjustHour + direction, 24)
    } else if (field === 'minute') {
      this.adjustMinute = wrap(this.adjustMinute + direction, 60)
    } else if (field === 'second') {
      this.adjustSecond = wrap(this.adjustSecond + direction, 60)
    } else if (field === 'year') {
      this.adjustYear = 2000 + wrap(this.adjustYear - 2000 + direction, 100)
    } else if (field === 'month') {
      this.adjustMonth = 1 + wrap(this.adjustMonth - 1 + direction, 12)
    } else if (field === 'day') {
      this.adjustDay =
        1 + wrap(this.adjustDay - 1 + direction, daysInMonth(this.adjustYear, this.adjustMonth))
    }

    this.adjustDay = Math.min(this.adjustDay, daysInMonth(this.adjustYear, this.adjustMonth))
  }

  tick(timestamp: number) {
    if (system.screen === 'about' && timestamp >= this.progressAt) {
      if (this.progressBurst <= 0) {
        this.progressBurst = 1 + Math.floor(Math.random() * 5)
      }

      this.progress += 1 + Math.floor(Math.random() * 8)
      this.progressBurst--
      this.progressAt =
        timestamp +
        (this.progressBurst > 0
          ? 60 + Math.floor(Math.random() * 121)
          : 700 + Math.floor(Math.random() * 1901))
    }
  }
}

export const setup = new SetupStore()
