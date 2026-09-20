import { Store } from '@geastack/core'
import { readBatteryStatus } from '../lib/deviceStatus'

export class VoiceNotesDeviceStore extends Store {
  batteryLevel = 0
  batteryLabel = '--'

  refreshBattery() {
    const battery = readBatteryStatus()
    this.batteryLevel = battery.level
    this.batteryLabel = battery.label
  }
}

export const voiceNotesDevice = new VoiceNotesDeviceStore()
