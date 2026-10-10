import { Component } from '@geastack/core'
import { luckyWheel } from '../store'
import { Roller } from '../../../common/roller/Roller'
import '../../../common/adjust/Adjust.css'
import './selection.css'

export class WheelSelection extends Component {
  template() {
    return (
      <div class="adjust wheel-selection">
        <span class="adjust-title">Number of Options</span>
        <div class="rollers">
          <Roller field="options" />
        </div>
        <button class="ok" onClick={() => luckyWheel.selectOptions()}>
          OK
        </button>
      </div>
    )
  }
}
