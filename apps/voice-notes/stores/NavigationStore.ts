import { Store } from '@geastack/core'
import {
  VIEW_IDLE
} from '../shared/views'

export const IDLE_ACTION_RECORD = 0
export const IDLE_ACTION_MENU = 1

export class VoiceNotesNavigationStore extends Store {
  view = VIEW_IDLE
  status = 'Ready'
  idleActionIndex = IDLE_ACTION_RECORD

  setView(view: number) {
    this.view = view
  }

  setStatus(status: string) {
    this.status = status
  }

  resetIdleAction() {
    this.idleActionIndex = IDLE_ACTION_RECORD
  }

  nextIdleAction() {
    this.idleActionIndex = this.idleActionIndex == IDLE_ACTION_RECORD ? IDLE_ACTION_MENU : IDLE_ACTION_RECORD
  }
}

export const voiceNotesNavigation = new VoiceNotesNavigationStore()
