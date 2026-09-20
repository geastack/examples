import { Component } from "@geastack/core";import './NoteListScreen.css';
import { voiceNotesLibrary } from '../../stores/NoteLibraryStore';
import { NoteRow } from './NoteRow';export class NoteListScreen extends Component {template() {


    return (
      <div class="vn-screen vn-list">
      <div class="vn-list-head">
        <span>notes</span>
        <span>{voiceNotesLibrary.filteredCount}</span>
      </div>
      <span class="vn-filter-label">{voiceNotesLibrary.filterNameText}</span>
      <div class="vn-note-list">
        {voiceNotesLibrary.rows.map((row) =>
          <NoteRow row={row} />
          )}
        {voiceNotesLibrary.noteListBackVisible ?
          <div class={{ 'vn-note-back': true, 'is-active': voiceNotesLibrary.noteListBackSelected == 1 }}>
            Back
          </div> :
          null}
      </div>
      {voiceNotesLibrary.filteredCount == 0 ?
        <div class="vn-empty">
          no notes
        </div> :
        null}
    </div>);}}
