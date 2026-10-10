import { Component } from '@geastack/core'
import type { PointerEvent } from '@geastack/core'
import { system } from '../../../stores/SystemStore'
import { TouchGesture } from '../../../common/gesture/TouchGesture'
import { badge } from '../store'
import './badge.css'

export class Badge extends Component {
  private gesture = new TouchGesture()
  private holdTimer = 0

  pointerDown(event: PointerEvent) {
    event.stopPropagation()
    if (system.navigationBlocked) {
      return
    }

    this.gesture.begin(event.clientX, event.clientY)
    clearTimeout(this.holdTimer)
    this.holdTimer = setTimeout(() => {
      if (
        this.gesture.active &&
        !this.gesture.moved &&
        system.screen === 'badge' &&
        !system.navigationBlocked
      ) {
        system.dialog = 'badge'
      }
    }, 400)
  }

  pointerMove(event: PointerEvent) {
    event.stopPropagation()
    this.gesture.move(event.clientX, event.clientY)
    if (this.gesture.moved) {
      clearTimeout(this.holdTimer)
    }
  }

  pointerUp(event: PointerEvent) {
    event.stopPropagation()
    clearTimeout(this.holdTimer)
    if (this.gesture.active && this.gesture.swipe !== 0 && !system.navigationBlocked) {
      badge.go(this.gesture.swipe)
    }

    this.gesture.end()
  }

  dispose() {
    clearTimeout(this.holdTimer)
    this.gesture.end()
  }

  template() {
    return (
      <div
        class="badge"
        onPointerDown={(event) => this.pointerDown(event)}
        onPointerMove={(event) => this.pointerMove(event)}
        onPointerUp={(event) => this.pointerUp(event)}
      >
        {badge.badge.length > 0 && <img class="badge-image" src={badge.badge} />}
        {badge.badge.length === 0 && <span class="badge-hint">Tap and hold to change image</span>}
      </div>
    )
  }
}
