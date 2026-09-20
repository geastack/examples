import './MinusButton.css'
import { counter } from '../stores/CounterStore'

export function MinusButton() {
  return (
    <div class="counter-minus-button" onClick={() => counter.decrement()}>
      <span class="counter-minus-symbol">-</span>
    </div>
  )
}
