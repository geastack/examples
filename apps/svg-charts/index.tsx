import { Display, mount } from '@geastack/core'
import { App } from './components/App'
import { charts } from './stores/ChartStore'

Display.setAA(2)
Display.setFrameRate(60)
charts.start()
mount(App)
