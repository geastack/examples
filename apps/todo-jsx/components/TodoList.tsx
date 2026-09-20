import './TodoList.css'
import './TodoRow.css'
import './TodoCheck.css'
import './TodoText.css'
import './DeleteButton.css'
import { todo } from '../stores/TodoStore'

export function TodoList() {
  return (
    <div class="todo-list">
      <div class="todo-row" style={{ display: todo.count >= 1 ? 'flex' : 'none' }}>
        <div class={todo.done1 ? 'todo-check todo-check-done' : 'todo-check todo-check-open'} onClick={() => todo.toggle(1)}>
          <span class={todo.done1 ? 'todo-check-label todo-check-label-done' : 'todo-check-label todo-check-label-open'}>
            {todo.done1 ? 'X' : ''}
          </span>
        </div>
        <span class={todo.done1 ? 'todo-text todo-text-done' : 'todo-text'}>{todo.todo1}</span>
        <button class="todo-delete-button" onClick={() => todo.remove(1)}>
          <span class="todo-delete-label">Delete</span>
        </button>
      </div>
      <div class="todo-row" style={{ display: todo.count >= 2 ? 'flex' : 'none' }}>
        <div class={todo.done2 ? 'todo-check todo-check-done' : 'todo-check todo-check-open'} onClick={() => todo.toggle(2)}>
          <span class={todo.done2 ? 'todo-check-label todo-check-label-done' : 'todo-check-label todo-check-label-open'}>
            {todo.done2 ? 'X' : ''}
          </span>
        </div>
        <span class={todo.done2 ? 'todo-text todo-text-done' : 'todo-text'}>{todo.todo2}</span>
        <button class="todo-delete-button" onClick={() => todo.remove(2)}>
          <span class="todo-delete-label">Delete</span>
        </button>
      </div>
      <div class="todo-row" style={{ display: todo.count >= 3 ? 'flex' : 'none' }}>
        <div class={todo.done3 ? 'todo-check todo-check-done' : 'todo-check todo-check-open'} onClick={() => todo.toggle(3)}>
          <span class={todo.done3 ? 'todo-check-label todo-check-label-done' : 'todo-check-label todo-check-label-open'}>
            {todo.done3 ? 'X' : ''}
          </span>
        </div>
        <span class={todo.done3 ? 'todo-text todo-text-done' : 'todo-text'}>{todo.todo3}</span>
        <button class="todo-delete-button" onClick={() => todo.remove(3)}>
          <span class="todo-delete-label">Delete</span>
        </button>
      </div>
      <div class="todo-row" style={{ display: todo.count >= 4 ? 'flex' : 'none' }}>
        <div class={todo.done4 ? 'todo-check todo-check-done' : 'todo-check todo-check-open'} onClick={() => todo.toggle(4)}>
          <span class={todo.done4 ? 'todo-check-label todo-check-label-done' : 'todo-check-label todo-check-label-open'}>
            {todo.done4 ? 'X' : ''}
          </span>
        </div>
        <span class={todo.done4 ? 'todo-text todo-text-done' : 'todo-text'}>{todo.todo4}</span>
        <button class="todo-delete-button" onClick={() => todo.remove(4)}>
          <span class="todo-delete-label">Delete</span>
        </button>
      </div>
    </div>
  )
}
