import { playTone } from '../lib/audio'
import { loadVoiceNotes, loadVoiceNoteSettings, saveVoiceNotes, saveVoiceNoteSettings } from '../lib/noteStorage'
import { noteLabel } from '../shared/noteText'
import { TAG_ALL, recordingTagIdAt } from '../shared/tags'
import { createTaggedNote } from '../shared/notes'
import { voiceNotesDevice } from '../stores/DeviceStore'
import {
  DELETE_ACTION_DELETE,
  DETAIL_ACTION_BACK,
  DETAIL_ACTION_DELETE,
  DETAIL_ACTION_MORE,
  DETAIL_ACTION_NEXT,
  DETAIL_ACTION_PLAY,
  voiceNotesLibrary
} from '../stores/NoteLibraryStore'
import { IDLE_ACTION_RECORD, voiceNotesNavigation } from '../stores/NavigationStore'
import { MENU_BACK, MENU_NOTES, MENU_SETTINGS, MENU_SYNC, MENU_TAGS, voiceNotesMenu } from '../stores/MenuStore'
import { RECORDING_ACTION_STOP, RECORDING_TAG_BACK, voiceNotesRecording } from '../stores/RecordingStore'
import { SETTING_BACK, SETTING_DEVICE, SETTING_SOUNDS, SETTING_TRANSFER, voiceNotesSettings } from '../stores/SettingsStore'
import { voiceNotesSync } from '../stores/SyncStore'
import { BROWSE_TAG_BACK, voiceNotesTagBrowser } from '../stores/TagBrowserStore'
import { voiceNotesTransfer } from '../stores/TransferStore'
import {
  VIEW_DELETE_CONFIRM,
  VIEW_DEVICE,
  VIEW_IDLE,
  VIEW_MENU,
  VIEW_NOTE_DETAIL,
  VIEW_NOTE_LIST,
  VIEW_RECORDING,
  VIEW_SETTINGS,
  VIEW_SYNC,
  VIEW_TAG_BROWSER,
  VIEW_TAG_SELECT,
  VIEW_TRANSFER
} from '../shared/views'

const AUDIO_SETTLE_AFTER_TONE_MS = 120

export class VoiceNotesController {
  init() {
    const settings = loadVoiceNoteSettings()
    voiceNotesSettings.setSoundsEnabled(settings.soundsEnabled)
    voiceNotesLibrary.nextNoteNumber = settings.nextNoteNumber
    voiceNotesLibrary.notes = loadVoiceNotes()
    const nextFromNotes = voiceNotesLibrary.nextNumberFromNotes()
    if (nextFromNotes > voiceNotesLibrary.nextNoteNumber) voiceNotesLibrary.nextNoteNumber = nextFromNotes
    voiceNotesDevice.refreshBattery()
    voiceNotesLibrary.applyFilter(TAG_ALL)
    this.refreshDerived()
  }

  persist() {
    saveVoiceNotes(voiceNotesLibrary.notes)
    saveVoiceNoteSettings(voiceNotesSettings.soundsEnabled, voiceNotesLibrary.nextNoteNumber)
  }

  refreshDerived() {
    voiceNotesLibrary.refreshLists()
    voiceNotesRecording.refreshPendingLabel(voiceNotesLibrary.nextNoteNumber)
    voiceNotesSettings.refreshDerived()
    voiceNotesTagBrowser.refresh(voiceNotesLibrary.notes)
    voiceNotesTransfer.refreshDerived()
  }

  setView(view: number) {
    voiceNotesNavigation.setView(view)
  }

  tone(frequency: number, durationMs: number) {
    playTone(voiceNotesSettings.soundsEnabled, frequency, durationMs)
  }

