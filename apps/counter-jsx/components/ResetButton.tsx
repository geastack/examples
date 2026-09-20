import './ResetButton.css'
import { counter } from '../stores/CounterStore'

export function ResetButton() {
  return (
    <div class="counter-reset-button" onClick={() => counter.reset()}>
      <span class="counter-reset-label">Reset</span>
    </div>
  )
}
