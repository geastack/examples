import { Store, WiFi, type StyleLength } from '@geastack/core'
import {
  cancelTranscriptionJob,
  noteTranscriptionPath,
  pollTranscriptionJob,
  startTranscriptionJob,
  transcriptionApiKey,
  transcriptionError,
  transcriptionJobReady,
  transcriptionSummary,
  uploadSentBytes,
  uploadTotalBytes
} from '../lib/transcription'
import { noteLabel } from '../shared/noteText'
import { voiceNotesLibrary } from './NoteLibraryStore'

const SYNC_IDLE = 0
const SYNC_WAIT_WIFI = 1
const SYNC_START_NOTE = 2
const SYNC_WAIT_TRANSCRIPT = 3
const WIFI_WAIT_MS = 20000
// Stored when Soniox transcribes a recording successfully but finds no speech
// (a silent/too-short clip). It marks the note done so it isn't retried, and
// the sync counts it as handled rather than failed.
const NO_SPEECH_TRANSCRIPT = '(no speech detected)'

export class VoiceNotesSyncStore extends Store {
  syncTotal = 0
  syncDone = 0
  syncMessage = 'All notes synced'
  syncActive = 0
  syncErrors = 0
  syncPhase = SYNC_IDLE
  syncStartedAtMs = 0
  syncNoteIndex = 0
  syncJobId = 0
  syncNoteId = ''
  syncNoteLabel = ''
  // Upload/transcription progress bar (0..100). syncBarWidth is the bound CSS
  // width string; syncBarPct throttles updates so the e-paper only repaints the
  // bar every ~5% instead of every frame.
  syncBarWidth: StyleLength = '0%'
  syncBarPct = -1
  // Detail line under the bar: "<sent>/<total> MB · <pct>% · <speed> KB/s".
  // syncLastSent/syncLastMs sample bytes vs wall-clock to derive the speed.
  syncDetail = ''
  syncLastSent = 0
  syncLastMs = 0

  reset() {
    this.syncTotal = 0
    this.syncDone = 0
    this.syncMessage = 'All notes synced'
    this.syncActive = 0
    this.syncErrors = 0
    this.syncPhase = SYNC_IDLE
    this.syncStartedAtMs = 0
    this.syncNoteIndex = 0
    this.syncJobId = 0
    this.syncNoteId = ''
    this.syncNoteLabel = ''
    this.syncBarWidth = '0%'
    this.syncBarPct = -1
    this.syncDetail = ''
    this.syncLastSent = 0
    this.syncLastMs = 0
  }

  prepare() {
    const notes = voiceNotesLibrary.notes
    const summary = transcriptionSummary(notes)
    this.syncTotal = summary.pending
    this.syncDone = 0
    this.syncErrors = 0
    this.syncActive = summary.pending > 0 ? 1 : 0
    this.syncMessage = summary.pending > 0 ? 'Preparing sync' : 'All notes synced'
    this.syncPhase = SYNC_IDLE
    this.syncNoteIndex = 0
    this.syncJobId = 0
    this.syncNoteId = ''
    this.syncNoteLabel = ''
  }

  start() {
    const notes = voiceNotesLibrary.notes
    const summary = transcriptionSummary(notes)
    const apiKey = transcriptionApiKey()
    this.syncTotal = summary.pending
    this.syncDone = 0
    this.syncErrors = 0
    this.syncNoteIndex = 0
    this.syncJobId = 0
    this.syncNoteId = ''
    this.syncNoteLabel = ''

    if (summary.pending == 0) {
      this.syncActive = 0
      this.syncMessage = 'All notes synced'
      this.syncPhase = SYNC_IDLE
      return
    }

    if (apiKey.length == 0) {
      this.syncActive = 0
      this.syncMessage = 'Soniox key not configured'
      this.syncPhase = SYNC_IDLE
      return
    }

    this.syncActive = 1
    this.syncMessage = 'Connecting Wi-Fi'
    this.syncPhase = SYNC_WAIT_WIFI
    this.syncStartedAtMs = Date.now()
    WiFi.setEnabled(true)
  }

  // Kick off transcription in the background without opening the Sync screen.
  // Used right after a recording is saved so notes transcribe automatically.
  // A run already in progress will pick up the freshly-appended note on its own
  // (startNextNote reads the live list), so only start when idle.
  autoStart() {
    if (this.syncActive) return
    const summary = transcriptionSummary(voiceNotesLibrary.notes)
    if (summary.pending == 0) return
    if (transcriptionApiKey().length == 0) return
    this.start()
  }

