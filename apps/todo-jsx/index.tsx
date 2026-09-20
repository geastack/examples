import { mount } from '@geastack/core'
import { App } from './components/App'
import { todo } from './stores/TodoStore'

todo.init()
mount(App)
