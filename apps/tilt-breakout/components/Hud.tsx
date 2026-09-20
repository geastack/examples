import { breakout } from '../stores/BreakoutStore'
import { fps } from '../stores/FpsStore'

// Top HUD: Score + Lives (breakout store) and the FPS counter (fps store) in one
// span — a single component reading TWO global stores, supported via the boxed
// reactive-apply mount path.
export function Hud() {
  return (
    <span class="hud">
      {'Score ' + breakout.score + '   Lives ' + breakout.lives + '   ' + fps.fpsText}
    </span>
  )
}
