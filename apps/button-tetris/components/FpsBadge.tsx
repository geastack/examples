import { fps } from '../stores/FpsStore'

export function FpsBadge() {
  return (
    <div class="fps-badge">
      <span class="fps-badge-text">{fps.fpsText}</span>
    </div>
  )
}
