import { Store } from '@geastack/core'
import { formatCreated, formatDuration, noteLabel } from '../shared/noteText'
import {
  collectCounts,
  countForTag,
  findNoteIndex,
  firstVisibleNote,
  nextNoteNumberAfter,
  nextVisibleNote,
  noteTranscriptPage,
  visibleNotes
} from '../shared/noteQueries'
import { TAG_ALL, TAG_NOTE, tagName } from '../shared/tags'
import { createEmptyNote, type VoiceNote, type VoiceNoteRow } from '../shared/notes'

export const DETAIL_ACTION_PLAY = 0
export const DETAIL_ACTION_MORE = 1
export const DETAIL_ACTION_NEXT = 2
export const DETAIL_ACTION_DELETE = 3
export const DETAIL_ACTION_BACK = 4

export const DELETE_ACTION_DELETE = 0
export const DELETE_ACTION_BACK = 1
export const NOTE_LIST_VISIBLE_ROWS = 3

export class VoiceNotesLibraryStore extends Store {
  notes: VoiceNote[] = []
  nextNoteNumber = 1
  selectedNote: VoiceNote = {
    id: '',
    number: 0,
    tagId: TAG_NOTE,
    createdAtMs: 0,
    durationMs: 0,
    transcript: '',
    audioPath: '',
    pending: 0
  }
  hasSelection = 0
  selectedLabelText = '#---'
  selectedTagNameText = 'Note'
  selectedCreatedLabelText = 'No time'
  selectedDurationLabelText = '00:00'
  selectedTranscriptPageText = 'not synced'
  selectedAudioPathText = ''
  detailPage = 0
  detailActionIndex = DETAIL_ACTION_PLAY
  hasMoreTranscript = 0
  noteListBackSelected = 0
  deleteActionIndex = DELETE_ACTION_DELETE

  totalCount = 0
  pendingCount = 0
  transcribedCount = 0
  filteredCount = 0
  filterTagId = TAG_ALL
  filterNameText = 'All'
  noteListWindowStart = 0
  noteListBackVisible = 0
  rows: VoiceNoteRow[] = []

  nextNumberFromNotes(): number {
    return nextNoteNumberAfter(this.notes)
  }

  refreshViewModel() {
    this.filterNameText = tagName(this.filterTagId)
    this.selectedLabelText = noteLabel(this.selectedNote.number)
    this.selectedTagNameText = tagName(this.selectedNote.tagId)
    this.selectedCreatedLabelText = formatCreated(this.selectedNote.createdAtMs, Date.now())
    this.selectedDurationLabelText = formatDuration(this.selectedNote.durationMs)
    this.selectedTranscriptPageText = noteTranscriptPage(this.selectedNote, this.detailPage, 190)
    this.selectedAudioPathText = this.selectedNote.audioPath
    this.hasMoreTranscript = this.selectedNote.transcript.length > 190 ? 1 : 0
    if (!this.hasMoreTranscript && this.detailActionIndex == DETAIL_ACTION_MORE) this.detailActionIndex = DETAIL_ACTION_NEXT
  }

  noteMatchesFilter(note: VoiceNote): number {
    if (this.filterTagId == TAG_ALL) return 1
    return note.tagId == this.filterTagId ? 1 : 0
  }

  refreshRows() {
    const visible = visibleNotes(this.notes, this.filterTagId)
    let selectedIndex = -1
    for (let i = 0; i < visible.length; i++) {
      if (visible[i].id == this.selectedNote.id) selectedIndex = i
    }

    let start = this.noteListWindowStart
    if (this.noteListBackSelected) {
      start = visible.length - 2
    } else if (selectedIndex >= 0) {
      if (selectedIndex < start) start = selectedIndex
      if (selectedIndex >= start + NOTE_LIST_VISIBLE_ROWS) start = selectedIndex - NOTE_LIST_VISIBLE_ROWS + 1
    } else {
      start = 0
    }
    if (start < 0) start = 0
    if (start > visible.length) start = visible.length
    this.noteListWindowStart = start

    const rows: VoiceNoteRow[] = []
    for (let i = start; i < visible.length && rows.length < NOTE_LIST_VISIBLE_ROWS; i++) {
      const note = visible[i]
      rows.push({
        id: note.id,
        label: noteLabel(note.number),
        tagName: tagName(note.tagId),
        preview: '',
        selected: !this.noteListBackSelected && note.id == this.selectedNote.id
      })
    }
    this.rows = rows
    this.noteListBackVisible = this.noteListBackSelected || this.filteredCount == 0 ? 1 : 0
  }

