import './CounterValue.css'
import { counter } from '../stores/CounterStore'

export function CounterValue() {
  return (
    <span
      class={{
        'counter-value': true,
        'counter-value-negative': counter.count < 0,
        'counter-value-positive': counter.count >= 0
      }}
    >
      {counter.count}
    </span>
  )
}
