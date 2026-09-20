import { Component } from '@geastack/core'
import './App.css'
import { TodoCompose } from './TodoCompose'
import { TodoHeader } from './TodoHeader'
import { TodoList } from './TodoList'
import { TodoStatus } from './TodoStatus'

export class App extends Component {
  template() {
    return (
      <div class="todo-app">
        <TodoHeader />
        <TodoStatus />
        <TodoCompose />
        <TodoList />
      </div>
    )
  }
}
