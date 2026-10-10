import { ReactiveComponent, type PointerEvent } from '@geastack/core'
import { system } from '../../../stores/SystemStore'
import { setup } from '../store'
import './slider.css'

export class Slider extends ReactiveComponent {
  dragging = false

  get width(): number {
    return system.screen === 'brightness'
      ? ((setup.brightness - 10) * 374) / 90
      : (setup.speakerVolume * 374) / 100
  }

  setPosition(x: number) {
    const fraction = Math.max(0, Math.min(1, (x - 46) / 374))

    setup.setPercentage(system.screen === 'brightness' ? 10 + fraction * 90 : fraction * 100)
  }

  pointerDown(event: PointerEvent) {
    event.stopPropagation()
    this.dragging = true
    this.setPosition(event.clientX)
  }

  pointerMove(event: PointerEvent) {
    event.stopPropagation()
    if (this.dragging) {
      this.setPosition(event.clientX)
    }
  }

  pointerUp(event: PointerEvent) {
    event.stopPropagation()
    this.dragging = false
  }

  template() {
    return (
      <div
        class="slider-hit"
        touch-action="none"
        onPointerDown={(e) => this.pointerDown(e)}
        onPointerMove={(e) => this.pointerMove(e)}
        onPointerUp={(e) => this.pointerUp(e)}
        onClick={(e) => e.stopPropagation()}
      >
        <div class="slider-track">
          <div class="slider-fill" style={{ width: this.width }} />
          <div class="slider-knob" style={{ left: this.width - 16 }} />
        </div>
      </div>
    )
  }
}
