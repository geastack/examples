import './LapButton.css'
import { stopwatch } from '../stores/StopwatchStore'

export function LapButton() {
  const labelClass = stopwatch.elapsedMs > 0
    ? 'stopwatch-lap-button-label stopwatch-lap-button-label-primary'
    : 'stopwatch-lap-button-label stopwatch-lap-button-label-muted'

  return (
    <div class="stopwatch-lap-button" onClick={() => stopwatch.lap()}>
      <span class={labelClass}>Lap</span>
    </div>
  )
}
