import { ReactiveComponent } from '@geastack/core'
import { FpsBadge } from './FpsBadge'

export class App extends ReactiveComponent {
  opaque = true

  toggle() {
    this.opaque = !this.opaque
  }

  keydown(keyCode: number) {
    if (keyCode === 65) this.toggle()
  }

  template() {
    return (
      <div class="cube-app" onClick={() => this.toggle()} onKeyDown={event => this.keydown(event.keyCode)}>
        <FpsBadge />
        <div class="stage-scene">
          <div class="stage-wall" />
          <div class="stage-floor" />
          <div class="stage-horizon" />
        </div>
        <div class="cube-title">
          <span class="cube-kicker">CSS motion study</span>
          <span class="cube-heading">3D Cube</span>
        </div>
        <div class="cube-stage">
          <div class="cube-wrap">
            <div class={{ cube: true, 'cube--opaque': this.opaque }}>
              <div class="cube-face cube-face--front">
                <span class="cube-face-label">front</span>
              </div>
              <div class="cube-face cube-face--back">
                <span class="cube-face-label">back</span>
              </div>
              <div class="cube-face cube-face--right">
                <span class="cube-face-label">right</span>
              </div>
              <div class="cube-face cube-face--left">
                <span class="cube-face-label">left</span>
              </div>
              <div class="cube-face cube-face--top">
                <span class="cube-face-label">top</span>
              </div>
              <div class="cube-face cube-face--bottom">
                <span class="cube-face-label">base</span>
              </div>
            </div>
          </div>
          <div class="cube-shadow" />
        </div>
      </div>
    )
  }
}
