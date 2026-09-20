import { Component } from '@geastack/core'
import { diag } from '../../stores/DiagnosticsStore'
import './NotPresent.css'

export class StorageScreen extends Component {
  template() {
    return (
      <div class="screen-body storage-screen">
        {diag.curState == 'live' ? (
          <div class="storage-live">
            <div class="kv-row"><span class="kv-k">BACKING</span><span class="kv-v">NVS FLASH</span></div>
            <div class="kv-row">
              <span class="kv-k">SELF-TEST</span>
              <span class={`kv-v ${diag.storageResult == 1 ? 'result-pass' : diag.storageResult == 0 ? 'result-fail' : ''}`}>
                {diag.storageResult == 1 ? 'PASS' : diag.storageResult == 0 ? 'FAIL' : 'NOT RUN'}
              </span>
            </div>
            {diag.compact == 0 ? (
              <div id="storage.test" class="screen-action" onClick={() => diag.runStorageTest()}>
                <span>RUN WRITE / READ-BACK TEST</span>
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
