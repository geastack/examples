import { mount } from '@geastack/core'
import { App } from './components/App'

// App is a self-store ReactiveComponent — it holds its own count/status, so
// there is no separate store to construct or initialize here.
mount(App)
