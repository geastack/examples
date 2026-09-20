import { balls } from '../stores/BallStore'

export function BallField() {
  return (
    <div class="ball-field">
      {balls.balls.map(ball => (
        <div
          class="ball"
          style={{
            left: ball.x,
            top: ball.y,
            backgroundColor: ball.color
          }}
        />
      ))}
    </div>
  )
}
