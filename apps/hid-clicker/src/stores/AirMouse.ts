import { Accelerometer, BLE } from '@geastack/core'

const PI = 3.14159265358979323846
const GAIN_X = 0.5
const GAIN_Y = 0.5
const SMOOTH = 0.5
const DEAD_ZONE = 0.0
const LINE_SNAP = 0.04
const SNAP_DECAY = 0.92
const COMPLEMENTARY_ALPHA = 0.03
const MOUSE_SCALE = 15.0

class Vec3 {
  x = 0
  y = 0
  z = 0

  constructor(x = 0, y = 0, z = 0) {
    this.x = x
    this.y = y
    this.z = z
  }
}

class Quaternion {
  w = 1
  x = 0
  y = 0
  z = 0

  constructor(w = 1, x = 0, y = 0, z = 0) {
    this.w = w
    this.x = x
    this.y = y
    this.z = z
  }

  multiply(other: Quaternion) {
    return new Quaternion(
      this.w * other.w - this.x * other.x - this.y * other.y - this.z * other.z,
      this.w * other.x + this.x * other.w + this.y * other.z - this.z * other.y,
      this.w * other.y - this.x * other.z + this.y * other.w + this.z * other.x,
      this.w * other.z + this.x * other.y - this.y * other.x + this.z * other.w,
    )
  }

  normalized() {
    const magnitude = Math.sqrt(this.w * this.w + this.x * this.x + this.y * this.y + this.z * this.z)
    if (magnitude < 0.000001) return new Quaternion()
    return new Quaternion(this.w / magnitude, this.x / magnitude, this.y / magnitude, this.z / magnitude)
  }

  conjugate() {
    return new Quaternion(this.w, -this.x, -this.y, -this.z)
  }

  rotate(value: Vec3) {
    const rotated = this.multiply(new Quaternion(0, value.x, value.y, value.z)).multiply(this.conjugate())
    return new Vec3(rotated.x, rotated.y, rotated.z)
  }

  static fromEuler(x: number, y: number, z: number) {
    const cx = Math.cos(x / 2)
    const sx = Math.sin(x / 2)
    const cy = Math.cos(y / 2)
    const sy = Math.sin(y / 2)
    const cz = Math.cos(z / 2)
    const sz = Math.sin(z / 2)
    return new Quaternion(
      cx * cy * cz + sx * sy * sz,
      sx * cy * cz - cx * sy * sz,
      cx * sy * cz + sx * cy * sz,
      cx * cy * sz - sx * sy * cz,
    )
  }

  static slerp(a: Quaternion, b: Quaternion, t: number) {
    let target = b
    let dot = a.w * b.w + a.x * b.x + a.y * b.y + a.z * b.z
    if (dot < 0) {
      target = new Quaternion(-b.w, -b.x, -b.y, -b.z)
      dot = -dot
    }
    if (dot > 0.9995) {
      return new Quaternion(
        a.w + t * (target.w - a.w),
        a.x + t * (target.x - a.x),
        a.y + t * (target.y - a.y),
        a.z + t * (target.z - a.z),
      ).normalized()
    }

    const theta = Math.acos(dot)
    const sinTheta = Math.sin(theta)
    const weightA = Math.sin((1 - t) * theta) / sinTheta
    const weightB = Math.sin(t * theta) / sinTheta

    return new Quaternion(
      weightA * a.w + weightB * target.w,
      weightA * a.x + weightB * target.x,
      weightA * a.y + weightB * target.y,
      weightA * a.z + weightB * target.z,
    )
  }

  static fromUnitVectors(from: Vec3, to: Vec3) {
    const dot = from.x * to.x + from.y * to.y + from.z * to.z
    if (dot > 0.999999) return new Quaternion()
    if (dot < -0.999999) {
      let axis = new Vec3(1, 0, 0)
      const c = from.x * axis.x + from.y * axis.y + from.z * axis.z
      if (Math.abs(c) > 0.9) axis = new Vec3(0, 1, 0)
      const cx = from.y * axis.z - from.z * axis.y
      const cy = from.z * axis.x - from.x * axis.z
      const cz = from.x * axis.y - from.y * axis.x
      const magnitude = Math.sqrt(cx * cx + cy * cy + cz * cz)
      if (magnitude < 0.000001) return new Quaternion()
      return new Quaternion(0, cx / magnitude, cy / magnitude, cz / magnitude)
    }

    const cx = from.y * to.z - from.z * to.y
    const cy = from.z * to.x - from.x * to.z
    const cz = from.x * to.y - from.y * to.x
    return new Quaternion(1 + dot, cx, cy, cz).normalized()
  }
}

export class AirMouse {
  private running = false
  private buttons = 0
  private orientation = new Quaternion()
  private restOrientation = new Quaternion()
  private smoothNx = 0
  private smoothNy = 0
  private previousNx = 0
  private previousNy = 0
  private accumulatedDx = 0
  private accumulatedDy = 0
  private residualX = 0
  private residualY = 0
  private lastFrameMs = 0

  start() {
    if (this.running) return
    Accelerometer.start()
    this.calibrate()
    this.running = true
    requestAnimationFrame((timestampMs) => this.tick(timestampMs))
  }

