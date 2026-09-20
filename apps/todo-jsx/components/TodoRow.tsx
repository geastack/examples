import './TodoRow.css'
import { DeleteButton } from './DeleteButton'
import { TodoCheck } from './TodoCheck'
import { TodoText } from './TodoText'

export function TodoRow({ index, value, done, visible }: { index: number; value: string; done: number; visible: boolean }) {
  return (
    <div class="todo-row" style={{ display: visible ? 'flex' : 'none' }}>
      <TodoCheck index={index} done={done} />
      <TodoText value={value} done={done} />
      <DeleteButton index={index} />
    </div>
  )
}
