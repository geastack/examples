import { Component } from '@geastack/core'
import type { CanvasRenderingContext2D } from '@geastack/core'
import { imu } from '../store'
import { system } from '../../../stores/SystemStore'
import { CanvasSurface } from '../../../common/canvas/CanvasSurface'
import './view.css'

export class IMUView extends Component {
  template() {
    return (
      <div
        class="imu"
        onClick={() => {
          if (!system.navigationBlocked) {
            imu.tapScreen()
          }
        }}
      >
        <CanvasSurface />
        <div
          class="imu-cross imu-ball-horizontal"
          style={{ left: 215 + imu.ballX, top: 232 + imu.ballY }}
        />
        <div
          class="imu-cross imu-ball-vertical"
          style={{ left: 232 + imu.ballX, top: 215 + imu.ballY }}
        />
        <div class="imu-cross imu-overlay-horizontal" />
        <div class="imu-cross imu-overlay-vertical" />
        {imu.imuLabels && (
          <div>
            <span class="accel ax">{imu.accelX}</span>
            <span class="accel ay">{imu.accelY}</span>
            <span class="accel az">{imu.accelZ}</span>
          </div>
        )}
      </div>
    )
  }
}

export function drawImu(ctx: CanvasRenderingContext2D): void {
  const size = imu.ballSize
  const x = 233 + imu.ballX
  const y = 233 + imu.ballY

  ctx.fillCircle(x, y, size / 2, '#ffb333')
  if (imu.imuLabels) {
    ctx.fillCircle(233 + Math.cos(imu.orbit) * 214, 233 + Math.sin(imu.orbit) * 214, 9, '#cbffb1')
  }
}
