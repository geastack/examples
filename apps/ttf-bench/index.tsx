import { mount } from '@geastack/core'
import './styles.css'
import { App } from './components/App'
import { ttfBench } from './stores/TtfBenchStore'

mount(App)

let warmupFrames: int = 0 as int
let flushFrames: int = 0 as int

requestAnimationFrame(function loop(timestampMs: number) {
  if (warmupFrames < 30) {
    warmupFrames = (warmupFrames + 1) as int
    requestAnimationFrame(loop)
    return
  }

  ttfBench.runNext()
  if (ttfBench.status !== 'done' && ttfBench.status !== 'font missing') requestAnimationFrame(loop)
})
