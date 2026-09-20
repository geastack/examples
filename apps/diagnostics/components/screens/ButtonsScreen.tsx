import { Component } from '@geastack/core'
import { diag } from '../../stores/DiagnosticsStore'
import './ButtonsScreen.css'
import './NotPresent.css'

export class ButtonsScreen extends Component {
  template() {
    return (
      <div class="screen-body buttons-screen">
        {diag.curState == 'live' ? (
          <div class="buttons-live">
            <span class="buttons-hint">PRESS ANY PHYSICAL BUTTON</span>
            <div class="buttons-last">
              <span class="buttons-key">{diag.lastKey == 0 ? '-' : diag.lastKeyName}</span>
              <span class="buttons-code">{diag.lastKeyText}</span>
            </div>
            <span class="buttons-note">{diag.curDetail}</span>
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
