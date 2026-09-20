import './PlusButton.css'
import { counter } from '../stores/CounterStore'

export function PlusButton() {
  return (
    <div class="counter-plus-button" onClick={() => counter.increment()}>
      <span class="counter-plus-symbol">+</span>
    </div>
  )
}
