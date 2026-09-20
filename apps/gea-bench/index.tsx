import { mount } from '@geastack/core'
import './styles.css'
import { App } from './components/App'
import { bench } from './stores/BenchStore'

mount(App)

// Drive the suite from a module-scope frame loop (the css-3d-cube pattern):
// one workload per frame keeps the UI responsive and the task watchdog happy.
// Once the suite is done we run a few more frames to flush the final render,
// then STOP requesting frames — otherwise a no-op rAF spin pins the main task
// on CPU 0, starves IDLE0, and trips the task watchdog (~5s) into a reboot loop.
let flushFrames = 0
requestAnimationFrame(function loop(timestampMs: number) {
  bench.runNext()
  if (bench.status !== 'done' || flushFrames++ < 6) requestAnimationFrame(loop)
})
