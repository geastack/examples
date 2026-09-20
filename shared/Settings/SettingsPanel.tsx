import { SettingsContent } from './SettingsContent'
import { Settings } from './store'

export function SettingsPanel() {
  return (
    <div
      class="settings-panel-host"
      style={{ display: Settings.visible ? 'flex' : 'none' }}
      onClick={() => Settings.absorbTouch()}
    >
      <SettingsContent />
    </div>
  )
}
