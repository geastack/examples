import { readCacheFile, writeCacheFile, readFileRange } from '@geastack/core'
import { TAG_NOTE } from '../shared/tags'
import { DEFAULT_SETTINGS, type VoiceNote, type VoiceNoteLibrary, type VoiceNoteSettings } from '../shared/notes'
import { noteAudioPath } from '../shared/noteText'

// Everything lives on the SD card now, in one self-contained JSON file next to
// the audio. Pull the card and you have the .wav files plus the full list,
// transcripts, and settings.
const LIBRARY_PATH = '/sdcard/notes/library.json'
const LIBRARY_VERSION = 1

// Legacy flash localStorage keys. Read once to migrate the old list onto the
// card, then cleared. No longer the source of truth.
const LEGACY_NOTES_KEY = 'voice_notes_v1'
const LEGACY_SOUNDS_KEY = 'voice_notes_sounds'
const LEGACY_NEXT_NUMBER_KEY = 'voice_notes_next_number'

const NOTE_LINE_SEPARATOR = '\n'
const NOTE_FIELD_SEPARATOR = '\t'

// WAV header layout: the `data` chunk size is the 4-byte LE field at offset 40.
const WAV_DATA_SIZE_OFFSET = 40

let libraryLoaded = 0
const library: VoiceNoteLibrary = {
  version: LIBRARY_VERSION,
  nextNoteNumber: DEFAULT_SETTINGS.nextNoteNumber,
  soundsEnabled: DEFAULT_SETTINGS.soundsEnabled,
  notes: []
}

function decodeField(value: string): string {
  if (value.length == 0) return ''
  return decodeURIComponent(value)
}

function partAt(parts: string[], index: number): string {
  if (index < 0 || index >= parts.length) return ''
  return parts[index]
}

function numberAt(parts: string[], index: number): number {
  const value = Number(partAt(parts, index))
  if (value > 0) return value
  return 0
}

function normalizeAudioPath(path: string, number: number): string {
  if (path.indexOf('/notes/') == 0) return '/sdcard' + path
  if (path.length > 0) return path
  return number > 0 ? noteAudioPath(number) : ''
}

function normalizeNoteFields(
  id: string,
  rawNumber: number,
  tagId: string,
  createdAtMs: number,
  durationMs: number,
  transcript: string,
  audioPath: string,
  pending: number,
  fallbackNumber: number
): VoiceNote {
  const number = rawNumber > 0 ? Math.floor(rawNumber) : fallbackNumber
  return {
    id: id.length > 0 ? id : 'note-' + number,
    number,
    tagId: tagId.length > 0 ? tagId : TAG_NOTE,
    createdAtMs: createdAtMs > 0 ? createdAtMs : 0,
    durationMs: durationMs > 0 ? Math.floor(durationMs) : 0,
    transcript,
    audioPath: normalizeAudioPath(audioPath, number),
    pending: pending ? 1 : 0
  }
}

function normalizeNote(note: VoiceNote, fallbackNumber: number): VoiceNote {
  return normalizeNoteFields(
    note.id,
    note.number,
    note.tagId,
    note.createdAtMs,
    note.durationMs,
    note.transcript,
    note.audioPath,
    note.pending,
    fallbackNumber
  )
}

// --- microSD file <-> string -------------------------------------------------

function bytesFromString(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 255
  return bytes
}

function stringFromBytes(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    // Read the byte into a `number` local first: a direct typed-array element
    // inside String.fromCharCode lowers to a uint8_t in an initializer_list<double>
    // (a -Werror=narrowing error). The intermediate widens it to double.
    const code = bytes[i]
    out += String.fromCharCode(code)
  }
  return out
}

function readLibraryText(): string {
  const bytes = readCacheFile(LIBRARY_PATH)
  if (bytes.length == 0) return ''
  return stringFromBytes(bytes)
}

function writeLibrary(): number {
  const text = JSON.stringify(library)
  return writeCacheFile(LIBRARY_PATH, bytesFromString(text)) ? 1 : 0
}

// --- load / migrate ----------------------------------------------------------

