import { breakout } from '../stores/BreakoutStore'

export function BrickField() {
  return (
    <div class="brick-field">
      {breakout.bricks.map(brick => (
        <div
          class="brick"
          style={{
            left: brick.x,
            top: brick.y,
            opacity: brick.opacity,
            backgroundColor: brick.color
          }}
        />
      ))}
    </div>
  )
}
