import { Settings } from './store'

export function SettingsPasswordEntry() {
  return (
    <div class="settings-screen settings-password-screen">
      <div class="settings-password-header">
        <button class="settings-password-back-button" onClick={() => Settings.openWifi()}>
          <span class="settings-button-text-muted">Back</span>
        </button>
        <span class="settings-password-title">Connect</span>
      </div>

      <div class="settings-password-network-card">
        <span class="settings-password-network-name">{Settings.selectedSsid}</span>
        <span class="settings-password-network-meta">{Settings.selectedRssiText}</span>
      </div>

      <span class="settings-password-status">{Settings.status}</span>

      <div class="settings-password-field">
        <span class="settings-password-label">Password</span>
        <input class="settings-password-input" type="password" value={Settings.inputPassword} placeholder="Enter password" autoFocus={Settings.selectedInput === 1} onFocus={() => Settings.selectPassword()} onInput={event => Settings.updatePassword(event.currentTarget.value)} onKeyDown={event => Settings.keydown(event.keyCode)} />
      </div>

      <div class="settings-password-actions">
        <button class="settings-password-cancel-button" onClick={() => Settings.openWifi()}>
          <span class="settings-button-text-muted">Cancel</span>
        </button>
        <button class="settings-password-connect-button" onClick={() => Settings.connectToSelected()}>
          <span class="settings-button-text-primary">Connect</span>
        </button>
      </div>
    </div>
  )
}