  stop() {
    this.running = false
    this.buttons = 0
    this.lastFrameMs = 0
    this.sendMove(0, 0, 0, 0)
  }

  calibrate() {
    Accelerometer.calibrateBias()
    this.resetMotion()
  }

  setButtons(buttons: number) {
    this.buttons = buttons
    this.sendMove(0, 0, this.buttons, 0)
  }

  resetMotion() {
    this.orientation = new Quaternion()
    this.smoothNx = 0
    this.smoothNy = 0
    this.previousNx = 0
    this.previousNy = 0
    this.accumulatedDx = 0
    this.accumulatedDy = 0
    this.residualX = 0
    this.residualY = 0
    this.lastFrameMs = 0

    const restVector = new Vec3(Accelerometer.accelerationY, -Accelerometer.accelerationZ, -Accelerometer.accelerationX)
    const restMagnitude = Math.sqrt(
      restVector.x * restVector.x +
        restVector.y * restVector.y +
        restVector.z * restVector.z,
    )
    this.restOrientation = new Quaternion()
    if (restMagnitude > 0.1) {
      restVector.x = restVector.x / restMagnitude
      restVector.y = restVector.y / restMagnitude
      restVector.z = restVector.z / restMagnitude
      this.restOrientation = Quaternion.fromUnitVectors(restVector, new Vec3(0, 1, 0))
    }
  }

  private tick(timestampMs: number) {
    if (!this.running) return

    const dtMs = this.lastFrameMs > 0 ? Math.min(32, timestampMs - this.lastFrameMs) : 8
    this.lastFrameMs = timestampMs
    this.processSample(dtMs / 1000)
    requestAnimationFrame((nextTimestampMs) => this.tick(nextTimestampMs))
  }

  private processSample(dt: number) {
    const gx = (Accelerometer.gyroscopeX * PI / 180.0) * dt
    const gy = (Accelerometer.gyroscopeY * PI / 180.0) * dt
    const gz = (Accelerometer.gyroscopeZ * PI / 180.0) * dt

    const delta = Quaternion.fromEuler(gy, -gz, -gx)
    this.orientation = this.orientation.multiply(delta).normalized()

    const accelDevice = new Vec3(Accelerometer.accelerationY, -Accelerometer.accelerationZ, -Accelerometer.accelerationX)
    const accelMagnitude = Math.sqrt(
      accelDevice.x * accelDevice.x +
        accelDevice.y * accelDevice.y +
        accelDevice.z * accelDevice.z,
    )
    if (accelMagnitude > 0.3) {
      const accelNormal = new Vec3(
        accelDevice.x / accelMagnitude,
        accelDevice.y / accelMagnitude,
        accelDevice.z / accelMagnitude,
      )
      const corrected = this.restOrientation.rotate(accelNormal)
      const worldUp = this.orientation.rotate(corrected)
      const correction = Quaternion.fromUnitVectors(worldUp, new Vec3(0, 1, 0))
      const smallCorrection = Quaternion.slerp(new Quaternion(), correction, COMPLEMENTARY_ALPHA)
      this.orientation = smallCorrection.multiply(this.orientation).normalized()
    }

    const forward = this.orientation.rotate(new Vec3(0, 0, -1))
    if (Math.abs(forward.z) < 0.01) return

    const t = -5.0 / forward.z
    let nx = (forward.x * t / 2.4) * GAIN_X
    let ny = (-(forward.y * t) / 1.35) * GAIN_Y

    const rawDx = nx - this.previousNx
    const rawDy = ny - this.previousNy
    const moveLength = Math.sqrt(rawDx * rawDx + rawDy * rawDy)

    if (moveLength < DEAD_ZONE) {
      nx = this.previousNx
      ny = this.previousNy
    } else {
      this.accumulatedDx = this.accumulatedDx * SNAP_DECAY + rawDx
      this.accumulatedDy = this.accumulatedDy * SNAP_DECAY + rawDy
      if (LINE_SNAP > 0) {
        const absX = Math.abs(this.accumulatedDx)
        const absY = Math.abs(this.accumulatedDy)
        const maxAxis = absX > absY ? absX : absY
        if (maxAxis > 0.001) {
          const ratio = (absX < absY ? absX : absY) / maxAxis
          if (ratio < LINE_SNAP) {
            if (absX < absY) nx = this.previousNx
            else ny = this.previousNy
          }
        }
      }
    }

    const oldSmoothX = this.smoothNx
    const oldSmoothY = this.smoothNy
    this.smoothNx += SMOOTH * (nx - this.smoothNx)
    this.smoothNy += SMOOTH * (ny - this.smoothNy)
    this.previousNx = nx
    this.previousNy = ny

    this.residualX += (this.smoothNx - oldSmoothX) * MOUSE_SCALE * 100.0
    this.residualY += (this.smoothNy - oldSmoothY) * MOUSE_SCALE * 100.0
    const dx = this.residualX | 0
    const dy = this.residualY | 0
    this.residualX -= dx
    this.residualY -= dy

    if (dx || dy) this.sendMove(dx, dy, this.buttons, 0)
  }

  private sendMove(dx: number, dy: number, buttons: number, wheel: number) {
    BLE.mouse.move(dx, dy, buttons, wheel)
  }
}
