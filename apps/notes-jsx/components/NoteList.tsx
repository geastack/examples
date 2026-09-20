import './NoteList.css'
import { notes } from '../stores/NotesStore'

// Note rows via one keyed-list .map(). The list pane is a native content-list
// split item; this content is its (translucent) body. No <vibrancy> wrapper.
function NoteRows() {
  return (
    <div class="note-list-scroll">
      {notes.notes.map(note => (
        <div
          class={note.selected ? 'note-row note-row-selected' : 'note-row'}
          style={{ display: note.visible ? 'flex' : 'none' }}
          onClick={() => notes.selectNote(note.id)}
        >
          <span class="note-row-title">{note.title}</span>
          <div class="note-row-meta">
            <span class={note.selected ? 'note-row-date note-row-date-sel' : 'note-row-date'}>{note.date}</span>
            <span class={note.selected ? 'note-row-preview note-row-preview-sel' : 'note-row-preview'}>{note.preview}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export function NoteList() {
  return (
    <div class="note-list">
      <div class="note-list-header">
        <span class="note-list-title">{notes.currentFolderName}</span>
        <div class="note-list-count-row">
          <span class="note-list-count">{notes.currentNoteCount}</span>
          <span class="note-list-count">notes</span>
        </div>
      </div>
      <NoteRows />
      {/* Hidden trigger so the native New Note toolbar item (data-action="newNote")
          can fire this onClick by element id. */}
      <div id="newNote" class="note-list-hidden-action" onClick={() => notes.newNote()} />
    </div>
  )
}
