export interface VoiceNote {
  id: string
  number: number
  tagId: string
  createdAtMs: number
  durationMs: number
  transcript: string
  audioPath: string
  pending: number
}

export interface VoiceNoteSettings {
  soundsEnabled: number
  nextNoteNumber: number
}

// The whole persisted store, written as one JSON file on the SD card next to the
// audio (`/sdcard/notes/library.json`): the note list (transcripts included, per
// note) plus the settings. Typed so `JSON.parse(...) as VoiceNoteLibrary` decodes
// straight into native structs.
export interface VoiceNoteLibrary {
  version: number
  nextNoteNumber: number
  soundsEnabled: number
  notes: VoiceNote[]
}

export interface VoiceNoteRow {
  id: string
  label: string
  tagName: string
  preview: string
  selected: boolean
}

export interface NoteCounts {
  total: number
  pending: number
  transcribed: number
}

export function createEmptyNote(): VoiceNote {
  return {
    id: '',
    number: 0,
    tagId: 'note',
    createdAtMs: 0,
    durationMs: 0,
    transcript: '',
    audioPath: '',
    pending: 0
  }
}

export function createTaggedNote(note: VoiceNote, tagId: string): VoiceNote {
  return {
    id: note.id,
    number: note.number,
    tagId,
    createdAtMs: note.createdAtMs,
    durationMs: note.durationMs,
    transcript: note.transcript,
    audioPath: note.audioPath,
    pending: note.pending
  }
}

export const DEFAULT_SETTINGS: VoiceNoteSettings = {
  soundsEnabled: 1,
  nextNoteNumber: 1
}
