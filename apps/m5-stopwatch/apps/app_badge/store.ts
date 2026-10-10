import { Store } from '@geastack/core'
import { system } from '../../stores/SystemStore'
import {
  apName,
  badgePath,
  badgeStep,
  closeBadge,
  editBadge,
  editingBadge,
  initBadge,
} from '../../lib/badge'

export class BadgeStore extends Store {
  badge = ''
  ap = ''

  startBadgeEdit() {
    system.dialog = ''
    if (editBadge()) {
      this.ap = apName()
      system.screen = 'badge-edit'
    } else {
      system.error = 'Badge editor could not start'
    }
  }

  init() {
    initBadge()
  }

  enter() {
    this.badge = badgePath()
  }

  go(direction: number) {
    badgeStep(direction)
    this.badge = badgePath()
  }

  poll() {
    if (system.screen === 'badge-edit' && !editingBadge()) {
      system.screen = 'badge'
      this.badge = badgePath()
    }
  }

  close() {
    closeBadge()
  }
}

export const badge = new BadgeStore()
