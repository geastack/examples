import { Component } from '@geastack/core'
import { diag } from '../../stores/DiagnosticsStore'
import './WifiScreen.css'
import './NotPresent.css'

export class WifiScreen extends Component {
  template() {
    return (
      <div class="screen-body wifi-screen">
        <div class="wifi-live">
          <div class="kv-row"><span class="kv-k">RADIO</span><span class="kv-v">{diag.wifiEnabled == 1 ? 'ON' : 'OFF'}</span></div>
          <div class="kv-row"><span class="kv-k">CONNECTED</span><span class="kv-v">{diag.wifiSsid}</span></div>
          <div class="kv-row"><span class="kv-k">IP</span><span class="kv-v">{diag.wifiIp}</span></div>
          {diag.compact == 0 ? <div class="kv-row"><span class="kv-k">MAC</span><span class="kv-v">{diag.wifiMac}</span></div> : null}
          {diag.compact == 0 ? (
            <div class="wifi-controls">
              <div id="wifi.toggle" class="wifi-btn" onClick={() => diag.toggleWifi()}>{diag.wifiEnabled == 1 ? 'DISABLE' : 'ENABLE'}</div>
              <div id="wifi.scan" class="wifi-btn" onClick={() => diag.scanWifi()}>{diag.wifiScanning == 1 ? 'SCANNING...' : 'SCAN'}</div>
            </div>
          ) : null}
          <div class="wifi-list">
            {diag.wifiRows.map(row => (
              <div class="wifi-row" key={row.ssid}>
                <span class="wifi-ssid">{row.ssid}</span>
                <span class="wifi-meta">{row.secured == 1 ? 'SEC ' : 'OPEN '}{row.rssi}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
}
