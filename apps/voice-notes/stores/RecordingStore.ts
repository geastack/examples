import { Store } from '@geastack/core'
import { cancelRecordingSession, finishRecordingSession, recordingElapsed, startRecordingSession, type RecorderSession } from '../lib/recording'
import { formatRecordingTime, noteLabel } from '../shared/noteText'
import { RECORDING_TAGS } from '../shared/tags'
import { createEmptyNote, type VoiceNote } from '../shared/notes'

export const RECORDING_ACTION_STOP = 0
export const RECORDING_ACTION_DISCARD = 1
export const RECORDING_TAG_BACK = RECORDING_TAGS.length

function emptySession(): RecorderSession {
  return {
    noteNumber: 0,
    startedAtMs: 0,
    createdAtMs: 0,
    audioPath: ''
  }
}

function nextDraftTagIndex(index: number): number {
  const next = index + 1
  if (next > RECORDING_TAG_BACK) return 0
  return next
}

export class VoiceNotesRecordingStore extends Store {
  recordingActive = 0
  recordingLabel = '00:00'
  recordingActionIndex = RECORDING_ACTION_STOP
  recordingSession: RecorderSession = emptySession()
  pendingRecordedNote: VoiceNote = createEmptyNote()
  hasPendingRecordedNote = 0
  pendingRecordedLabelText = '#001'
  draftTagIndex = 0

  async begin(nextNoteNumber: number): Promise<number> {
    try {
      this.recordingSession = await startRecordingSession(nextNoteNumber)
      this.recordingActive = 1
      this.recordingActionIndex = RECORDING_ACTION_STOP
      this.recordingLabel = '00:00'
      return 1
    } catch {
      this.recordingSession = emptySession()
      this.recordingActive = 0
      return 0
    }
  }

  cancel() {
    cancelRecordingSession()
    this.recordingActive = 0
    this.recordingActionIndex = RECORDING_ACTION_STOP
    this.recordingSession = emptySession()
  }

  finish(): VoiceNote {
    if (!this.recordingActive) return createEmptyNote()
    this.pendingRecordedNote = finishRecordingSession(this.recordingSession)
    this.hasPendingRecordedNote = 1
    this.recordingActive = 0
    this.recordingActionIndex = RECORDING_ACTION_STOP
    this.recordingSession = emptySession()
    this.draftTagIndex = 0
    this.refreshPendingLabel(this.pendingRecordedNote.number)
    return this.pendingRecordedNote
  }

  nextDraftTag() {
    this.draftTagIndex = nextDraftTagIndex(this.draftTagIndex)
  }

  nextRecordingAction() {
    this.recordingActionIndex = this.recordingActionIndex == RECORDING_ACTION_STOP
      ? RECORDING_ACTION_DISCARD
      : RECORDING_ACTION_STOP
  }

  clearPending(nextNoteNumber: number) {
    this.pendingRecordedNote = createEmptyNote()
    this.hasPendingRecordedNote = 0
    this.refreshPendingLabel(nextNoteNumber)
  }

  refreshPendingLabel(nextNoteNumber: number) {
    if (this.hasPendingRecordedNote) this.pendingRecordedLabelText = noteLabel(this.pendingRecordedNote.number)
    else this.pendingRecordedLabelText = noteLabel(nextNoteNumber)
  }

  tick() {
    if (!this.recordingActive) return
    const elapsed = recordingElapsed(this.recordingSession)
    this.recordingLabel = formatRecordingTime(elapsed)
  }
}

export const voiceNotesRecording = new VoiceNotesRecordingStore()
