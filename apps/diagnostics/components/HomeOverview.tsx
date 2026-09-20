import { Component } from '@geastack/core'
import { diag } from '../stores/DiagnosticsStore'
import { MenuList } from './MenuList'
import './HomeOverview.css'

export class HomeOverview extends Component {
  template() {
    return (
      <div class="home-overview">
        <div class="overview-card">
          <div class="overview-head">
            <span class="overview-name">{diag.deviceName}</span>
            <span class="overview-chip">{diag.chip}</span>
          </div>
          <div class="overview-summary">{diag.sysSummary}</div>
          <div class="overview-grid">
            <div class="ov-cell"><span class="ov-k">CORES</span><span class="ov-v">{diag.cores}</span></div>
            <div class="ov-cell"><span class="ov-k">CPU</span><span class="ov-v">{diag.cpuMhz} MHz</span></div>
            <div class="ov-cell"><span class="ov-k">FLASH</span><span class="ov-v">{diag.flash}</span></div>
            <div class="ov-cell"><span class="ov-k">PSRAM/RAM</span><span class="ov-v">{diag.ram}</span></div>
            <div class="ov-cell"><span class="ov-k">MAC / ID</span><span class="ov-v">{diag.uniqueId}</span></div>
            <div class="ov-cell"><span class="ov-k">OS / SDK</span><span class="ov-v">{diag.osVersion}</span></div>
            <div class="ov-cell"><span class="ov-k">RESET</span><span class="ov-v">{diag.resetReason}</span></div>
            <div class="ov-cell"><span class="ov-k">UPTIME</span><span class="ov-v">{diag.uptime}s</span></div>
            <div class="ov-cell">
              <span class="ov-k">DIE TEMP</span>
              <span class="ov-v">{diag.dieTempText}</span>
            </div>
          </div>
        </div>
        <MenuList />
      </div>
    )
  }
}
