import { Component } from '@geastack/core'
import { diag } from '../../stores/DiagnosticsStore'
import './ImuScreen.css'
import './NotPresent.css'

export class ImuScreen extends Component {
  template() {
    return (
      <div class="screen-body imu-screen">
        {diag.compact == 1 ? (
          <div class="imu-live">
            <div class="level-pad">
              <span class="level-bubble" style={{ left: 42 - diag.tiltX * 0.6, top: 42 + diag.tiltY * 0.6 }}></span>
            </div>
            <span class="imu-caption">TILT TO MOVE THE BUBBLE</span>
            <span class="imu-caption imu-caption-accel">{diag.accelText}</span>
          </div>
        ) : (
          <div class="imu-live">
            <div class="kv-row"><span class="kv-k">ACCEL X/Y/Z</span><span class="kv-v">{diag.accelText}</span></div>
            <div class="kv-row"><span class="kv-k">GYRO X/Y/Z</span><span class="kv-v">{diag.gyroText}</span></div>
            <div class="kv-row"><span class="kv-k">TILT X/Y</span><span class="kv-v">{diag.tiltText}</span></div>
            <div class="level-pad">
              <span class="level-bubble" style={{ left: 110 + diag.tiltX * 2, top: 110 + diag.tiltY * 2 }}></span>
            </div>
          </div>
        )}
      </div>
    )
  }
}
