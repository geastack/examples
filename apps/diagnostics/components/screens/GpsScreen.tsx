import { Component } from '@geastack/core'
import { diag } from '../../stores/DiagnosticsStore'
import './NotPresent.css'

export class GpsScreen extends Component {
  template() {
    return (
      <div class="screen-body gps-screen">
        {diag.curState == 'live' ? (
          <div class="gps-live">
            <div class="kv-row"><span class="kv-k">MODULE</span><span class="kv-v">{diag.curDetail}</span></div>
            <div class="kv-row"><span class="kv-k">FIX</span><span class="kv-v">{diag.gpsFix == 1 ? 'ACQUIRED' : 'SEARCHING'}</span></div>
            <div class="kv-row"><span class="kv-k">LATITUDE</span><span class="kv-v">{diag.gpsLat}</span></div>
            <div class="kv-row"><span class="kv-k">LONGITUDE</span><span class="kv-v">{diag.gpsLon}</span></div>
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
