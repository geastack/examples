import { todo } from '../stores/TodoStore'

export function TodoStatus() {
  return <span class="todo-status">{todo.status}</span>
}
