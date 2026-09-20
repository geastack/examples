import { balls } from '../stores/BallStore'

export function FpsBadge() {
  return <span class="fps-badge">{balls.fpsText}</span>
}
