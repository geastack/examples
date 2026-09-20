import { Display, mount } from '@geastack/core'
import { App } from './components/App'
import { temperature } from './stores/TemperatureStore'

Display.setAA(2)
Display.setBrightness(50)
Display.setFrameRate(50)
temperature.init()
mount(App)
