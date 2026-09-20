import { Component } from "@geastack/core";import './SyncScreen.css';
import { voiceNotesSync } from '../../stores/SyncStore';export class SyncScreen extends Component {template() {


    return (
      <div class="vn-screen vn-sync">
      <span class="vn-screen-title">sync</span>
      <div class="vn-sync-glyph">
        {voiceNotesSync.syncDone}
      </div>
      <span class="vn-sync-label">{voiceNotesSync.syncDone} / {voiceNotesSync.syncTotal}</span>
      <div class="vn-sync-bar">
        <div class="vn-sync-bar-fill" style={{ width: voiceNotesSync.syncBarWidth }} />
      </div>
      <span class="vn-status-copy">{voiceNotesSync.syncMessage}</span>
      <span class="vn-sync-detail">{voiceNotesSync.syncDetail}</span>
      <div class="vn-single-action is-active">Back</div>
    </div>);}}