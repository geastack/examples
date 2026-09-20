import { Display, mount } from '@geastack/core'
import { App } from './components/App'
import { bubbleGrid } from './stores/BubbleGridStore'
import './styles.css'

Display.setFrameRate(60)
Display.setFlushConfig({ rows: 96, depth: 2 })
Display.setVSync(true)

bubbleGrid.init()
mount(App)
