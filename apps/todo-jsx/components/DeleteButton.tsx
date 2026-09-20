import './DeleteButton.css'
import { todo } from '../stores/TodoStore'

export function DeleteButton({ index }: { index: number }) {
  return (
    <button class="todo-delete-button" onClick={() => todo.remove(index)}>
      <span class="todo-delete-label">Del</span>
    </button>
  )
}
