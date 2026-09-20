import { Display, mount } from '@geastack/core'
import { App } from './components/App'

Display.setFrameRate(60)
Display.setFlushConfig({ rows: 48, depth: 2 })

mount(App)
