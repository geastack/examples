import { Battery } from '@geastack/core'

export interface DeviceBatteryStatus {
  available: number
  level: number
  label: string
}

function unavailableBatteryStatus(): DeviceBatteryStatus {
  return {
    available: 0,
    level: -1,
    label: '--',
  }
}

export function readBatteryStatus(): DeviceBatteryStatus {
  const rawLevel: number = Battery.level()
  if (!(rawLevel >= 0)) return unavailableBatteryStatus()
  const level = rawLevel > 100 ? 100 : rawLevel
  return {
    available: 1,
    level,
    label: '' + level + '%',
  }
}
