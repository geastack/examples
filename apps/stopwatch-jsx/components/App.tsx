import { Component } from '@geastack/core'
import './App.css'
import { LapButton } from './LapButton'
import { LapRows } from './LapRows'
import { ResetButton } from './ResetButton'
import { StartPauseButton } from './StartPauseButton'
import { stopwatch } from '../stores/StopwatchStore'

export class App extends Component {
  template() {
    return (
      <div class="stopwatch-app">
        <span class="stopwatch-status">{stopwatch.status}</span>
        <span class="stopwatch-time">{stopwatch.timeText}</span>
        <div class="stopwatch-controls">
          <LapButton />
          <StartPauseButton />
          <ResetButton />
        </div>
        <LapRows />
      </div>
    )
  }
}
