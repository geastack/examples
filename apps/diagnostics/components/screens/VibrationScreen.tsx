import { Component } from '@geastack/core'
import { diag } from '../../stores/DiagnosticsStore'
import './NotPresent.css'

export class VibrationScreen extends Component {
  template() {
    // Haptics exist only on the geaos devices (detected-but-unprobed); absent on
    // every embedded board. Always renders its state, never live.
    return (
      <div class="screen-body vibration-screen">
        <div class="not-present">
          <span class={`state-badge badge-${diag.curState}`}>{diag.curBadge}</span>
          <span class="not-present-msg">{diag.curMsg}</span>
          <span class="not-present-detail">{diag.curDetail}</span>
        </div>
      </div>
    )
  }
}
