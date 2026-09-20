import './TodoHeader.css'
import { ResetButton } from './ResetButton'

export function TodoHeader() {
  return (
    <div class="todo-header">
      <span class="todo-title">Todos</span>
      <ResetButton />
    </div>
  )
}
