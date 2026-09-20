import { Component } from '@geastack/core'
import { diag } from '../../stores/DiagnosticsStore'
import './NotPresent.css'

export class TemperatureScreen extends Component {
  template() {
    return (
      <div class="screen-body temperature-screen">
        {diag.curState == 'live' ? (
          <div class="temperature-live">
            <div class="kv-row"><span class="kv-k">SOURCE</span><span class="kv-v">{diag.curDetail}</span></div>
            <div class="value-big">{diag.dieTempText}</div>
            <div class="kv-row"><span class="kv-k">SENSOR</span><span class="kv-v">INTERNAL DIE</span></div>
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
