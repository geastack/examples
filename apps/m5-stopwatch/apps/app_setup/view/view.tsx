import { Component } from '@geastack/core'
import { setup } from '../store'
import '../../../common/adjust/Adjust.css'
import './view.css'

export class SettingsView extends Component {
  template() {
    return (
      <div class="list settings" momentum="true">
        <span class="section-title">Device</span>
        <button class="list-button" onClick={() => setup.settingScreen('brightness')}>
          Brightness
        </button>
        <button class="list-button" onClick={() => setup.settingScreen('volume')}>
          Volume
        </button>
        <button class="list-button" onClick={() => setup.settingScreen('button')}>
          Button
        </button>
        <span class="section-title">Time &amp; Date</span>
        <button class="list-button" onClick={() => setup.settingScreen('set-time')}>
          Set Time
        </button>
        <button class="list-button" onClick={() => setup.settingScreen('set-date')}>
          Set Date
        </button>
        <span class="section-title">Firmware</span>
        <button class="list-button" onClick={() => setup.versionTap()}>
          Version: V0.5
        </button>
      </div>
    )
  }
}
