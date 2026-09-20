import { Settings } from './store'

function NetworkRow0() {
  return (
    <button
      class="settings-network-row"
      style={{ display: Settings.network0Ssid ? 'flex' : 'none' }}
      onClick={() => Settings.tapNetwork(0)}
    >
      <div class="settings-network-row-main">
        <span class="settings-network-ssid">{Settings.network0Ssid}</span>
        <span class="settings-network-rssi-text">{Settings.network0RssiText}</span>
      </div>
      <span class="settings-network-lock" style={{ color: Settings.network0Secured ? '#FFD60A' : '#3A3A45' }}>{Settings.network0Secured ? 'LOCK' : 'OPEN'}</span>
    </button>
  )
}

function NetworkRow1() {
  return (
    <button
      class="settings-network-row"
      style={{ display: Settings.network1Ssid ? 'flex' : 'none' }}
      onClick={() => Settings.tapNetwork(1)}
    >
      <div class="settings-network-row-main">
        <span class="settings-network-ssid">{Settings.network1Ssid}</span>
        <span class="settings-network-rssi-text">{Settings.network1RssiText}</span>
      </div>
      <span class="settings-network-lock" style={{ color: Settings.network1Secured ? '#FFD60A' : '#3A3A45' }}>{Settings.network1Secured ? 'LOCK' : 'OPEN'}</span>
    </button>
  )
}

function NetworkRow2() {
  return (
    <button
      class="settings-network-row"
      style={{ display: Settings.network2Ssid ? 'flex' : 'none' }}
      onClick={() => Settings.tapNetwork(2)}
    >
      <div class="settings-network-row-main">
        <span class="settings-network-ssid">{Settings.network2Ssid}</span>
        <span class="settings-network-rssi-text">{Settings.network2RssiText}</span>
      </div>
      <span class="settings-network-lock" style={{ color: Settings.network2Secured ? '#FFD60A' : '#3A3A45' }}>{Settings.network2Secured ? 'LOCK' : 'OPEN'}</span>
    </button>
  )
}

function NetworkRow3() {
  return (
    <button
      class="settings-network-row"
      style={{ display: Settings.network3Ssid ? 'flex' : 'none' }}
      onClick={() => Settings.tapNetwork(3)}
    >
      <div class="settings-network-row-main">
        <span class="settings-network-ssid">{Settings.network3Ssid}</span>
        <span class="settings-network-rssi-text">{Settings.network3RssiText}</span>
      </div>
      <span class="settings-network-lock" style={{ color: Settings.network3Secured ? '#FFD60A' : '#3A3A45' }}>{Settings.network3Secured ? 'LOCK' : 'OPEN'}</span>
    </button>
  )
}

function NetworkRow4() {
  return (
    <button
      class="settings-network-row"
      style={{ display: Settings.network4Ssid ? 'flex' : 'none' }}
      onClick={() => Settings.tapNetwork(4)}
    >
      <div class="settings-network-row-main">
        <span class="settings-network-ssid">{Settings.network4Ssid}</span>
        <span class="settings-network-rssi-text">{Settings.network4RssiText}</span>
      </div>
      <span class="settings-network-lock" style={{ color: Settings.network4Secured ? '#FFD60A' : '#3A3A45' }}>{Settings.network4Secured ? 'LOCK' : 'OPEN'}</span>
    </button>
  )
}

function NetworkRow5() {
  return (
    <button
      class="settings-network-row"
      style={{ display: Settings.network5Ssid ? 'flex' : 'none' }}
      onClick={() => Settings.tapNetwork(5)}
    >
      <div class="settings-network-row-main">
        <span class="settings-network-ssid">{Settings.network5Ssid}</span>
        <span class="settings-network-rssi-text">{Settings.network5RssiText}</span>
      </div>
      <span class="settings-network-lock" style={{ color: Settings.network5Secured ? '#FFD60A' : '#3A3A45' }}>{Settings.network5Secured ? 'LOCK' : 'OPEN'}</span>
    </button>
  )
}

function NetworkRow6() {
  return (
    <button
      class="settings-network-row"
      style={{ display: Settings.network6Ssid ? 'flex' : 'none' }}
      onClick={() => Settings.tapNetwork(6)}
    >
      <div class="settings-network-row-main">
        <span class="settings-network-ssid">{Settings.network6Ssid}</span>
        <span class="settings-network-rssi-text">{Settings.network6RssiText}</span>
      </div>
      <span class="settings-network-lock" style={{ color: Settings.network6Secured ? '#FFD60A' : '#3A3A45' }}>{Settings.network6Secured ? 'LOCK' : 'OPEN'}</span>
    </button>
  )
}

function NetworkRow7() {
  return (
    <button
      class="settings-network-row"
      style={{ display: Settings.network7Ssid ? 'flex' : 'none' }}
      onClick={() => Settings.tapNetwork(7)}
    >
      <div class="settings-network-row-main">
        <span class="settings-network-ssid">{Settings.network7Ssid}</span>
        <span class="settings-network-rssi-text">{Settings.network7RssiText}</span>
      </div>
      <span class="settings-network-lock" style={{ color: Settings.network7Secured ? '#FFD60A' : '#3A3A45' }}>{Settings.network7Secured ? 'LOCK' : 'OPEN'}</span>
    </button>
  )
}

export function SettingsNetworkList() {
  return (
    <div class="settings-screen settings-network-screen">
      <div class="settings-network-header">
        <button class="settings-network-back-button" onClick={() => Settings.showOverview()}>
          <span class="settings-button-text-muted">Back</span>
        </button>
        <span class="settings-network-title">Wi-Fi</span>
      </div>

      <span class="settings-network-status">{Settings.status}</span>

      <div class="settings-network-empty" style={{ display: Settings.networkCount ? 'none' : 'flex' }}>
        <span class="settings-network-empty-text">{Settings.wifiEnabled ? 'Scanning for networks...' : 'Enable Wi-Fi to scan'}</span>
      </div>

      <div class="settings-network-list">
        <NetworkRow0 />
        <NetworkRow1 />
        <NetworkRow2 />
        <NetworkRow3 />
        <NetworkRow4 />
        <NetworkRow5 />
        <NetworkRow6 />
        <NetworkRow7 />
      </div>
    </div>
  )
}
