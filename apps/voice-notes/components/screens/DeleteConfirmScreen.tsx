import { Component } from "@geastack/core";import './DeleteConfirmScreen.css';
import { DELETE_ACTION_BACK, DELETE_ACTION_DELETE, voiceNotesLibrary } from '../../stores/NoteLibraryStore';export class DeleteConfirmScreen extends Component {template() {


    return (
      <div class="vn-screen vn-delete">
      <span class="vn-delete-title">DELETE</span>
      <span class="vn-delete-note">{voiceNotesLibrary.selectedLabelText}</span>
      <span class="vn-status-copy">WAV + TXT + meta</span>
      <div class="vn-delete-actions">
        <div class={{ 'is-active': voiceNotesLibrary.deleteActionIndex == DELETE_ACTION_DELETE, 'is-danger': true }}>
          Delete
        </div>
        <div class={{ 'is-active': voiceNotesLibrary.deleteActionIndex == DELETE_ACTION_BACK }}>
          Back
        </div>
      </div>
    </div>);}}