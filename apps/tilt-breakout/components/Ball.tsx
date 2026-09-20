import { breakout } from '../stores/BreakoutStore'

export function Ball() {
  return (
    <div
      class="ball"
      style={{
        left: breakout.ballLeft,
        top: breakout.ballTop
      }}
    />
  )
}
