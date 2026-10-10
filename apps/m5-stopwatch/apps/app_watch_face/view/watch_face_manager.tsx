import { Component } from '@geastack/core'
import type { PointerEvent } from '@geastack/core'
import { TouchGesture } from '../../../common/gesture/TouchGesture'
import { watchFace } from '../store'
import { system } from '../../../stores/SystemStore'
import { Classic } from './classic'
import { NumberFlow } from './number_flow'
import { BigNumber } from './big_number'
import { Simple } from './simple'
import './watch_face_manager.css'

export class WatchFaceManager extends Component {
  private gesture = new TouchGesture()
  private holdTimer = 0
  private longPressed = false

  pointerDown(event: PointerEvent) {
    event.stopPropagation()
    if (system.navigationBlocked) {
      return
    }

    this.gesture.begin(event.clientX, event.clientY)
    this.longPressed = false
    clearTimeout(this.holdTimer)
    this.holdTimer = setTimeout(() => {
      if (
        this.gesture.active &&
        !this.gesture.moved &&
        system.screen === 'watch' &&
        !system.navigationBlocked
      ) {
        this.longPressed = watchFace.longPress()
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
      watchFace.go(this.gesture.swipe, system.now)
    }

    this.gesture.end()
  }

  tap() {
    if (!system.navigationBlocked && this.gesture.swipe === 0 && !this.longPressed) {
      watchFace.tapScreen()
    }
  }

  dispose() {
    clearTimeout(this.holdTimer)
    this.gesture.end()
  }

  template() {
    return (
      <div
        class="watchface"
        onPointerDown={(event) => this.pointerDown(event)}
        onPointerMove={(event) => this.pointerMove(event)}
        onPointerUp={(event) => this.pointerUp(event)}
        onClick={() => this.tap()}
      >
        {watchFace.face === 0 && <Classic />}
        {watchFace.face === 1 && <NumberFlow />}
        {watchFace.face === 2 && <BigNumber />}
        {watchFace.face === 3 && <Simple />}
      </div>
    )
  }
}
