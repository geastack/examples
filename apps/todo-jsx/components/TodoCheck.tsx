import './TodoCheck.css'
import { todo } from '../stores/TodoStore'

export function TodoCheck({ index, done }: { index: number; done: number }) {
  const checkClass = done ? 'todo-check todo-check-done' : 'todo-check todo-check-open'
  const labelClass = done ? 'todo-check-label todo-check-label-done' : 'todo-check-label todo-check-label-open'
  const label = done ? 'X' : ''

  return (
    <div class={checkClass} onClick={() => todo.toggle(index)}>
      <span class={labelClass}>{label}</span>
    </div>
  )
}
