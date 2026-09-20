import './ResetButton.css'
import { todo } from '../stores/TodoStore'

export function ResetButton() {
  return (
    <button class="todo-reset-button" onClick={() => todo.reset()}>
      <span class="todo-reset-label">Reset</span>
    </button>
  )
}
