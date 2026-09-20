import './AddButton.css'
import { todo } from '../stores/TodoStore'

export function AddButton() {
  return (
    <button class="todo-add-button" onClick={() => todo.add()}>
      <span class="todo-add-label">Add</span>
    </button>
  )
}
