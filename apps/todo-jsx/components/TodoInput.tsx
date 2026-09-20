import './TodoInput.css'
import { todo } from '../stores/TodoStore'

export function TodoInput() {
  return (
    <div class="todo-input-wrap">
      <input class="todo-input" value={todo.draft} placeholder="New todo" onInput={event => todo.updateDraft(event.currentTarget.value)} onKeyDown={event => todo.keydown(event.keyCode)} />
    </div>
  )
}
