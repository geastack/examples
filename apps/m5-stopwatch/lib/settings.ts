import type { AlarmEntry } from './model'

const PREFIX = 'm5watch.'

export function setting(key: string, fallback: number): number {
  const raw = localStorage.getItem(PREFIX + key)

  if (raw === null || raw.length === 0) {
    return fallback
  }

  const value = Number(raw)

  return Number.isFinite(value) ? Math.trunc(value) : fallback
}

export function saveSetting(key: string, value: number): void {
  localStorage.setItem(PREFIX + key, String(value))
}

export function loadAlarms(): AlarmEntry[] {
  const raw = localStorage.getItem(PREFIX + 'alarms')

  if (raw === null || raw.length === 0) {
    return []
  }

  try {
    const entries = JSON.parse(raw) as AlarmEntry[]

    return entries
      .filter(
        (entry) => entry.hour >= 0 && entry.hour < 24 && entry.minute >= 0 && entry.minute < 60,
      )
      .slice(0, 16)
      .map((entry, index) => ({
        id: index + 1,
        hour: entry.hour,
        minute: entry.minute,
        enabled: entry.enabled,
        lastDate: -1,
      }))
  } catch {
    return []
  }
}

export function saveAlarms(alarms: AlarmEntry[]): void {
  localStorage.setItem(PREFIX + 'alarms', JSON.stringify(alarms))
}
