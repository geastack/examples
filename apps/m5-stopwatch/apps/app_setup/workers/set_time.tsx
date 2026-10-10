import { Component } from '@geastack/core'
import { setup } from '../store'
import { Roller } from '../../../common/roller/Roller'
import '../../../common/adjust/Adjust.css'
import './set_time.css'

export class SetTimeView extends Component {
  template() {
    return (
      <div class="adjust time-adjust">
        <span class="adjust-title">Set Time</span>
        <span class="adjust-summary">{setup.adjustTimeSummary}</span>
        <div class="rollers time-rollers">
          <Roller field="hour" />
          <Roller field="minute" />
          <Roller field="second" />
        </div>
        <button class="ok" onClick={() => setup.saveSettings()}>
          OK
        </button>
      </div>
    )
  }
}
