import './Editor.css'
import { notes } from '../stores/NotesStore'

export function Editor() {
  return (
    <div class="editor">
      <div class="editor-date-wrap">
        <span class="editor-date">{notes.selectedDate}</span>
      </div>
      <div class="editor-title-wrap">
        <input
          class="editor-title-input"
          value={notes.selectedTitle}
          placeholder="Title"
          onInput={event => notes.updateTitle(event.currentTarget.value)}
        />
      </div>
      <div class="editor-body-wrap">
        <textarea
          class="editor-body"
          value={notes.selectedBody}
          onInput={event => notes.updateBody(event.currentTarget.value)}
        />
      </div>
    </div>
  )
}