  tick(): number {
    if (this.syncPhase == SYNC_IDLE) return 0

    if (this.syncPhase == SYNC_WAIT_WIFI) {
      if (WiFi.connected()) {
        this.syncPhase = SYNC_START_NOTE
      } else if (Date.now() - this.syncStartedAtMs > WIFI_WAIT_MS) {
        this.failSync('Wi-Fi offline')
      }
      return 0
    }

    if (this.syncPhase == SYNC_START_NOTE) {
      this.startNextNote()
      return 0
    }

    if (this.syncPhase != SYNC_WAIT_TRANSCRIPT) return 0
    this.updateBar()
    if (!transcriptionJobReady(this.syncJobId)) return 0

    const transcript = pollTranscriptionJob(this.syncJobId)
    this.syncJobId = 0
    if (transcript.length > 0 && voiceNotesLibrary.applyTranscript(this.syncNoteId, transcript) > 0) {
      this.syncDone = this.syncDone + 1
      this.syncMessage = 'Synced ' + this.syncNoteLabel
      this.syncPhase = SYNC_START_NOTE
      return 1
    }

    // Soniox succeeded but the recording had no speech (silent/too-short clip):
    // not a failure. Mark the note done with a no-speech marker so it isn't
    // retried on every sync, and count it as handled rather than errored.
    if (transcriptionError() == 'empty transcript') {
      voiceNotesLibrary.applyTranscript(this.syncNoteId, NO_SPEECH_TRANSCRIPT)
      this.syncDone = this.syncDone + 1
      this.syncMessage = this.syncNoteLabel + ' — no speech'
      this.syncPhase = SYNC_START_NOTE
      return 1
    }

    this.syncErrors = this.syncErrors + 1
    this.syncMessage = 'Failed ' + this.syncNoteLabel
    this.syncDetail = transcriptionError()
    this.syncPhase = SYNC_START_NOTE
    return 0
  }

  // Refresh the bar + detail line (sent/total MB, %, speed). Throttled to ~4%
  // steps — the e-paper repaints on every change, so per-frame updates would
  // thrash the panel; speed is measured over the interval between pushes.
  updateBar() {
    const total = uploadTotalBytes()
    const sent = uploadSentBytes()
    if (total <= 0) return // no active upload yet

    const pct = Math.round((sent / total) * 100)
    if (pct == this.syncBarPct) return
    if (!(pct == 0 || pct == 100 || pct - this.syncBarPct >= 4 || this.syncBarPct - pct >= 4)) return

    const now = Date.now()
    let kbps = 0
    if (this.syncLastMs > 0 && now > this.syncLastMs && sent > this.syncLastSent) {
      kbps = Math.round((((sent - this.syncLastSent) / (now - this.syncLastMs)) * 1000) / 1024)
    }
    this.syncLastSent = sent
    this.syncLastMs = now
    this.syncBarPct = pct
    this.syncBarWidth = `${pct}%`

    // Separators are plain spaces: the baked Inter atlas has no middle-dot
    // glyph (it renders as '?'), but digits / '/' / '%' are all present.
    const totalMb = Math.round((total / 1048576) * 10) / 10
    if (pct >= 100) {
      // Upload finished; Soniox is transcribing server-side now.
      this.syncDetail = totalMb + ' MB uploaded, transcribing'
    } else {
      const sentMb = Math.round((sent / 1048576) * 10) / 10
      this.syncDetail = sentMb + '/' + totalMb + ' MB   ' + pct + '%   ' + kbps + ' KB/s'
    }
  }

  startNextNote() {
    const notes = voiceNotesLibrary.notes
    while (this.syncNoteIndex < notes.length) {
      const note = notes[this.syncNoteIndex]
      this.syncNoteIndex = this.syncNoteIndex + 1
      if (note.pending == 0) continue

      this.syncNoteId = note.id
      this.syncNoteLabel = noteLabel(note.number)
      this.syncMessage = 'Transcribing ' + this.syncNoteLabel
      this.syncBarWidth = '0%'
      this.syncBarPct = -1
      this.syncDetail = ''
      this.syncLastSent = 0
      this.syncLastMs = 0
      this.syncJobId = startTranscriptionJob(noteTranscriptionPath(note))
      if (this.syncJobId > 0) {
        this.syncPhase = SYNC_WAIT_TRANSCRIPT
        return
      }

      this.syncErrors = this.syncErrors + 1
      this.syncMessage = 'Failed ' + this.syncNoteLabel
      this.syncDetail = transcriptionError()
    }

    this.finishSync()
  }

  finishSync() {
    this.syncActive = 0
    this.syncPhase = SYNC_IDLE
    this.syncJobId = 0
    this.syncNoteId = ''
    this.syncNoteLabel = ''
    this.syncBarWidth = '0%'
    this.syncBarPct = -1
    // Keep the last failure reason on screen when something failed; clear it on
    // a clean run.
    if (this.syncErrors == 0) this.syncDetail = ''
    this.syncMessage = this.syncErrors > 0 ? '' + this.syncErrors + ' sync failed' : 'All notes synced'
  }

  failSync(message: string) {
    this.syncActive = 0
    this.syncPhase = SYNC_IDLE
    this.syncJobId = 0
    this.syncNoteId = ''
    this.syncNoteLabel = ''
    this.syncMessage = message
  }

  cancel() {
    cancelTranscriptionJob(this.syncJobId)
    if (this.syncActive) {
      this.syncActive = 0
      this.syncMessage = 'Sync stopped'
    }
    this.syncPhase = SYNC_IDLE
    this.syncJobId = 0
    this.syncNoteId = ''
    this.syncNoteLabel = ''
  }
}

export const voiceNotesSync = new VoiceNotesSyncStore()
