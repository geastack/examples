import { Component } from '@geastack/core'
import { diag } from '../../stores/DiagnosticsStore'
import './CameraScreen.css'
import './NotPresent.css'

export class CameraScreen extends Component {
  template() {
    return (
      <div class="screen-body camera-screen">
        {diag.curState == 'live' ? (
          <div class="camera-live">
            <div class="kv-row"><span class="kv-k">SENSOR</span><span class="kv-v">{diag.curDetail}</span></div>
            <div class="camera-preview">
              <camera class="camera-feed" />
            </div>
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
