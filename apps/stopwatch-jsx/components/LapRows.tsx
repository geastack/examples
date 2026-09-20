import './LapRows.css'
import { stopwatch } from '../stores/StopwatchStore'
import { LapRow } from './LapRow'

export function LapRows() {
  return (
    <div class="stopwatch-lap-rows">
      <LapRow label="Lap 1" value={stopwatch.lap1} active={stopwatch.lapCount >= 1} />
      <LapRow label="Lap 2" value={stopwatch.lap2} active={stopwatch.lapCount >= 2} />
      <LapRow label="Lap 3" value={stopwatch.lap3} active={stopwatch.lapCount >= 3} />
      <LapRow label="Lap 4" value={stopwatch.lap4} active={stopwatch.lapCount >= 4} />
      <LapRow label="Lap 5" value={stopwatch.lap5} active={stopwatch.lapCount >= 5} />
    </div>
  )
}
