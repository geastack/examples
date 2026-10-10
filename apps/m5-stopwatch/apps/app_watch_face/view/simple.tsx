import { Component } from '@geastack/core'
import type { CanvasRenderingContext2D } from '@geastack/core'
import { watchFace } from '../store'
import { system } from '../../../stores/SystemStore'
import { CanvasSurface } from '../../../common/canvas/CanvasSurface'
import { factoryRound } from './animation'
import './simple.css'

export class Simple extends Component {
  template() {
    return (
      <div class="simple-face" style={{ backgroundColor: watchFace.themeBg }}>
        <CanvasSurface />
        <span class="simple-time" style={{ color: watchFace.themeText }}>
          {watchFace.faceHour + ':' + watchFace.faceMinute}
        </span>
        <span class="simple-date" style={{ color: watchFace.themeDate }}>
          {watchFace.faceDate}
        </span>
        {system.now < watchFace.simpleHintUntil && (
          <div class="simple-hint">
            <div>Long press</div>
            <div>to toggle second dot</div>
          </div>
        )}
      </div>
    )
  }
}

export function drawSimple(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = watchFace.themeBg
  ctx.fillRect(0, 0, 466, 466)

  if (!watchFace.secondDot) {
    return
  }

  const a = Math.fround(
    Math.fround(Math.fround(watchFace.secondsAngle - 90) * Math.fround(Math.PI)) / 180,
  )

  ctx.fillCircle(
    233 + factoryRound(Math.fround(Math.fround(Math.cos(a)) * 214)),
    233 + factoryRound(Math.fround(Math.fround(Math.sin(a)) * 214)),
    7,
    watchFace.themeDate,
  )
}
