import { breakout } from '../stores/BreakoutStore'

export function Paddle() {
  return (
    <div
      class="paddle"
      style={{
        left: breakout.paddleXPx
      }}
    />
  )
}
