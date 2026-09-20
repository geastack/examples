import { Component } from "@geastack/core";import './TagSelectScreen.css';
import { RECORDING_TAGS } from '../../shared/tags';
import { RECORDING_TAG_BACK, voiceNotesRecording } from '../../stores/RecordingStore';export class TagSelectScreen extends Component {template() {


    return (
      <div class="vn-screen vn-tag-select">
      <span class="vn-screen-title">choose tag</span>
      <span class="vn-saved-note">{voiceNotesRecording.pendingRecordedLabelText}</span>
      <div class="vn-tag-stack">
        {RECORDING_TAGS.map((tag) =>
          <div class={{ 'is-active': voiceNotesRecording.draftTagIndex == tag.index }}>
            {tag.name}
          </div>
          )}
        <div class={{ 'is-active': voiceNotesRecording.draftTagIndex == RECORDING_TAG_BACK }}>
          Back
        </div>
      </div>
    </div>);}}