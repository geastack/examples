import { Component } from "@geastack/core";import './TransferScreen.css';
import { voiceNotesTransfer } from '../../stores/TransferStore';export class TransferScreen extends Component {template() {


    return (
      <div class="vn-screen vn-transfer">
      <span class="vn-screen-title">transfer</span>
      <div class="vn-portal-card">
        <span class="vn-portal-title">web portal</span>
        <span class="vn-portal-state">{voiceNotesTransfer.transferStateLabel}</span>
      </div>
      <span class="vn-transfer-ip">{voiceNotesTransfer.transferAddress}</span>
      <span class="vn-status-copy">{voiceNotesTransfer.transferMessage}</span>
      <div class="vn-single-action is-active">Back</div>
    </div>);}}