import { Component } from '@geastack/core'
import { alarmClock } from '../store'
import { Roller } from '../../../common/roller/Roller'
import '../../../common/adjust/Adjust.css'

export class AddAlarm extends Component {
  template() {
    return (
      <div class="adjust">
        <span class="adjust-title">Add Alarm</span>
        <div class="rollers">
          <Roller field="hour" />
          <Roller field="minute" />
        </div>
        <button class="ok" onClick={() => alarmClock.confirmAlarm()}>
          OK
        </button>
      </div>
    )
  }
}
