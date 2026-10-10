import { Component } from '@geastack/core'
import { setup } from '../store'
import '../../../common/adjust/Adjust.css'
import './button.css'

export class ButtonView extends Component {
  template() {
    return (
      <div class="adjust">
        <div class="button-setting">
          <span>Button SFX</span>
          <button class={setup.sfx ? 'switch on' : 'switch'} onClick={() => setup.toggleSfx()}>
            <div />
          </button>
        </div>
        <div class="button-setting button-vibration">
          <span>Button Vibration</span>
          <button
            class={setup.vibration ? 'switch on' : 'switch'}
            onClick={() => setup.toggleVibration()}
          >
            <div />
          </button>
        </div>
        <button class="ok" onClick={() => setup.saveSettings()}>
          OK
        </button>
      </div>
    )
  }
}
