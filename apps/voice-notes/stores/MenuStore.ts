import { Store } from '@geastack/core'

export interface MenuItem {
  id: number
  label: string
}

export const MENU_NOTES = 0
export const MENU_TAGS = 1
export const MENU_SYNC = 2
export const MENU_SETTINGS = 3
export const MENU_BACK = 4

export const MENU_ITEMS: MenuItem[] = [
  { id: MENU_NOTES, label: 'Notes' },
  { id: MENU_TAGS, label: 'Tags' },
  { id: MENU_SYNC, label: 'Sync' },
  { id: MENU_SETTINGS, label: 'Settings' },
  { id: MENU_BACK, label: 'Back' }
]

function nextIndex(index: number): number {
  const next = index + 1
  if (next >= MENU_ITEMS.length) return 0
  return next
}

export class VoiceNotesMenuStore extends Store {
  menuIndex = 0

  reset() {
    this.menuIndex = 0
  }

  next() {
    this.menuIndex = nextIndex(this.menuIndex)
  }
}

export const voiceNotesMenu = new VoiceNotesMenuStore()
