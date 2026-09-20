import { Display, mount } from '@geastack/core'
import './styles.css'
import { App } from './components/App'
import { scrollProbe } from './stores/VirtualScrollStore'

Display.setFrameRate(60)
// CO5300 direct PSRAM TX: packed 410px RGB565 rows are 820 bytes, so
// row starts realign every 16 rows. Keep the flush height a multiple of
// 16; 56 creates a repeated 8-row staged tail that shows as bands.
Display.setFlushConfig({ rows: 48, depth: 3 })

scrollProbe.init()
mount(App)
scrollProbe.track()