  primary() {
    this.tone(1160, 28)
    if (voiceNotesNavigation.view == VIEW_IDLE) {
      if (voiceNotesNavigation.idleActionIndex == IDLE_ACTION_RECORD) void this.beginRecording()
      else this.openMenu()
    } else if (voiceNotesNavigation.view == VIEW_RECORDING) {
      if (voiceNotesRecording.recordingActionIndex == RECORDING_ACTION_STOP) this.finishRecording()
      else this.cancelRecording()
    } else if (voiceNotesNavigation.view == VIEW_TAG_SELECT) {
      if (voiceNotesRecording.draftTagIndex == RECORDING_TAG_BACK) this.discardPendingRecording()
      else this.saveSelectedTag()
    }
    else if (voiceNotesNavigation.view == VIEW_MENU) this.openMenuItem()
    else if (voiceNotesNavigation.view == VIEW_TAG_BROWSER) {
      if (voiceNotesTagBrowser.browseTagIndex == BROWSE_TAG_BACK) this.setView(VIEW_MENU)
      else this.filterByBrowseTag()
    } else if (voiceNotesNavigation.view == VIEW_NOTE_LIST) {
      if (voiceNotesLibrary.noteListBackSelected) this.setView(VIEW_MENU)
      else this.openSelectedDetail()
    }
    else if (voiceNotesNavigation.view == VIEW_NOTE_DETAIL) this.openDetailAction()
    else if (voiceNotesNavigation.view == VIEW_SYNC) this.doneFromSync()
    else if (voiceNotesNavigation.view == VIEW_SETTINGS) this.openSetting()
    else if (voiceNotesNavigation.view == VIEW_TRANSFER) this.closeTransfer()
    else if (voiceNotesNavigation.view == VIEW_DELETE_CONFIRM) {
      if (voiceNotesLibrary.deleteActionIndex == DELETE_ACTION_DELETE) this.confirmDelete()
      else this.cancelDelete()
    }
    else if (voiceNotesNavigation.view == VIEW_DEVICE) this.setView(VIEW_SETTINGS)
  }

  secondary() {
    this.tone(820, 18)
    if (voiceNotesNavigation.view == VIEW_IDLE) voiceNotesNavigation.nextIdleAction()
    else if (voiceNotesNavigation.view == VIEW_RECORDING) voiceNotesRecording.nextRecordingAction()
    else if (voiceNotesNavigation.view == VIEW_TAG_SELECT) this.nextDraftTag()
    else if (voiceNotesNavigation.view == VIEW_MENU) this.nextMenu()
    else if (voiceNotesNavigation.view == VIEW_TAG_BROWSER) this.nextBrowseTag()
    else if (voiceNotesNavigation.view == VIEW_NOTE_LIST) voiceNotesLibrary.selectNextVisible()
    else if (voiceNotesNavigation.view == VIEW_NOTE_DETAIL) this.nextDetailAction()
    else if (voiceNotesNavigation.view == VIEW_SYNC) return
    else if (voiceNotesNavigation.view == VIEW_SETTINGS) this.nextSetting()
    else if (voiceNotesNavigation.view == VIEW_TRANSFER) return
    else if (voiceNotesNavigation.view == VIEW_DELETE_CONFIRM) voiceNotesLibrary.nextDeleteAction()
    else if (voiceNotesNavigation.view == VIEW_DEVICE) return
  }

  openMenu() {
    voiceNotesMenu.reset()
    this.setView(VIEW_MENU)
  }

  nextMenu() {
    voiceNotesMenu.next()
  }

  openMenuItem() {
    if (voiceNotesMenu.menuIndex == MENU_NOTES) {
      voiceNotesLibrary.applyFilter(TAG_ALL)
      this.setView(VIEW_NOTE_LIST)
    } else if (voiceNotesMenu.menuIndex == MENU_TAGS) {
      voiceNotesTagBrowser.reset(voiceNotesLibrary.notes)
      this.setView(VIEW_TAG_BROWSER)
    } else if (voiceNotesMenu.menuIndex == MENU_SYNC) {
      this.startSync()
    } else if (voiceNotesMenu.menuIndex == MENU_SETTINGS) {
      voiceNotesSettings.resetSelection()
      this.setView(VIEW_SETTINGS)
    } else if (voiceNotesMenu.menuIndex == MENU_BACK) {
      voiceNotesNavigation.resetIdleAction()
      this.setView(VIEW_IDLE)
    }
    this.refreshDerived()
  }

  beginRecording() {
    voiceNotesNavigation.setStatus('Opening mic')
    this.setView(VIEW_RECORDING)
    const noteNumber = voiceNotesLibrary.nextNoteNumber
    setTimeout(() => {
      void this.startRecordingAfterInputTone(noteNumber)
    }, AUDIO_SETTLE_AFTER_TONE_MS)
  }

  async startRecordingAfterInputTone(noteNumber: number) {
    if (voiceNotesNavigation.view != VIEW_RECORDING) return
    const started = await voiceNotesRecording.begin(noteNumber)
    if (voiceNotesNavigation.view != VIEW_RECORDING) {
      if (started) voiceNotesRecording.cancel()
      return
    }
    voiceNotesNavigation.setStatus(started ? 'Recording' : 'Mic unavailable')
    if (!started) this.setView(VIEW_IDLE)
  }

