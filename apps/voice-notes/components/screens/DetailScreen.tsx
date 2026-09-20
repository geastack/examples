import { Component } from "@geastack/core";import './DetailScreen.css';
import {
  DETAIL_ACTION_BACK,
  DETAIL_ACTION_DELETE,
  DETAIL_ACTION_MORE,
  DETAIL_ACTION_NEXT,
  DETAIL_ACTION_PLAY,
  voiceNotesLibrary } from
'../../stores/NoteLibraryStore';export class DetailScreen extends Component {template() {


    return (
      <div class="vn-screen vn-detail">
      <div class="vn-detail-head">
        <span>{voiceNotesLibrary.selectedLabelText}</span>
        <span>{voiceNotesLibrary.selectedTagNameText}</span>
      </div>
      <div class="vn-detail-meta">
        <span>{voiceNotesLibrary.selectedCreatedLabelText}</span>
        <span>{voiceNotesLibrary.selectedDurationLabelText}</span>
      </div>
      <div class="vn-transcript">
        {voiceNotesLibrary.selectedTranscriptPageText}
      </div>
      <span class="vn-audio-path">{voiceNotesLibrary.selectedAudioPathText}</span>
      <div class="vn-detail-actions">
        <div class={{ 'is-active': voiceNotesLibrary.detailActionIndex == DETAIL_ACTION_PLAY }}>
          Play
        </div>
        {voiceNotesLibrary.hasMoreTranscript ?
          <div class={{ 'is-active': voiceNotesLibrary.detailActionIndex == DETAIL_ACTION_MORE }}>
            More
          </div> :
          null}
        <div class={{ 'is-active': voiceNotesLibrary.detailActionIndex == DETAIL_ACTION_NEXT }}>
          Next
        </div>
        <div class={{ 'is-active': voiceNotesLibrary.detailActionIndex == DETAIL_ACTION_DELETE, 'is-danger': true }}>
          Delete
        </div>
        <div class={{ 'is-active': voiceNotesLibrary.detailActionIndex == DETAIL_ACTION_BACK }}>
          Back
        </div>
      </div>
    </div>);}}