  refreshLists() {
    const counts = collectCounts(this.notes)
    this.totalCount = counts.total
    this.pendingCount = counts.pending
    this.transcribedCount = counts.transcribed
    this.filteredCount = countForTag(this.notes, this.filterTagId)
    this.refreshRows()
    this.refreshViewModel()
  }

  selectNote(note: VoiceNote) {
    this.selectedNote = note
    this.hasSelection = note.id.length > 0 ? 1 : 0
    this.noteListBackSelected = 0
    this.detailPage = 0
    this.detailActionIndex = DETAIL_ACTION_PLAY
    this.refreshRows()
    this.refreshViewModel()
  }

  clearSelection() {
    this.selectedNote = createEmptyNote()
    this.hasSelection = 0
    this.noteListBackSelected = 0
    this.detailPage = 0
    this.detailActionIndex = DETAIL_ACTION_PLAY
    this.refreshRows()
    this.refreshViewModel()
  }

  nextDetailAction() {
    if (this.detailActionIndex == DETAIL_ACTION_PLAY) {
      this.detailActionIndex = this.hasMoreTranscript ? DETAIL_ACTION_MORE : DETAIL_ACTION_NEXT
    } else if (this.detailActionIndex == DETAIL_ACTION_MORE) {
      this.detailActionIndex = DETAIL_ACTION_NEXT
    } else if (this.detailActionIndex == DETAIL_ACTION_NEXT) {
      this.detailActionIndex = DETAIL_ACTION_DELETE
    } else if (this.detailActionIndex == DETAIL_ACTION_DELETE) {
      this.detailActionIndex = DETAIL_ACTION_BACK
    } else {
      this.detailActionIndex = DETAIL_ACTION_PLAY
    }
  }

  selectBackRow() {
    this.selectedNote = createEmptyNote()
    this.hasSelection = 0
    this.noteListBackSelected = 1
    this.detailPage = 0
    this.detailActionIndex = DETAIL_ACTION_PLAY
    this.refreshRows()
    this.refreshViewModel()
  }

  selectFirstVisible() {
    const note = firstVisibleNote(this.notes, this.filterTagId)
    if (note.id.length > 0) this.selectNote(note)
    else this.selectBackRow()
  }

  selectNextVisible() {
    if (this.filteredCount <= 0 || this.noteListBackSelected) {
      this.selectFirstVisible()
      return
    }

    const first = firstVisibleNote(this.notes, this.filterTagId)
    const note = nextVisibleNote(this.notes, this.selectedNote.id, this.filterTagId)
    if (note.id == first.id && this.selectedNote.id.length > 0) {
      this.selectBackRow()
      return
    }
    if (note.id.length > 0) this.selectNote(note)
  }

  applyFilter(tagId: string) {
    this.filterTagId = tagId
    this.refreshLists()
    if (this.hasSelection && this.noteMatchesFilter(this.selectedNote)) return
    this.selectFirstVisible()
  }

  addNote(note: VoiceNote) {
    this.notes.unshift(note)
    this.nextNoteNumber = note.number + 1
    this.noteListBackSelected = 0
    this.refreshLists()
  }

  resetDeleteAction() {
    this.deleteActionIndex = DELETE_ACTION_DELETE
  }

  nextDeleteAction() {
    this.deleteActionIndex = this.deleteActionIndex == DELETE_ACTION_DELETE ? DELETE_ACTION_BACK : DELETE_ACTION_DELETE
  }

  noteWithTranscript(note: VoiceNote, transcript: string): VoiceNote {
    return {
      id: note.id,
      number: note.number,
      tagId: note.tagId,
      createdAtMs: note.createdAtMs,
      durationMs: note.durationMs,
      transcript,
      audioPath: note.audioPath,
      pending: 0
    }
  }

  applyTranscript(noteId: string, transcript: string): number {
    const index = findNoteIndex(this.notes, noteId)
    if (index < 0) return 0

    const note = this.notes[index]
    this.notes.splice(index, 1, this.noteWithTranscript(note, transcript))
    if (this.selectedNote.id == noteId) this.selectedNote = this.noteWithTranscript(this.selectedNote, transcript)
    this.refreshLists()
    return 1
  }

  deleteSelected(): number {
    if (!this.hasSelection) return 0
    const index = findNoteIndex(this.notes, this.selectedNote.id)
    if (index >= 0) this.notes.splice(index, 1)
    this.applyFilter(this.filterTagId)
    return 1
  }
}

export const voiceNotesLibrary = new VoiceNotesLibraryStore()