  cancelRecording() {
    voiceNotesRecording.cancel()
    voiceNotesNavigation.setStatus('Discarded')
    this.setView(VIEW_IDLE)
  }

  finishRecording() {
    if (!voiceNotesRecording.recordingActive) return
    voiceNotesRecording.finish()
    voiceNotesNavigation.setStatus('Choose tag')
    this.setView(VIEW_TAG_SELECT)
  }

  nextDraftTag() {
    voiceNotesRecording.nextDraftTag()
  }

  saveSelectedTag() {
    if (!voiceNotesRecording.hasPendingRecordedNote) {
      this.setView(VIEW_IDLE)
      return
    }
    const taggedNote = createTaggedNote(voiceNotesRecording.pendingRecordedNote, recordingTagIdAt(voiceNotesRecording.draftTagIndex))
    voiceNotesLibrary.addNote(taggedNote)
    voiceNotesRecording.clearPending(voiceNotesLibrary.nextNoteNumber)
    this.persist()
    voiceNotesLibrary.applyFilter(TAG_ALL)
    voiceNotesLibrary.selectNote(taggedNote)
    voiceNotesNavigation.setStatus('Saved ' + noteLabel(taggedNote.number))
    this.setView(VIEW_IDLE)
    this.refreshDerived()
    // Transcribe the new recording automatically in the background (Soniox).
    voiceNotesSync.autoStart()
  }

  discardPendingRecording() {
    voiceNotesRecording.clearPending(voiceNotesLibrary.nextNoteNumber)
    voiceNotesNavigation.setStatus('Discarded')
    this.setView(VIEW_IDLE)
  }

  nextBrowseTag() {
    voiceNotesTagBrowser.next(voiceNotesLibrary.notes)
  }

  filterByBrowseTag() {
    voiceNotesLibrary.applyFilter(voiceNotesTagBrowser.browseTagId())
    this.setView(VIEW_NOTE_LIST)
    this.refreshDerived()
  }

  openSelectedDetail() {
    if (!voiceNotesLibrary.hasSelection) return
    voiceNotesLibrary.detailPage = 0
    voiceNotesLibrary.refreshViewModel()
    this.setView(VIEW_NOTE_DETAIL)
  }

  openNoteById(id: string) {
    const note = voiceNotesLibrary.notes.find((candidate) => candidate.id == id)
    if (!note) return
    voiceNotesLibrary.selectNote(note)
    this.setView(VIEW_NOTE_DETAIL)
  }

  nextDetailAction() {
    voiceNotesLibrary.nextDetailAction()
  }

  openDetailAction() {
    if (voiceNotesLibrary.detailActionIndex == DETAIL_ACTION_PLAY) {
      this.playSelected()
    } else if (voiceNotesLibrary.detailActionIndex == DETAIL_ACTION_MORE) {
      this.moreDetailPage()
    } else if (voiceNotesLibrary.detailActionIndex == DETAIL_ACTION_NEXT) {
      voiceNotesLibrary.detailPage = 0
      voiceNotesLibrary.selectNextVisible()
    } else if (voiceNotesLibrary.detailActionIndex == DETAIL_ACTION_DELETE) {
      this.requestDelete()
    } else if (voiceNotesLibrary.detailActionIndex == DETAIL_ACTION_BACK) {
      this.setView(VIEW_NOTE_LIST)
    }
  }

  moreDetailPage() {
    if (voiceNotesLibrary.selectedNote.transcript.length > 190 && voiceNotesLibrary.detailPage == 0) {
      voiceNotesLibrary.detailPage = 1
      voiceNotesLibrary.refreshViewModel()
      return
    }
    voiceNotesLibrary.detailPage = 0
  }

  playSelected() {
    if (!voiceNotesLibrary.hasSelection) return
    const audioPath = voiceNotesLibrary.selectedNote.audioPath
    voiceNotesNavigation.setStatus('Playing ' + voiceNotesLibrary.selectedLabelText)
    setTimeout(() => {
      const audio = new Audio(audioPath)
      audio.play()
    }, AUDIO_SETTLE_AFTER_TONE_MS)
  }

  requestDelete() {
    if (!voiceNotesLibrary.hasSelection) return
    voiceNotesLibrary.resetDeleteAction()
    this.setView(VIEW_DELETE_CONFIRM)
  }

