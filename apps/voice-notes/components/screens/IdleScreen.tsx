import { Component } from "@geastack/core";import './IdleScreen.css';
import { voiceNotesLibrary } from '../../stores/NoteLibraryStore';
import { IDLE_ACTION_MENU, IDLE_ACTION_RECORD, voiceNotesNavigation } from '../../stores/NavigationStore';export class IdleScreen extends Component {template() {


    return (
      <div class="vn-screen vn-idle">
      <div class="vn-idle-meter">
        <div class="vn-idle-core">
          <span class="vn-idle-state">{voiceNotesNavigation.status}</span>
        </div>
      </div>
      <div class="vn-idle-summary">
        {voiceNotesLibrary.totalCount} notes / {voiceNotesLibrary.pendingCount} pending
      </div>
      <div class="vn-idle-actions">
        <div class={{ 'is-active': voiceNotesNavigation.idleActionIndex == IDLE_ACTION_RECORD }}>
          Record
        </div>
        <div class={{ 'is-active': voiceNotesNavigation.idleActionIndex == IDLE_ACTION_MENU }}>
          Menu
        </div>
      </div>
    </div>);}}