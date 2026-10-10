import { Component } from '@geastack/core'
import { stopwatch } from '../store'
import { ArcTopClock } from '../../../common/arc_top_clock/ArcTopClock'
import './view.css'

export class StopWatch extends Component {
  template() {
    return (
      <div class="stopwatch">
        <ArcTopClock />
        <button
          class="sw-left"
          style={{ left: 108 + stopwatch.swLeftX, top: 54 + stopwatch.swLeftY }}
          onClick={() => stopwatch.left()}
        >
          {stopwatch.swState === 2 ? 'RESET' : 'LAP'}
        </button>
        <button
          class={stopwatch.swState === 1 ? 'sw-right stop' : 'sw-right'}
          style={{ left: 252 + stopwatch.swRightX, top: 54 + stopwatch.swRightY }}
          onClick={() => stopwatch.right()}
        >
          {stopwatch.swState === 1 ? 'STOP' : 'START'}
        </button>
        <div class="sw-info">
          <span class="elapsed">{stopwatch.elapsed}</span>
          <div class="divider" />
          <div class="laps">
            {stopwatch.laps.map((lap) => (
              <div key={lap.id} class="lap">
                <span>LAP {lap.id}</span>
                <span>{lap.text}</span>
              </div>
            ))}
            {stopwatch.laps.length === 0 && <span class="no-laps">-.-</span>}
          </div>
        </div>
      </div>
    )
  }
}
