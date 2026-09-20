import { Component } from "@geastack/core";import './RecordingScreen.css';
import {
  RECORDING_ACTION_DISCARD,
  RECORDING_ACTION_STOP,
  voiceNotesRecording } from
'../../stores/RecordingStore';export class RecordingScreen extends Component {template() {


    return (
      <div class="vn-screen vn-recording">
      <div class="vn-recording-disc">
        <span class="vn-recording-dot" />
      </div>
      <span class="vn-recording-time">{voiceNotesRecording.recordingLabel}</span>
      <span class="vn-recording-caption">recording</span>
      <div class="vn-recording-actions">
        <div class={{ 'is-active': voiceNotesRecording.recordingActionIndex == RECORDING_ACTION_STOP }}>
          Stop
        </div>
        <div class={{ 'is-active': voiceNotesRecording.recordingActionIndex == RECORDING_ACTION_DISCARD }}>
          Discard
        </div>
      </div>
    </div>);}}