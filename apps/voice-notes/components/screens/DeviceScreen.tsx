import { Component } from "@geastack/core";import './DeviceScreen.css';
import { voiceNotesDevice } from '../../stores/DeviceStore';
import { voiceNotesLibrary } from '../../stores/NoteLibraryStore';export class DeviceScreen extends Component {template() {


    return (
      <div class="vn-screen vn-device">
      <span class="vn-screen-title">device</span>
      <div class="vn-device-list">
        <span>firmware v1.0</span>
        <span>battery {voiceNotesDevice.batteryLabel}</span>
        <span>{`${voiceNotesLibrary.totalCount} notes`}</span>
        <span>{`${voiceNotesLibrary.transcribedCount} transcribed`}</span>
        <span>{`${voiceNotesLibrary.pendingCount} pending`}</span>
      </div>
      <div class="vn-single-action is-active">Back</div>
    </div>);}}