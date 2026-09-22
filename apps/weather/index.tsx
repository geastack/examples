import { Display, mount } from '@geastack/core'
import { App } from './components/App'
import { weather } from './stores/WeatherStore'

// ESP32-only tuning; both calls are inert setters on the phone and desktop
// targets (they just store the value, no panel to drive). Weather needs WiFi for
// live forecasts, and esp_wifi_init requires a chunk of internal DRAM (task stack
// + driver state) that the default 2-deep flush pipeline (~56 rows) leaves too
// little of — WiFi init fails ESP_ERR_NO_MEM and fetch() can never connect. A
// 36-row 2-deep pipeline frees ~32 KB internal so WiFi comes up; the smaller
// flush chunk is a fine trade for this app.
Display.setBrightness(50)
Display.setFlushConfig({ rows: 36, depth: 2 })

weather.init()
mount(App)

requestAnimationFrame(function loop(timestampMs) {
  weather.tick()
  requestAnimationFrame(loop)
})
