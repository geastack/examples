export type CapabilityState = 'live' | 'detected' | 'absent'

export interface Capability {
  id: string
  title: string
  state: CapabilityState
  detail: string
  badge: string
}

// The native template renderer rejects slots that call functions; precomputing
// the badge label here keeps component templates reading plain fields only.
export function badgeLabel(state: CapabilityState): string {
  if (state == 'live') return 'LIVE'
  if (state == 'detected') return 'DETECTED'
  return 'N/A'
}

// Ordered subsystem list; drives the menu and the per-screen dispatch.
// Titles are kept short so they fit narrow panels (135px) without clipping; the
// descriptive detail (e.g. "ST7789V2 135x240") rides on the row's second line on
// roomy boards.
export const SUBSYSTEMS: { id: string; title: string }[] = [
  { id: 'display', title: 'DISPLAY' },
  { id: 'touch', title: 'TOUCH' },
  { id: 'buttons', title: 'BUTTONS' },
  { id: 'rotary', title: 'ROTARY' },
  { id: 'imu', title: 'IMU' },
  { id: 'sdcard', title: 'SD CARD' },
  { id: 'storage', title: 'STORAGE' },
  { id: 'wifi', title: 'WIFI' },
  { id: 'ble', title: 'BLE' },
  { id: 'speaker', title: 'SPEAKER' },
  { id: 'microphone', title: 'MIC' },
  { id: 'camera', title: 'CAMERA' },
  { id: 'gps', title: 'GPS' },
  { id: 'rtc', title: 'RTC' },
  { id: 'temperature', title: 'TEMP' },
  { id: 'cellular', title: 'CELLULAR' },
  { id: 'vibration', title: 'VIBRATION' }
]