function adoptParsedLibrary(text: string): number {
  try {
    const parsed = JSON.parse(text) as VoiceNoteLibrary
    const notes = parsed.notes
    const cleaned: VoiceNote[] = []
    for (let i = 0; i < notes.length; i++) cleaned.push(normalizeNote(notes[i], i + 1))
    library.notes = cleaned
    library.soundsEnabled = parsed.soundsEnabled ? 1 : 0
    library.nextNoteNumber = parsed.nextNoteNumber > 0 ? Math.floor(parsed.nextNoteNumber) : DEFAULT_SETTINGS.nextNoteNumber
    return 1
  } catch {
    return 0
  }
}

// A note "has audio" only if its WAV carries a non-empty data chunk. A missing
// file reads back empty; a 44-byte header-only stub reports data size 0. Both
// are dropped during migration.
function noteHasAudio(path: string): number {
  if (path.length == 0) return 0
  const head = readFileRange(path, WAV_DATA_SIZE_OFFSET, 4)
  if (head.length < 4) return 0
  const dataBytes = head[0] + head[1] * 256 + head[2] * 65536 + head[3] * 16777216
  return dataBytes > 0 ? 1 : 0
}

function parseLegacyNotes(raw: string): VoiceNote[] {
  const cleaned: VoiceNote[] = []
  const lines = raw.split(NOTE_LINE_SEPARATOR)
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length == 0) continue
    const parts = lines[i].split(NOTE_FIELD_SEPARATOR)
    cleaned.push(
      normalizeNoteFields(
        decodeField(partAt(parts, 0)),
        numberAt(parts, 1),
        decodeField(partAt(parts, 2)),
        numberAt(parts, 3),
        numberAt(parts, 4),
        decodeField(partAt(parts, 5)),
        decodeField(partAt(parts, 6)),
        numberAt(parts, 7),
        i + 1
      )
    )
  }
  return cleaned
}

function migrateFromLegacy() {
  const legacyNotes = parseLegacyNotes(localStorage.getItem(LEGACY_NOTES_KEY))
  const kept: VoiceNote[] = []
  for (let i = 0; i < legacyNotes.length; i++) {
    if (noteHasAudio(legacyNotes[i].audioPath)) kept.push(legacyNotes[i])
  }
  library.notes = kept

  const soundsRaw = localStorage.getItem(LEGACY_SOUNDS_KEY)
  library.soundsEnabled = soundsRaw == '0' ? 0 : DEFAULT_SETTINGS.soundsEnabled
  const nextRaw = Number(localStorage.getItem(LEGACY_NEXT_NUMBER_KEY))
  library.nextNoteNumber = nextRaw > 0 ? Math.floor(nextRaw) : DEFAULT_SETTINGS.nextNoteNumber

  // Only retire the flash keys once the card actually accepted the write, so a
  // missing/unwritable card never silently drops the old list.
  if (writeLibrary()) {
    localStorage.removeItem(LEGACY_NOTES_KEY)
    localStorage.removeItem(LEGACY_SOUNDS_KEY)
    localStorage.removeItem(LEGACY_NEXT_NUMBER_KEY)
  }
}

function ensureLoaded() {
  if (libraryLoaded) return
  libraryLoaded = 1
  const text = readLibraryText()
  if (text.length > 0 && adoptParsedLibrary(text)) return
  migrateFromLegacy()
}

// --- public API (unchanged signatures) --------------------------------------

export function loadVoiceNotes(): VoiceNote[] {
  ensureLoaded()
  return library.notes
}

export function saveVoiceNotes(notes: VoiceNote[]) {
  ensureLoaded()
  library.notes = notes
  writeLibrary()
}

export function loadVoiceNoteSettings(): VoiceNoteSettings {
  ensureLoaded()
  return {
    soundsEnabled: library.soundsEnabled,
    nextNoteNumber: library.nextNoteNumber
  }
}

export function saveVoiceNoteSettings(soundsEnabled: number, nextNoteNumber: number) {
  ensureLoaded()
  library.soundsEnabled = soundsEnabled ? 1 : 0
  library.nextNoteNumber = nextNoteNumber > 0 ? Math.floor(nextNoteNumber) : DEFAULT_SETTINGS.nextNoteNumber
  writeLibrary()
}
