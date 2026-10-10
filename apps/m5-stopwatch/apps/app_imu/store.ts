import { Accelerometer, Store } from '@geastack/core'
import { FactoryLinear, unwrapAngle } from '../app_watch_face/view/animation'

const imuX = new FactoryLinear(0.1)
const imuY = new FactoryLinear(0.1)
const imuSize = new FactoryLinear(0.3)
const imuOrbit = new FactoryLinear(0.2)

export class ImuStore extends Store {
  imuLabels = true
  ax = 0
  ay = 0
  az = 0
  ballX = 0
  ballY = 0
  ballSize = 80
  orbit = 0
  yaw = 0
  imuAt = 0
  accelX = 'X: 0.0'
  accelY = 'Y: 0.0'
  accelZ = 'Z: 0.0'

  enter(timestamp: number) {
    this.imuLabels = true
    this.yaw = 0
    this.imuAt = timestamp
    this.ballX = 0
    this.ballY = 0
    this.ballSize = 80
    this.orbit = -Math.PI / 2
    imuX.teleport(0, timestamp)
    imuY.teleport(0, timestamp)
    imuSize.teleport(0, timestamp)
    imuOrbit.teleport(0, timestamp)
    Accelerometer.start()
  }

  tapScreen() {
    this.imuLabels = !this.imuLabels
  }

  tick(timestamp: number) {
    const f = Math.fround

    const gx = f(Accelerometer.gyroscopeX)

    const gy = f(Accelerometer.gyroscopeY)

    const gz = f(Accelerometer.gyroscopeZ)

    const elapsed = f((timestamp - this.imuAt) / 1000)

    const dt = elapsed > 0 ? elapsed : f(0.016)

    const magnitude = f(Math.sqrt(f(f(f(gx * gx) + f(gy * gy)) + f(gz * gz))))

    this.ax = f(Accelerometer.accelerationY / 9.80665)

    this.ay = f(Accelerometer.accelerationX / 9.80665)

    this.az = f(Accelerometer.accelerationZ / 9.80665)

    this.imuAt = timestamp

    imuX.move(Math.max(-1, Math.min(1, this.ax)), timestamp)

    imuY.move(Math.max(-1, Math.min(1, this.ay)), timestamp)

    imuSize.move(Math.max(0, Math.min(1, f(magnitude / 180))), timestamp)

    this.yaw = f(f(this.yaw + f(gz * dt)) % 360)

    imuOrbit.move(unwrapAngle(imuOrbit.target, this.yaw), timestamp)

    this.ballSize = 80 + Math.trunc(f(40 * imuSize.update(timestamp)))

    const range = 144 - Math.floor(this.ballSize / 2)

    this.ballX = Math.trunc(f(range * imuX.update(timestamp)))

    this.ballY = Math.trunc(f(range * imuY.update(timestamp)))

    this.orbit = ((imuOrbit.update(timestamp) - 90) * Math.PI) / 180

    this.accelX = 'X: ' + this.ax.toFixed(1)

    this.accelY = 'Y: ' + this.ay.toFixed(1)

    this.accelZ = 'Z: ' + this.az.toFixed(1)
  }
}

export const imu = new ImuStore()
