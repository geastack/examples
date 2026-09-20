import './TodoText.css'

export function TodoText({ value, done }: { value: string; done: number }) {
  const textClass = done ? 'todo-row-title todo-row-title-done' : 'todo-row-title todo-row-title-open'
  return <span class={textClass}>{value}</span>
}
