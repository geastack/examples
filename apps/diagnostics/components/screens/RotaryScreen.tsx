import { Component } from '@geastack/core'
import { diag } from '../../stores/DiagnosticsStore'
import './NotPresent.css'

export class RotaryScreen extends Component {
  template() {
    return (
      <div class="screen-body rotary-screen">
        {diag.curState == 'live' ? (
          <div class="rotary-live">
            <div class="kv-row"><span class="kv-k">ENCODER</span><span class="kv-v">{diag.curDetail}</span></div>
            <div class="value-big">{diag.rotaryValue}</div>
            <div class="kv-row"><span class="kv-k">HINT</span><span class="kv-v">TURN THE DIAL</span></div>
          </div>
        ) : (
          <div class="not-present">
            <span class={`state-badge badge-${diag.curState}`}>{diag.curBadge}</span>
            <span class="not-present-msg">{diag.curMsg}</span>
            <span class="not-present-detail">{diag.curDetail}</span>
          </div>
        )}
      </div>
    )
  }
}
