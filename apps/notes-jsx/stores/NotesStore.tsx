import { Store } from '@geastack/core'
import notesData from '../data/notes.json'

// All content is synthetic/generated sample data (data/notes.json) — no personal data.
export class NotesStore extends Store {
  selectedFolderId = 'all'
  currentFolderName = 'All Notes'
  currentNoteCount = 50

  // Per-folder counts for the sidebar (computed in init()).
  countAll = 50
  countPersonal = 0
  countWork = 0
  countIdeas = 0
  countTravel = 0
  countArchive = 0

  selectedNoteId = notesData.selectedNoteId
  selectedTitle = notesData.selectedTitle
  selectedDate = notesData.selectedDate
  selectedBody = notesData.selectedBody
  nextId = 1

  notes = notesData.notes

  init() {
    // Compute per-folder counts from the generated data.
    let cPersonal = 0
    let cWork = 0
    let cIdeas = 0
    let cTravel = 0
    let cArchive = 0
    for (let i = 0; i < this.notes.length; i++) {
      const f = this.notes[i].folderId
      if (f === 'personal') cPersonal = cPersonal + 1
      else if (f === 'work') cWork = cWork + 1
      else if (f === 'ideas') cIdeas = cIdeas + 1
      else if (f === 'travel') cTravel = cTravel + 1
      else if (f === 'archive') cArchive = cArchive + 1
    }
    this.countAll = this.notes.length
    this.countPersonal = cPersonal
    this.countWork = cWork
    this.countIdeas = cIdeas
    this.countTravel = cTravel
    this.countArchive = cArchive
    this.currentNoteCount = this.notes.length
  }

  selectFolder(folderId: string) {
    this.selectedFolderId = folderId
    let count = 0
    let firstVisible = ''
    for (let i = 0; i < this.notes.length; i++) {
      const inFolder = folderId === 'all' || this.notes[i].folderId === folderId
      this.notes[i].visible = inFolder ? 1 : 0
      if (inFolder) {
        count = count + 1
        if (firstVisible === '') firstVisible = this.notes[i].id
      }
    }
    this.currentNoteCount = count
    if (folderId === 'all') this.currentFolderName = 'All Notes'
    else if (folderId === 'personal') this.currentFolderName = 'Personal'
    else if (folderId === 'work') this.currentFolderName = 'Work'
    else if (folderId === 'ideas') this.currentFolderName = 'Ideas'
    else if (folderId === 'travel') this.currentFolderName = 'Travel'
    else if (folderId === 'archive') this.currentFolderName = 'Archive'
    this.selectNote(firstVisible)
  }

  selectNote(noteId: string) {
    this.selectedNoteId = noteId
    for (let i = 0; i < this.notes.length; i++) {
      this.notes[i].selected = this.notes[i].id === noteId ? 1 : 0
      if (this.notes[i].id === noteId) {
        this.selectedTitle = this.notes[i].title
        this.selectedDate = this.notes[i].date
        this.selectedBody = this.notes[i].body
      }
    }
  }

  updateTitle(value: string) {
    this.selectedTitle = value
    for (let i = 0; i < this.notes.length; i++) {
      if (this.notes[i].id === this.selectedNoteId) {
        this.notes[i].title = value
        return
      }
    }
  }

  updateBody(value: string) {
    this.selectedBody = value
    let preview = ''
    const lines = value.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line !== '') {
        preview = line
        break
      }
    }
    if (preview === '') preview = 'No additional text'
    for (let i = 0; i < this.notes.length; i++) {
      if (this.notes[i].id === this.selectedNoteId) {
        this.notes[i].body = value
        this.notes[i].preview = preview
        return
      }
    }
  }

  newNote() {
    const idNum = this.nextId
    this.nextId = idNum + 1
    const newId = 'new-' + idNum
    this.notes.unshift({
      id: newId,
      folderId: 'personal',
      title: 'New Note',
      date: 'Now',
      preview: 'No additional text',
      body: '',
      selected: 0,
      visible: 1
    })

    this.selectedNoteId = newId
    this.selectedTitle = 'New Note'
    this.selectedDate = 'Now'
    this.selectedBody = ''
    for (let i = 0; i < this.notes.length; i++) {
      this.notes[i].selected = this.notes[i].id === newId ? 1 : 0
    }
  }
}

export const notes = new NotesStore()
