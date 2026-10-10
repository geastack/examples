import { Component } from '@geastack/core'
import type { CanvasRenderingContext2D } from '@geastack/core'
import { watchFace } from '../store'
import { hourHand, minuteHand, secondHand } from '../../../assets'
import { CanvasSurface } from '../../../common/canvas/CanvasSurface'
import { line } from '../../../common/canvas/paint'
import { factoryRound } from './animation'
import './classic.css'

export class Classic extends Component {
  template() {
    return (
      <div>
        <CanvasSurface />
        {watchFace.classicMode === 0 && (
          <span class="classic-time">
            {(watchFace.faceHour + ':' + watchFace.faceMinute).replaceAll('0', 'O')}
          </span>
        )}
        {watchFace.classicMode === 0 && (
          <span class="classic-weekday">{watchFace.faceWeekday}</span>
        )}
        {watchFace.classicMode === 0 && (
          <div class="classic-date">
            <span>{watchFace.faceDay.replaceAll('0', 'O')}</span>
          </div>
        )}
        <img class="hour-hand" src={hourHand} style={{ transform: watchFace.hourRotation }} />
        <img class="minute-hand" src={minuteHand} style={{ transform: watchFace.minuteRotation }} />
        <img class="second-hand" src={secondHand} style={{ transform: watchFace.secondRotation }} />
      </div>
    )
  }
}

export function drawClassic(ctx: CanvasRenderingContext2D) {
  if (watchFace.classicMode === 0) {
    ctx.fillCircle(233, 233, 179, '#1b1b1b')
  }

  for (let tick = 0; tick < (watchFace.classicMode === 2 ? 0 : 60); tick++) {
    const a = (tick * Math.PI) / 30
    const r = tick % 5 === 0 ? 196 : 210

    line(
      ctx,
      factoryRound(233 + Math.cos(a) * r),
      factoryRound(233 + Math.sin(a) * r),
      factoryRound(233 + Math.cos(a) * 224),
      factoryRound(233 + Math.sin(a) * 224),
      tick % 5 === 0 ? '#6e6e6e' : '#454545',
      2,
    )
  }
}
