import { Component } from '@geastack/core'
import { diag } from '../../stores/DiagnosticsStore'
import './NotPresent.css'

export class BleScreen extends Component {
  template() {
    return (
      <div class="screen-body ble-screen">
        {diag.curState == 'live' ? (
          <div class="ble-live">
            <div class="kv-row"><span class="kv-k">STACK</span><span class="kv-v">{diag.curDetail}</span></div>
            <div class="kv-row"><span class="kv-k">NAME</span><span class="kv-v">{diag.bleDeviceName}</span></div>
            <div class="kv-row"><span class="kv-k">MAC</span><span class="kv-v">{diag.bleMacAddr}</span></div>
            <div class="kv-row"><span class="kv-k">CONNECTED</span><span class="kv-v">{diag.bleConnectedFlag == 1 ? 'YES' : 'NO'}</span></div>
            {diag.compact == 0 ? (
              <div id="ble.toggle" class="screen-action" onClick={() => diag.toggleAdvertising()}>
                <span>{diag.bleAdvertising == 1 ? 'STOP ADVERTISING' : 'START ADVERTISING'}</span>
              </div>
            ) : null}
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