  cancelDelete() {
    this.setView(VIEW_NOTE_DETAIL)
  }

  confirmDelete() {
    if (!voiceNotesLibrary.hasSelection) {
      this.setView(VIEW_NOTE_LIST)
      return
    }
    voiceNotesLibrary.deleteSelected()
    this.persist()
    voiceNotesNavigation.setStatus('Deleted')
    this.setView(VIEW_NOTE_LIST)
    this.refreshDerived()
  }

  startSync() {
    this.setView(VIEW_SYNC)
    voiceNotesSync.prepare()
    voiceNotesSync.start()
    voiceNotesNavigation.setStatus(voiceNotesSync.syncMessage)
    this.refreshDerived()
  }

  doneFromSync() {
    voiceNotesSync.cancel()
    voiceNotesLibrary.applyFilter(TAG_ALL)
    this.setView(VIEW_MENU)
    this.refreshDerived()
  }

  nextSetting() {
    voiceNotesSettings.next()
  }

  openSetting() {
    if (voiceNotesSettings.settingsIndex == SETTING_SOUNDS) {
      voiceNotesSettings.toggleSounds()
      this.persist()
      voiceNotesNavigation.setStatus(voiceNotesSettings.soundsEnabled ? 'Sounds on' : 'Sounds off')
      this.refreshDerived()
    } else if (voiceNotesSettings.settingsIndex == SETTING_TRANSFER) {
      this.startTransfer()
    } else if (voiceNotesSettings.settingsIndex == SETTING_DEVICE) {
      this.setView(VIEW_DEVICE)
    } else if (voiceNotesSettings.settingsIndex == SETTING_BACK) {
      this.setView(VIEW_MENU)
    }
  }

  startTransfer() {
    voiceNotesTransfer.start(voiceNotesLibrary.notes.length)
    voiceNotesNavigation.setStatus(voiceNotesTransfer.transferMessage)
    this.refreshDerived()
    this.setView(VIEW_TRANSFER)
  }

  closeTransfer() {
    voiceNotesTransfer.close()
    voiceNotesNavigation.setStatus('Transfer closed')
    this.refreshDerived()
    this.setView(VIEW_SETTINGS)
  }

  back() {
    if (voiceNotesNavigation.view == VIEW_IDLE) return
    if (voiceNotesNavigation.view == VIEW_RECORDING) this.cancelRecording()
    else if (voiceNotesNavigation.view == VIEW_TAG_SELECT) this.discardPendingRecording()
    else if (voiceNotesNavigation.view == VIEW_NOTE_DETAIL) this.setView(VIEW_NOTE_LIST)
    else if (voiceNotesNavigation.view == VIEW_DELETE_CONFIRM) this.setView(VIEW_NOTE_DETAIL)
    else if (voiceNotesNavigation.view == VIEW_SETTINGS) this.setView(VIEW_MENU)
    else if (voiceNotesNavigation.view == VIEW_DEVICE) this.setView(VIEW_SETTINGS)
    else if (voiceNotesNavigation.view == VIEW_TRANSFER) this.closeTransfer()
    else this.setView(VIEW_IDLE)
  }

  keydown(code: number) {
    // e-paper hardware: ArrowDown selects the active row, ArrowUp advances it.
    if (code == 13 || code == 32 || code == 40) this.primary()
    else if (code == 38 || code == 39) this.secondary()
    else if (code == 8 || code == 27) this.back()
  }

  tick(timestampMs: number) {
    voiceNotesRecording.tick()
    const syncChanged = voiceNotesSync.tick()
    if (syncChanged > 0) {
      this.persist()
      voiceNotesLibrary.refreshLists()
      this.refreshDerived()
    }
    voiceNotesTransfer.tick()
    if (voiceNotesNavigation.view == VIEW_SYNC) {
      voiceNotesNavigation.setStatus(voiceNotesSync.syncMessage)
    }
    if (voiceNotesNavigation.view == VIEW_TRANSFER) {
      voiceNotesNavigation.setStatus(voiceNotesTransfer.transferMessage)
    }
    if (Math.floor(timestampMs) % 300 == 0) {
      voiceNotesDevice.refreshBattery()
      voiceNotesLibrary.refreshViewModel()
      voiceNotesRecording.refreshPendingLabel(voiceNotesLibrary.nextNoteNumber)
      voiceNotesTagBrowser.refresh(voiceNotesLibrary.notes)
    }
  }
}

export const voiceNotes = new VoiceNotesController()
