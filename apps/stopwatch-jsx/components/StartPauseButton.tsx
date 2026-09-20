import './StartPauseButton.css'
import { stopwatch } from '../stores/StopwatchStore'

export function StartPauseButton() {
  const buttonClass = stopwatch.running ? 'stopwatch-pause-button' : 'stopwatch-start-button'
  const labelClass = stopwatch.running ? 'stopwatch-start-pause-label stopwatch-pause-label' : 'stopwatch-start-pause-label stopwatch-start-label'
  const label = stopwatch.running ? 'Pause' : 'Start'

  return (
    <div class={buttonClass} onClick={() => stopwatch.toggle()}>
      <span class={labelClass}>{label}</span>
    </div>
  )
}
