import { Component } from '@geastack/core'
import { alarmClock } from '../store'
import { alarmIcon } from '../../../assets'
import '../../../common/adjust/Adjust.css'
import './trigger_alarm.css'

export class TriggerAlarm extends Component {
  template() {
    return (
      <div class="ringing">
        <img src={alarmIcon} />
        <span>{alarmClock.ringingText}</span>
        <button class="ok" onClick={() => alarmClock.dismissAlarm()}>
          OK
        </button>
      </div>
    )
  }
}
