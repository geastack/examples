import './ResetButton.css'
import { stopwatch } from '../stores/StopwatchStore'

export function ResetButton() {
  return (
    <div class="stopwatch-reset-button" onClick={() => stopwatch.reset()}>
      <span class="stopwatch-reset-label">Reset</span>
    </div>
  )
}
