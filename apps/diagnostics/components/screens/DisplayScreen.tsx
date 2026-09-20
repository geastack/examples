import { Component } from '@geastack/core'
import { diag } from '../../stores/DiagnosticsStore'
import './DisplayScreen.css'

export class DisplayScreen extends Component {
  template() {
    // All content fits one screen, so it's always shown. The inline REFRESH button
    // is touch-only; non-touch boards trigger it from the control strip (KEY1).
    return (
      <div class="screen-body display-screen">
        <div class="kv-row"><span class="kv-k">RES</span><span class="kv-v">{diag.dispRes}</span></div>
        <div class="kv-row"><span class="kv-k">FORMAT</span><span class="kv-v">{diag.dispFmt}</span></div>
        <div class="kv-row"><span class="kv-k">DPR</span><span class="kv-v">{diag.dispDpr}</span></div>
        <div class="kv-row"><span class="kv-k">ORIENT</span><span class="kv-v">{diag.dispOrient}</span></div>
        {diag.compact == 0 ? (
          <div class="gray-ramp">
            <span class="g g0"></span><span class="g g1"></span><span class="g g2"></span>
            <span class="g g3"></span><span class="g g4"></span><span class="g g5"></span>
          </div>
        ) : null}
        <div class="rainbow-ramp">
          <span class="r r0"></span><span class="r r1"></span><span class="r r2"></span>
          <span class="r r3"></span><span class="r r4"></span><span class="r r5"></span>
          <span class="r r6"></span>
        </div>
        {diag.compact == 0 ? (
          <div id="display.refresh" class="screen-action" onClick={() => diag.fullRefresh()}>
            <span>FULL SCREEN REFRESH</span>
            <span class="screen-action-sub">USE IF INK GHOSTING APPEARS</span>
          </div>
        ) : null}
      </div>
    )
  }
}
