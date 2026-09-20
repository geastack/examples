import { Component } from '@geastack/core'
import { diag } from '../../stores/DiagnosticsStore'
import './NotPresent.css'

export class RtcScreen extends Component {
  template() {
    return (
      <div class="screen-body rtc-screen">
        {diag.curState == 'live' ? (
          <div class="rtc-live">
            <div class="kv-row"><span class="kv-k">CHIP</span><span class="kv-v">{diag.curDetail}</span></div>
            <div class="kv-row"><span class="kv-k">EPOCH (ms)</span><span class="kv-v">{diag.rtcTime}</span></div>
            <div class="kv-row"><span class="kv-k">EPOCH (s)</span><span class="kv-v">{diag.rtcSeconds}</span></div>
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
