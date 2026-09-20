import { clipText, noteLabel } from './noteText'
import { TAG_ALL, tagName } from './tags'
import { createEmptyNote } from './notes'
import type { NoteCounts, VoiceNote, VoiceNoteRow } from './notes'

export function noteIsPending(note: VoiceNote): number {
  if (note.pending) return 1
  return note.transcript.length == 0 ? 1 : 0
}

export function notePreview(note: VoiceNote): string {
  if (note.transcript.length > 0) return clipText(note.transcript, 58)
  return 'not synced'
}

export function noteTranscriptPage(note: VoiceNote, page: number, pageSize: number): string {
  if (note.transcript.length == 0) return 'not synced'
  if (page <= 0) return clipText(note.transcript, pageSize)
  if (note.transcript.length <= pageSize) return note.transcript
  return note.transcript.substring(pageSize, pageSize * 2)
}

export function collectCounts(notes: VoiceNote[]): NoteCounts {
  let pending = 0
  for (let i = 0; i < notes.length; i++) {
    if (noteIsPending(notes[i])) pending = pending + 1
  }
  return {
    total: notes.length,
    pending,
    transcribed: notes.length - pending
  }
}

export function countForTag(notes: VoiceNote[], tagId: string): number {
  if (tagId == TAG_ALL) return notes.length
  let count = 0
  for (let i = 0; i < notes.length; i++) {
    if (notes[i].tagId == tagId) count = count + 1
  }
  return count
}

export function nextNoteNumberAfter(notes: VoiceNote[]): number {
  let next = 1
  for (let i = 0; i < notes.length; i++) {
    const afterNote = notes[i].number + 1
    if (afterNote > next) next = afterNote
  }
  return next
}

export function visibleNotes(notes: VoiceNote[], tagId: string): VoiceNote[] {
  if (tagId == TAG_ALL) return notes.slice()
  return notes.filter(note => note.tagId == tagId)
}

export function visibleNoteRows(notes: VoiceNote[], tagId: string, selectedId: string): VoiceNoteRow[] {
  return visibleNotes(notes, tagId).map(note => {
    return {
      id: note.id,
      label: noteLabel(note.number),
      tagName: tagName(note.tagId),
      preview: notePreview(note),
      selected: note.id == selectedId
    }
  })
}

export function findNoteIndex(notes: VoiceNote[], noteId: string): number {
  for (let i = 0; i < notes.length; i++) {
    if (notes[i].id == noteId) return i
  }
  return -1
}

export function firstVisibleNote(notes: VoiceNote[], tagId: string): VoiceNote {
  for (let i = 0; i < notes.length; i++) {
    if (tagId == TAG_ALL || notes[i].tagId == tagId) return notes[i]
  }
  return createEmptyNote()
}

export function nextVisibleNote(notes: VoiceNote[], currentId: string, tagId: string): VoiceNote {
  if (notes.length == 0) return createEmptyNote()
  let cursor = findNoteIndex(notes, currentId)
  if (cursor < 0) cursor = 0
  else cursor = cursor + 1
  if (cursor >= notes.length) cursor = 0
  for (let step = 0; step < notes.length; step++) {
    const note = notes[cursor]
    if (tagId == TAG_ALL || note.tagId == tagId) return note
    cursor = cursor + 1
    if (cursor >= notes.length) cursor = 0
  }
  return createEmptyNote()
}
