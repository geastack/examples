import { Component } from '@geastack/core'
import { diag } from '../../stores/DiagnosticsStore'
import './TouchScreen.css'
import './NotPresent.css'

export class TouchScreen extends Component {
  template() {
    return (
      <div class="screen-body touch-screen">
        {diag.curState == 'live' ? (
          <div class="touch-live">
            <div class="kv-row"><span class="kv-k">CONTACT</span><span class="kv-v">{diag.touching == 1 ? 'TOUCHING' : 'IDLE'}</span></div>
            <div class="kv-row"><span class="kv-k">X / Y</span><span class="kv-v">{diag.touchX} , {diag.touchY}</span></div>
            <div class="touch-pad">
              {diag.touching == 1 ? (
                <span class="touch-dot" style={{ left: diag.touchX, top: diag.touchY }}></span>
              ) : (
                <span class="touch-hint">TOUCH ANYWHERE</span>
              )}
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
