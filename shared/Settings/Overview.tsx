import { Settings } from './store'
import { SettingsRow } from './SettingsRow'

export function SettingsOverview() {
  return (
    <div class="settings-screen settings-overview-screen">
      <div class="settings-header">
        <div class="settings-heading">
          <span class="settings-title">Settings</span>
        </div>
      </div>

      <div class="settings-overview-scroll">
        <div class="settings-inline-actions">
          <button
            class="settings-inline-action-button"
            style={{ backgroundColor: Settings.wifiEnabled ? '#0A84FF' : '#4A4A52' }}
            onClick={() => Settings.toggleWifi()}
            onTouchStart={(event) => Settings.startWifiHold(event.clientX, event.clientY)}
            onTouchMove={(event) => Settings.moveWifiHold(event.clientX, event.clientY)}
            onTouchEnd={() => Settings.endWifiHold()}
          >
            <span class="settings-button-text-primary settings-inline-action-label">{Settings.wifiToggleLabel}</span>
          </button>
          <button
            class="settings-inline-action-button"
            style={{ backgroundColor: Settings.bluetoothEnabled ? '#0A84FF' : '#4A4A52' }}
            onClick={() => Settings.toggleBluetooth()}
          >
            <span class="settings-button-text-primary settings-inline-action-label">{Settings.bluetoothToggleLabel}</span>
          </button>
        </div>

        <button
          class="settings-wifi-card"
          onTouchStart={(event) => Settings.startWifiHold(event.clientX, event.clientY)}
          onTouchMove={(event) => Settings.moveWifiHold(event.clientX, event.clientY)}
          onTouchEnd={() => Settings.endWifiHold()}
        >
          <div class="settings-wifi-card-copy">
            <span class="settings-wifi-card-label">Wi-Fi connection</span>
            <span class="settings-wifi-card-network">{Settings.currentNetwork}</span>
          </div>
          <div
            class="settings-wifi-status-badge"
            style={{ backgroundColor: Settings.wifiConnected ? '#123D2B' : '#3A1D22' }}
          >
            <span class="settings-wifi-status-text" style={{ color: Settings.wifiConnected ? '#30D158' : '#FF453A' }}>
              {Settings.wifiStatus}
            </span>
          </div>
        </button>

        <div class="settings-row-list">
          <div class="settings-volume-row">
            <span class="settings-row-label">Volume</span>
            <div class="settings-volume-controls">
              <button class="settings-volume-button" onClick={() => Settings.volumeDown()}>
                <span class="settings-volume-button-text">-</span>
              </button>
              <span class="settings-volume-value">{Settings.volumeText}</span>
              <button class="settings-volume-button" onClick={() => Settings.volumeUp()}>
                <span class="settings-volume-button-text">+</span>
              </button>
            </div>
          </div>
          <div class="settings-volume-row">
            <span class="settings-row-label">Brightness</span>
            <div class="settings-volume-controls">
              <button class="settings-volume-button" onClick={() => Settings.brightnessDown()}>
                <span class="settings-volume-button-text">-</span>
              </button>
              <span class="settings-volume-value">{Settings.brightnessText}</span>
              <button class="settings-volume-button" onClick={() => Settings.brightnessUp()}>
                <span class="settings-volume-button-text">+</span>
              </button>
            </div>
          </div>
          <SettingsRow label="Bluetooth name" value={Settings.bluetoothDisplayName} />
          <SettingsRow label="Battery" value={Settings.batteryText} />
          <SettingsRow label="IP address" value={Settings.ipAddress} />
          <SettingsRow label="Wi-Fi MAC" value={Settings.wifiMac} />
          <SettingsRow label="Bluetooth" value={Settings.bluetoothStatus} />
          <SettingsRow label="Bluetooth MAC" value={Settings.bluetoothMac} />
          <SettingsRow label="Signal" value={Settings.wifiRssiText} />
        </div>
      </div>
    </div>
  )
}
