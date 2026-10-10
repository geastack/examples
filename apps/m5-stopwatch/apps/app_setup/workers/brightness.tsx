import { Component } from '@geastack/core'
import { setup } from '../store'
import { Slider } from './slider'
import '../../../common/adjust/Adjust.css'
import './brightness.css'

export class BrightnessView extends Component {
  template() {
    return (
      <div class="adjust">
        <span class="percentage">{setup.brightness}</span>
        <Slider />
        <button class="ok" onClick={() => setup.saveSettings()}>
          OK
        </button>
      </div>
    )
  }
}
