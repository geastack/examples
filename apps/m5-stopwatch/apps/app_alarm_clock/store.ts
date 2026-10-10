import { Haptics, Store } from '@geastack/core'
import { system } from '../../stores/SystemStore'
import { alarmDue, dateKey, pad, wrap } from '../../lib/model'
import type { AlarmEntry } from '../../lib/model'
import { tone } from '../../lib/audio'
import { loadAlarms, saveAlarms } from '../../lib/settings'

export class AlarmClockStore extends Store {
  alarms: AlarmEntry[] = []
  nextAlarmId = 1
  alarmQueue: string[] = []
  ringing = false
  ringingText = ''
  beepAt = 0
  beepIndex = 0
  deleteId = -1
  adjustHour = 0
  adjustMinute = 0

  addAlarm() {
    this.adjustHour = 7
    this.adjustMinute = 0
    system.screen = 'alarm-add'
  }

  persistAlarms() {
    saveAlarms(this.alarms)
  }

  confirmAlarm() {
    if (this.alarms.length < 16) {
      this.alarms.push({
        id: this.nextAlarmId++,
        hour: this.adjustHour,
        minute: this.adjustMinute,
        enabled: true,
        lastDate: -1,
      })
    }

    this.persistAlarms()
    system.screen = 'alarms'
  }

  toggleAlarm(id: number) {
    if (system.dialog === 'delete') {
      return
    }

    for (let n = 0; n < this.alarms.length; n++) {
      if (this.alarms[n].id === id) {
        this.alarms[n].enabled = !this.alarms[n].enabled
        this.alarms[n].lastDate = -1
      }
    }

    this.persistAlarms()
  }

  askDelete(id: number) {
    this.deleteId = id
    system.dialog = 'delete'
  }

  deleteAlarm() {
    this.alarms = this.alarms.filter((a) => a.id !== this.deleteId)
    this.persistAlarms()
    system.dialog = ''
  }

  startAlarm(text: string) {
    this.ringing = true
    this.ringingText = text
    this.beepAt = system.now
    this.beepIndex = 0
  }

  dismissAlarm() {
    this.ringing = false
    tone(0, 0)
    Haptics.vibrate(0, 0)
    if (this.alarmQueue.length > 0) {
      const next = this.alarmQueue[0]

      this.alarmQueue.shift()
      this.startAlarm(next)
    }
  }

  init() {
    this.alarms = loadAlarms()
    this.nextAlarmId = this.alarms.length + 1
  }

  changeValue(field: string, direction: number) {
    if (field === 'hour') {
      this.adjustHour = wrap(this.adjustHour + direction, 24)
    } else if (field === 'minute') {
      this.adjustMinute = wrap(this.adjustMinute + direction, 60)
    }
  }

  poll(date: Date) {
    for (let n = 0; n < this.alarms.length; n++) {
      const alarm = this.alarms[n]

      if (alarmDue(alarm, date)) {
        alarm.lastDate = dateKey(date)
        const text = pad(alarm.hour) + ':' + pad(alarm.minute)

        if (this.ringing) {
          this.alarmQueue.push(text)
        } else {
          this.startAlarm(text)
        }
      }
    }
  }

  tick(timestamp: number) {
    if (this.ringing && timestamp >= this.beepAt) {
      tone(1760, 70)
      Haptics.vibrate(70, 90)
      this.beepIndex = (this.beepIndex + 1) % 4
      this.beepAt = timestamp + (this.beepIndex === 0 ? 720 : 180)
    }
  }
}

export const alarmClock = new AlarmClockStore()
