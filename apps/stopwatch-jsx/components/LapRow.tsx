import './LapRow.css'

export function LapRow({ label, value, active }: { label: string; value: string; active: boolean }) {
  const textClass = active ? 'stopwatch-lap-text stopwatch-lap-text-active' : 'stopwatch-lap-text stopwatch-lap-text-muted'

  return (
    <div class="stopwatch-lap-row">
      <span class={textClass}>{label}</span>
      <span class={textClass}>{value}</span>
    </div>
  )
}
