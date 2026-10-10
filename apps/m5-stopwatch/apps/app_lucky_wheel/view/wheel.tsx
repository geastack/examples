import { Component } from '@geastack/core'
import type { PointerEvent } from '@geastack/core'
import { system } from '../../../stores/SystemStore'
import { TouchGesture } from '../../../common/gesture/TouchGesture'
import type { CanvasRenderingContext2D } from '@geastack/core'
import { luckyWheel } from '../store'
import { wheelColors } from '../../../lib/model'
import { CanvasSurface } from '../../../common/canvas/CanvasSurface'
import { wheelPointer } from '../../../assets'
import { WheelSelection } from './selection'
import './wheel.css'

export class LuckyWheel extends Component {
  private gesture = new TouchGesture()

  pointerDown(event: PointerEvent) {
    event.stopPropagation()
    if (!system.navigationBlocked && luckyWheel.wheelReady) {
      this.gesture.begin(event.clientX, event.clientY)
    }
  }

  pointerMove(event: PointerEvent) {
    event.stopPropagation()
    this.gesture.move(event.clientX, event.clientY)
  }

  pointerUp(event: PointerEvent) {
    event.stopPropagation()
    if (this.gesture.active && this.gesture.swipe !== 0 && !system.navigationBlocked) {
      luckyWheel.spin(this.gesture.swipe > 0)
    }

    this.gesture.end()
  }

  tap() {
    if (!system.navigationBlocked && this.gesture.swipe === 0) {
      luckyWheel.spin(Math.random() >= 0.5)
    }
  }

  template() {
    return (
      <div class="wheel">
        {!luckyWheel.wheelReady && <WheelSelection />}
        {luckyWheel.wheelReady && (
          <div
            onPointerDown={(event) => this.pointerDown(event)}
            onPointerMove={(event) => this.pointerMove(event)}
            onPointerUp={(event) => this.pointerUp(event)}
            onClick={() => this.tap()}
          >
            <CanvasSurface />
            {luckyWheel.wheelLabels.map((label) => (
              <div
                key={label.id}
                class="wheel-label"
                style={{ transform: label.rotation, color: label.color }}
              >
                <span>{label.id}</span>
              </div>
            ))}
            <img
              class="wheel-pointer"
              src={wheelPointer}
              style={{ transform: luckyWheel.pointerRotation }}
            />
          </div>
        )}
      </div>
    )
  }
}

export function drawWheel(ctx: CanvasRenderingContext2D): void {
  const colors = ['#4ad78c', '#7ac4f5', '#f4ca63', '#d194ea', '#ff77a0']
  const order = wheelColors(luckyWheel.options)

  for (let sector = 0; sector < luckyWheel.options; sector++) {
    const start = (((sector * 360) / luckyWheel.options - 90) * Math.PI) / 180
    const end = ((((sector + 1) * 360) / luckyWheel.options - 90) * Math.PI) / 180

    ctx.fillStyle = colors[order[sector]]
    ctx.beginPath()
    ctx.moveTo(233, 233)
    // Large factory wheel covers the circular display; tessellate arcs to keep sectors curved.
    for (let segment = 0; segment <= 12; segment++) {
      const a = start + ((end - start) * segment) / 12

      ctx.lineTo(233 + Math.cos(a) * 340, 233 + Math.sin(a) * 340)
    }

    ctx.closePath()
    ctx.fill()
  }
}
