import { system } from '../../stores/SystemStore'
import { battery } from './store'
import { Component } from '@geastack/core'
import batteryLightning from '../../assets/icon_bat_lightning.png'
import './status_bar.css'

export class StatusBar extends Component {
  template() {
    return (
      <button
        class="battery"
        style={{ top: battery.batteryY }}
        onClick={() => system.hideBattery()}
      >
        <span class="battery-level">{battery.batteryLevel}%</span>
        <div class="battery-cap" />
        <div class="battery-body">
          <div
            class={battery.plugged ? 'battery-fill charging' : 'battery-fill'}
            style={{ width: (battery.batteryLevel * 28) / 100 }}
          />
          {battery.plugged && <img class="battery-lightning" src={batteryLightning} />}
        </div>
      </button>
    )
  }
}
