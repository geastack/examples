import { AddButton } from './AddButton'
import { TodoInput } from './TodoInput'

export function TodoCompose() {
  return (
    <div class="todo-compose-row">
      <TodoInput />
      <AddButton />
    </div>
  )
}
