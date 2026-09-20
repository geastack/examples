import { Store } from '@geastack/core'

export interface SettingsItem {
  id: number
  label: string
}

export const SETTING_SOUNDS = 0
export const SETTING_TRANSFER = 1
export const SETTING_DEVICE = 2
export const SETTING_BACK = 3

export const SETTINGS_ITEMS: SettingsItem[] = [
  { id: SETTING_SOUNDS, label: 'Sounds' },
  { id: SETTING_TRANSFER, label: 'Transfer' },
  { id: SETTING_DEVICE, label: 'Device' },
  { id: SETTING_BACK, label: 'Back' }
]

function nextIndex(index: number): number {
  const next = index + 1
  if (next >= SETTINGS_ITEMS.length) return 0
  return next
}

export class VoiceNotesSettingsStore extends Store {
  settingsIndex = 0
  soundsEnabled = 1
  soundsEnabledLabel = 'on'

  resetSelection() {
    this.settingsIndex = 0
  }

  next() {
    this.settingsIndex = nextIndex(this.settingsIndex)
  }

  setSoundsEnabled(enabled: number) {
    this.soundsEnabled = enabled ? 1 : 0
    this.refreshDerived()
  }

  toggleSounds() {
    this.soundsEnabled = this.soundsEnabled ? 0 : 1
    this.refreshDerived()
  }

  refreshDerived() {
    this.soundsEnabledLabel = this.soundsEnabled ? 'on' : 'off'
  }
}

export const voiceNotesSettings = new VoiceNotesSettingsStore()
