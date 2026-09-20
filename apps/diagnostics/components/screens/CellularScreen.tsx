import { Component } from '@geastack/core'
import { diag } from '../../stores/DiagnosticsStore'
import './NotPresent.css'

export class CellularScreen extends Component {
  template() {
    // Cellular exists only on the geaos phones/watches (detected-but-unexercised);
    // absent on every embedded board. Always renders its state, never live.
    return (
      <div class="screen-body cellular-screen">
        <div class="not-present">
          <span class={`state-badge badge-${diag.curState}`}>{diag.curBadge}</span>
          <span class="not-present-msg">{diag.curMsg}</span>
          <span class="not-present-detail">{diag.curDetail}</span>
        </div>
      </div>
    )
  }
}
