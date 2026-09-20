import { Store, WiFi } from '@geastack/core'

export class WatchStore extends Store {
  screen = 0
  selectedInput = 0
  elapsedMinute = -1
  frame = 0
  baseHour = 10
  baseMinute = 9
  timeText = '10:09'
  dateText = 'MON APR 27'
  weatherText = '72F Clear'
  weatherDetail = 'H 76  L 58'
  calendarTime = '3:00 PM'
  calendarDetail = 'Design sync'
  steps = 4382
  stepText = '4382'
  stepPct = 44
  batteryPct = 82
  batteryText = '82%'
  wifiTitle = 'Gea Lab'
  wifiDetail = '192.168.4.22'
  wifiSignal = 'RSSI -48dBm'
  wifiSsid = ''
  wifiPassword = ''
  settingsStatus = 'Tap a field to edit Wi-Fi'

  init() {
    // A watch wants connectivity: opt into WiFi. With opt-in connectivity the
    // radio is no longer started at boot, so the app that needs it turns it on
    // (brought up lazily; status is read below once connected).
    WiFi.setEnabled(true)
    this.syncWifi()
    this.updateTime(0)
    this.updateMetrics()
  }

  syncWifi() {
    if (WiFi.connected()) {
      this.wifiTitle = WiFi.ssid()
      this.wifiDetail = WiFi.ip()
      this.wifiSignal = 'RSSI -48dBm'
      if (this.wifiSsid.length == 0) this.wifiSsid = WiFi.ssid()
      this.weatherText = '72F Clear'
      this.weatherDetail = 'H 76  L 58'
      this.calendarTime = '3:00 PM'
      this.calendarDetail = 'Design sync'
    } else {
      this.wifiTitle = 'Wi-Fi offline'
      this.wifiDetail = 'Tap to configure'
      this.wifiSignal = 'Forecast paused'
      this.weatherText = 'Weather offline'
      this.weatherDetail = 'Enable simulator Wi-Fi'
      this.calendarTime = '--'
      this.calendarDetail = 'Calendar offline'
    }
  }

  openSettings() {
    this.screen = 1
    this.selectedInput = 0
    this.settingsStatus = 'Enter network name'
    if (this.wifiSsid.length == 0 && WiFi.connected()) this.wifiSsid = WiFi.ssid()
  }

  closeSettings() {
    this.screen = 0
    this.settingsStatus = 'Tap a field to edit Wi-Fi'
  }

  selectSsid() {
    this.selectedInput = 0
    this.settingsStatus = 'Editing network name'
  }

  selectPassword() {
    this.selectedInput = 1
    this.settingsStatus = 'Editing password'
  }

  updateSsid(value: string) {
    this.wifiSsid = value
    this.selectedInput = 0
    this.settingsStatus = 'Editing network name'
  }

  updatePassword(value: string) {
    this.wifiPassword = value
    this.selectedInput = 1
    this.settingsStatus = 'Editing password'
  }

  keydown(code: number) {
    if (code == 13) this.saveWifi()
  }

  saveWifi() {
    if (this.wifiSsid.length == 0) {
      this.settingsStatus = 'Network name required'
      return
    }

    WiFi.configure(this.wifiSsid, this.wifiPassword)
    this.settingsStatus = 'Saved ' + this.wifiSsid
    this.screen = 0
    this.syncWifi()
  }

  updateTime(timestampMs: number) {
    const elapsed = Math.floor(timestampMs / 60000)
    const total = this.baseHour * 60 + this.baseMinute + elapsed
    const hour = Math.floor(total / 60) % 24
    const minute = total % 60
    if (minute < 10) this.timeText = hour + ':0' + minute
    else this.timeText = hour + ':' + minute
  }

  updateMetrics() {
    this.stepText = this.steps + ''
    this.stepPct = this.steps / 100
    if (this.stepPct > 100) this.stepPct = 100
    this.batteryText = this.batteryPct + '%'
  }

  tick(timestampMs: number) {
    const minute = Math.floor(timestampMs / 60000)
    if (minute != this.elapsedMinute) {
      this.elapsedMinute = minute
      this.updateTime(timestampMs)
      this.syncWifi()
    }

    this.frame = this.frame + 1
    if (this.frame > 40) {
      this.frame = 0
      this.steps = this.steps + 1
      if (this.steps > 9999) this.steps = 4382
      this.batteryPct = this.batteryPct - 1
      if (this.batteryPct < 18) this.batteryPct = 82
      this.updateMetrics()
    }
  }
}

export const watch = new WatchStore()
