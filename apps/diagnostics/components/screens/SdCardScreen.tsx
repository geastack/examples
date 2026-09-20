import { Component } from '@geastack/core'
import { diag } from '../../stores/DiagnosticsStore'
import './NotPresent.css'

export class SdCardScreen extends Component {
  template() {
    return (
      <div class="screen-body sdcard-screen">
        {diag.curState == 'live' ? (
          <div class="sdcard-live">
            <div class="kv-row"><span class="kv-k">INTERFACE</span><span class="kv-v">{diag.curDetail}</span></div>
            <div class="kv-row">
              <span class="kv-k">SELF-TEST</span>
              <span class={`kv-v ${diag.sdResult == 1 ? 'result-pass' : diag.sdResult == 0 ? 'result-fail' : ''}`}>
                {diag.sdResult == 1 ? 'PASS' : diag.sdResult == 0 ? 'FAIL' : 'NOT RUN'}
              </span>
            </div>
            {diag.compact == 0 ? (
              <div id="sdcard.test" class="screen-action" onClick={() => diag.runSdTest()}>
                <span>RUN WRITE / READ-BACK TEST</span>
                <span class="screen-action-sub">WRITES /sdcard/.diag_probe</span>
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
