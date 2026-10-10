import { Component } from '@geastack/core'
import { setup } from '../store'
import { Roller } from '../../../common/roller/Roller'
import '../../../common/adjust/Adjust.css'
import './set_date.css'

export class SetDateView extends Component {
  template() {
    return (
      <div class="adjust date-adjust">
        <span class="adjust-title">Set Date</span>
        <span class="adjust-summary">{setup.adjustDateSummary}</span>
        <div class="rollers date-rollers">
          {setup.dateStage === 0 && (
            <div class="rollers date-year-month">
              <div class="date-year">
                <Roller field="year" />
              </div>
              <div class="date-month">
                <Roller field="month" />
              </div>
            </div>
          )}
          {setup.dateStage === 1 && (
            <div class="date-day">
              <Roller field="day" />
            </div>
          )}
        </div>
        <button class="ok" onClick={() => setup.saveSettings()}>
          {setup.dateStage === 0 ? 'Next' : 'OK'}
        </button>
      </div>
    )
  }
}
