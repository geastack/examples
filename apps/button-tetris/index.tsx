import { mount } from '@geastack/core'
import './styles.css'
import { App } from './components/App'
import { fps } from './stores/FpsStore'
import { tetris } from './stores/TetrisStore'

tetris.init()
mount(App)

// The frame clock, not `Date.now()`: the timestamp this callback is handed is
// the host's own advancing frame time (`Application::frame(gea_embedded_now_ms())`).
// The note this replaces claimed that value was frozen and that the music
// sequencer read it -- both were true once and neither is now. The frozen
// timestamp was a compiler defect that dropped the callback's argument, long
// since fixed; and `playMusic` schedules off `audioContext.currentTime`, not
// off this argument, which is why it takes it as `_timestampMs`.
//
// Nothing here changes behaviour: every consumer measures a DELTA
// (`FpsStore`'s `windowStartMs`, `TetrisStore`'s `lastGravityTickMs`), so the
// base cancels. It is switched for consistency, because mixing an epoch clock
// with the frame clock is what broke tilt-breakout -- a delay armed off one and
// tested against the other expired on its first frame. Both zero-guards below
// already tolerate a frame clock that starts at 0: `lastGravityTickMs <= 0 ||
// timestampMs < lastGravityTickMs` re-seeds, and the identical `FpsStore` runs
// on this clock in tilt-breakout today.
requestAnimationFrame(function loop(timestampMs: number) {
  fps.tick(timestampMs)
  tetris.tick(timestampMs)
  requestAnimationFrame(loop)
})
