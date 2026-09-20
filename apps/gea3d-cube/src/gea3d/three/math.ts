// Typed port of the three.js math core (API-compatible subset).
// Semantics follow three.js: column-major Matrix4.elements, Euler/Quaternion
// onChange sync (wired by Object3D), right-handed coordinates.

export const DEG2RAD = Math.PI / 180

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export class Vector2 {
  x: number
  y: number

  constructor(x: number = 0, y: number = 0) {
    this.x = x
    this.y = y
  }

  set(x: number, y: number): Vector2 {
    this.x = x
    this.y = y
    return this
  }

  copy(v: Vector2): Vector2 {
    this.x = v.x
    this.y = v.y
    return this
  }

  clone(): Vector2 {
    return new Vector2(this.x, this.y)
  }
}

export class Vector3 {
  x: number
  y: number
  z: number

  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this.x = x
    this.y = y
    this.z = z
  }

  set(x: number, y: number, z: number): Vector3 {
    this.x = x
    this.y = y
    this.z = z
    return this
  }

  setScalar(s: number): Vector3 {
    this.x = s
    this.y = s
    this.z = s
    return this
  }

  copy(v: Vector3): Vector3 {
    this.x = v.x
    this.y = v.y
    this.z = v.z
    return this
  }

  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z)
  }

  add(v: Vector3): Vector3 {
    this.x += v.x
    this.y += v.y
    this.z += v.z
    return this
  }

  addVectors(a: Vector3, b: Vector3): Vector3 {
    this.x = a.x + b.x
    this.y = a.y + b.y
    this.z = a.z + b.z
    return this
  }

  addScaledVector(v: Vector3, s: number): Vector3 {
    this.x += v.x * s
    this.y += v.y * s
    this.z += v.z * s
    return this
  }

  sub(v: Vector3): Vector3 {
    this.x -= v.x
    this.y -= v.y
    this.z -= v.z
    return this
  }

  subVectors(a: Vector3, b: Vector3): Vector3 {
    this.x = a.x - b.x
    this.y = a.y - b.y
    this.z = a.z - b.z
    return this
  }

  multiplyScalar(s: number): Vector3 {
    this.x *= s
    this.y *= s
    this.z *= s
    return this
  }

  divideScalar(s: number): Vector3 {
    return this.multiplyScalar(1 / s)
  }

  negate(): Vector3 {
    return this.multiplyScalar(-1)
  }

  dot(v: Vector3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z
  }

  lengthSq(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z
  }

  length(): number {
    return Math.sqrt(this.lengthSq())
  }

  normalize(): Vector3 {
    const len = this.length()
    return this.divideScalar(len > 0 ? len : 1)
  }

  cross(v: Vector3): Vector3 {
    return this.crossVectors(this, v)
  }

  crossVectors(a: Vector3, b: Vector3): Vector3 {
    const ax = a.x
    const ay = a.y
    const az = a.z
    const bx = b.x
    const by = b.y
    const bz = b.z
    this.x = ay * bz - az * by
    this.y = az * bx - ax * bz
    this.z = ax * by - ay * bx
    return this
  }

  distanceTo(v: Vector3): number {
    return Math.sqrt(this.distanceToSquared(v))
  }

  distanceToSquared(v: Vector3): number {
    const dx = this.x - v.x
    const dy = this.y - v.y
    const dz = this.z - v.z
    return dx * dx + dy * dy + dz * dz
  }

  lerp(v: Vector3, alpha: number): Vector3 {
    this.x += (v.x - this.x) * alpha
    this.y += (v.y - this.y) * alpha
    this.z += (v.z - this.z) * alpha
    return this
  }

  applyMatrix4(m: Matrix4): Vector3 {
    const x = this.x
    const y = this.y
    const z = this.z
    const e = m.elements
    const w = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15])
    this.x = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w
    this.y = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w
    this.z = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w
    return this
  }

  applyQuaternion(q: Quaternion): Vector3 {
    const vx = this.x
    const vy = this.y
    const vz = this.z
    const qx = q.x
    const qy = q.y
    const qz = q.z
    const qw = q.w
    // t = 2 * cross(q.xyz, v)
    const tx = 2 * (qy * vz - qz * vy)
    const ty = 2 * (qz * vx - qx * vz)
    const tz = 2 * (qx * vy - qy * vx)
    // v + q.w * t + cross(q.xyz, t)
    this.x = vx + qw * tx + qy * tz - qz * ty
    this.y = vy + qw * ty + qz * tx - qx * tz
    this.z = vz + qw * tz + qx * ty - qy * tx
    return this
  }

  // Rotates by the upper 3x3 of m (no translation), then normalizes.
  transformDirection(m: Matrix4): Vector3 {
    const x = this.x
    const y = this.y
    const z = this.z
    const e = m.elements
    this.x = e[0] * x + e[4] * y + e[8] * z
    this.y = e[1] * x + e[5] * y + e[9] * z
    this.z = e[2] * x + e[6] * y + e[10] * z
    return this.normalize()
  }

  setFromMatrixPosition(m: Matrix4): Vector3 {
    const e = m.elements
    this.x = e[12]
    this.y = e[13]
    this.z = e[14]
    return this
  }

  setFromMatrixColumn(m: Matrix4, index: number): Vector3 {
    const e = m.elements
    const off = index * 4
    this.x = e[off]
    this.y = e[off + 1]
    this.z = e[off + 2]
    return this
  }

  fromArray(array: ArrayLike<number>, offset: number = 0): Vector3 {
    this.x = array[offset]
    this.y = array[offset + 1]
    this.z = array[offset + 2]
    return this
  }
}

export class Vector4 {
  x: number
  y: number
  z: number
  w: number

  constructor(x: number = 0, y: number = 0, z: number = 0, w: number = 1) {
    this.x = x
    this.y = y
    this.z = z
    this.w = w
  }

  set(x: number, y: number, z: number, w: number): Vector4 {
    this.x = x
    this.y = y
    this.z = z
    this.w = w
    return this
  }

  copy(v: Vector4): Vector4 {
    this.x = v.x
    this.y = v.y
    this.z = v.z
    this.w = v.w
    return this
  }
}

export class Quaternion {
  _x: number
  _y: number
  _z: number
  _w: number
  _onChangeCallback: () => void

  constructor(x: number = 0, y: number = 0, z: number = 0, w: number = 1) {
    this._x = x
    this._y = y
    this._z = z
    this._w = w
    this._onChangeCallback = () => {}
  }

  get x(): number {
    return this._x
  }

  set x(value: number) {
    this._x = value
    this._onChangeCallback()
  }

  get y(): number {
    return this._y
  }

  set y(value: number) {
    this._y = value
    this._onChangeCallback()
  }

  get z(): number {
    return this._z
  }

  set z(value: number) {
    this._z = value
    this._onChangeCallback()
  }

  get w(): number {
    return this._w
  }

  set w(value: number) {
    this._w = value
    this._onChangeCallback()
  }

  set(x: number, y: number, z: number, w: number): Quaternion {
    this._x = x
    this._y = y
    this._z = z
    this._w = w
    this._onChangeCallback()
    return this
  }

  copy(q: Quaternion): Quaternion {
    this._x = q._x
    this._y = q._y
    this._z = q._z
    this._w = q._w
    this._onChangeCallback()
    return this
  }

  clone(): Quaternion {
    return new Quaternion(this._x, this._y, this._z, this._w)
  }

  identity(): Quaternion {
    return this.set(0, 0, 0, 1)
  }

  setFromEuler(euler: Euler, update: boolean = true): Quaternion {
    const x = euler._x
    const y = euler._y
    const z = euler._z
    const order = euler._order

    const c1 = Math.cos(x / 2)
    const c2 = Math.cos(y / 2)
    const c3 = Math.cos(z / 2)
    const s1 = Math.sin(x / 2)
    const s2 = Math.sin(y / 2)
    const s3 = Math.sin(z / 2)

    if (order === 'XYZ') {
      this._x = s1 * c2 * c3 + c1 * s2 * s3
      this._y = c1 * s2 * c3 - s1 * c2 * s3
      this._z = c1 * c2 * s3 + s1 * s2 * c3
      this._w = c1 * c2 * c3 - s1 * s2 * s3
    } else if (order === 'YXZ') {
      this._x = s1 * c2 * c3 + c1 * s2 * s3
      this._y = c1 * s2 * c3 - s1 * c2 * s3
      this._z = c1 * c2 * s3 - s1 * s2 * c3
      this._w = c1 * c2 * c3 + s1 * s2 * s3
    } else if (order === 'ZXY') {
      this._x = s1 * c2 * c3 - c1 * s2 * s3
      this._y = c1 * s2 * c3 + s1 * c2 * s3
      this._z = c1 * c2 * s3 + s1 * s2 * c3
      this._w = c1 * c2 * c3 - s1 * s2 * s3
    } else if (order === 'ZYX') {
      this._x = s1 * c2 * c3 - c1 * s2 * s3
      this._y = c1 * s2 * c3 + s1 * c2 * s3
      this._z = c1 * c2 * s3 - s1 * s2 * c3
      this._w = c1 * c2 * c3 + s1 * s2 * s3
    } else if (order === 'YZX') {
      this._x = s1 * c2 * c3 + c1 * s2 * s3
      this._y = c1 * s2 * c3 + s1 * c2 * s3
      this._z = c1 * c2 * s3 - s1 * s2 * c3
      this._w = c1 * c2 * c3 - s1 * s2 * s3
    } else if (order === 'XZY') {
      this._x = s1 * c2 * c3 - c1 * s2 * s3
      this._y = c1 * s2 * c3 - s1 * c2 * s3
      this._z = c1 * c2 * s3 + s1 * s2 * c3
      this._w = c1 * c2 * c3 + s1 * s2 * s3
    }

    if (update) this._onChangeCallback()
    return this
  }

  setFromAxisAngle(axis: Vector3, angle: number): Quaternion {
    const halfAngle = angle / 2
    const s = Math.sin(halfAngle)
    this._x = axis.x * s
    this._y = axis.y * s
    this._z = axis.z * s
    this._w = Math.cos(halfAngle)
    this._onChangeCallback()
    return this
  }

  setFromRotationMatrix(m: Matrix4): Quaternion {
    // Assumes the upper 3x3 of m is a pure (unscaled) rotation.
    const te = m.elements
    const m11 = te[0]
    const m12 = te[4]
    const m13 = te[8]
    const m21 = te[1]
    const m22 = te[5]
    const m23 = te[9]
    const m31 = te[2]
    const m32 = te[6]
    const m33 = te[10]
    const trace = m11 + m22 + m33

    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1.0)
      this._w = 0.25 / s
      this._x = (m32 - m23) * s
      this._y = (m13 - m31) * s
      this._z = (m21 - m12) * s
    } else if (m11 > m22 && m11 > m33) {
      const s = 2.0 * Math.sqrt(1.0 + m11 - m22 - m33)
      this._w = (m32 - m23) / s
      this._x = 0.25 * s
      this._y = (m12 + m21) / s
      this._z = (m13 + m31) / s
    } else if (m22 > m33) {
      const s = 2.0 * Math.sqrt(1.0 + m22 - m11 - m33)
      this._w = (m13 - m31) / s
      this._x = (m12 + m21) / s
      this._y = 0.25 * s
      this._z = (m23 + m32) / s
    } else {
      const s = 2.0 * Math.sqrt(1.0 + m33 - m11 - m22)
      this._w = (m21 - m12) / s
      this._x = (m13 + m31) / s
      this._y = (m23 + m32) / s
      this._z = 0.25 * s
    }

    this._onChangeCallback()
    return this
  }

  multiply(q: Quaternion): Quaternion {
    return this.multiplyQuaternions(this, q)
  }

  premultiply(q: Quaternion): Quaternion {
    return this.multiplyQuaternions(q, this)
  }

  multiplyQuaternions(a: Quaternion, b: Quaternion): Quaternion {
    const qax = a._x
    const qay = a._y
    const qaz = a._z
    const qaw = a._w
    const qbx = b._x
    const qby = b._y
    const qbz = b._z
    const qbw = b._w
    this._x = qax * qbw + qaw * qbx + qay * qbz - qaz * qby
    this._y = qay * qbw + qaw * qby + qaz * qbx - qax * qbz
    this._z = qaz * qbw + qaw * qbz + qax * qby - qay * qbx
    this._w = qaw * qbw - qax * qbx - qay * qby - qaz * qbz
    this._onChangeCallback()
    return this
  }

  lengthSq(): number {
    return this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w
  }

  normalize(): Quaternion {
    let l = Math.sqrt(this.lengthSq())
    if (l === 0) {
      this._x = 0
      this._y = 0
      this._z = 0
      this._w = 1
    } else {
      l = 1 / l
      this._x = this._x * l
      this._y = this._y * l
      this._z = this._z * l
      this._w = this._w * l
    }
    this._onChangeCallback()
    return this
  }

  _onChange(callback: () => void): Quaternion {
    this._onChangeCallback = callback
    return this
  }
}

export class Euler {
  _x: number
  _y: number
  _z: number
  _order: string
  _onChangeCallback: () => void

  constructor(x: number = 0, y: number = 0, z: number = 0, order: string = 'XYZ') {
    this._x = x
    this._y = y
    this._z = z
    this._order = order
    this._onChangeCallback = () => {}
  }

  get x(): number {
    return this._x
  }

  set x(value: number) {
    this._x = value
    this._onChangeCallback()
  }

  get y(): number {
    return this._y
  }

  set y(value: number) {
    this._y = value
    this._onChangeCallback()
  }

  get z(): number {
    return this._z
  }

  set z(value: number) {
    this._z = value
    this._onChangeCallback()
  }

  get order(): string {
    return this._order
  }

  set order(value: string) {
    this._order = value
    this._onChangeCallback()
  }

  set(x: number, y: number, z: number, order: string = ''): Euler {
    this._x = x
    this._y = y
    this._z = z
    if (order !== '') this._order = order
    this._onChangeCallback()
    return this
  }

  copy(e: Euler): Euler {
    this._x = e._x
    this._y = e._y
    this._z = e._z
    this._order = e._order
    this._onChangeCallback()
    return this
  }

  clone(): Euler {
    return new Euler(this._x, this._y, this._z, this._order)
  }

  setFromRotationMatrix(m: Matrix4, order: string = '', update: boolean = true): Euler {
    // Assumes the upper 3x3 of m is a pure (unscaled) rotation.
    const te = m.elements
    return this.setFromRotationElements(te[0], te[4], te[8], te[1], te[5], te[9], te[2], te[6], te[10], order, update)
  }

  setFromRotationElements(
    m11: number, m12: number, m13: number,
    m21: number, m22: number, m23: number,
    m31: number, m32: number, m33: number,
    order: string = '', update: boolean = true,
  ): Euler {
    const ord = order !== '' ? order : this._order

    if (ord === 'XYZ') {
      this._y = Math.asin(clamp(m13, -1, 1))
      if (Math.abs(m13) < 0.9999999) {
        this._x = Math.atan2(-m23, m33)
        this._z = Math.atan2(-m12, m11)
      } else {
        this._x = Math.atan2(m32, m22)
        this._z = 0
      }
    } else if (ord === 'YXZ') {
      this._x = Math.asin(-clamp(m23, -1, 1))
      if (Math.abs(m23) < 0.9999999) {
        this._y = Math.atan2(m13, m33)
        this._z = Math.atan2(m21, m22)
      } else {
        this._y = Math.atan2(-m31, m11)
        this._z = 0
      }
    } else if (ord === 'ZXY') {
      this._x = Math.asin(clamp(m32, -1, 1))
      if (Math.abs(m32) < 0.9999999) {
        this._y = Math.atan2(-m31, m33)
        this._z = Math.atan2(-m12, m22)
      } else {
        this._y = 0
        this._z = Math.atan2(m21, m11)
      }
    } else if (ord === 'ZYX') {
      this._y = Math.asin(-clamp(m31, -1, 1))
      if (Math.abs(m31) < 0.9999999) {
        this._x = Math.atan2(m32, m33)
        this._z = Math.atan2(m21, m11)
      } else {
        this._x = 0
        this._z = Math.atan2(-m12, m22)
      }
    } else if (ord === 'YZX') {
      this._z = Math.asin(clamp(m21, -1, 1))
      if (Math.abs(m21) < 0.9999999) {
        this._x = Math.atan2(-m23, m22)
        this._y = Math.atan2(-m31, m11)
      } else {
        this._x = 0
        this._y = Math.atan2(m13, m33)
      }
    } else if (ord === 'XZY') {
      this._z = Math.asin(-clamp(m12, -1, 1))
      if (Math.abs(m12) < 0.9999999) {
        this._x = Math.atan2(m32, m22)
        this._y = Math.atan2(m13, m11)
      } else {
        this._x = Math.atan2(-m23, m33)
        this._y = 0
      }
    }

    this._order = ord
    if (update) this._onChangeCallback()
    return this
  }

  setFromQuaternion(q: Quaternion, order: string = '', update: boolean = true): Euler {
    // Rotation-matrix elements computed directly from the quaternion —
    // no Matrix4 temporary (see the no-scratch note above).
    const x = q._x
    const y = q._y
    const z = q._z
    const w = q._w
    const x2 = x + x
    const y2 = y + y
    const z2 = z + z
    const xx = x * x2
    const xy = x * y2
    const xz = x * z2
    const yy = y * y2
    const yz = y * z2
    const zz = z * z2
    const wx = w * x2
    const wy = w * y2
    const wz = w * z2
    const m11 = 1 - (yy + zz)
    const m12 = xy - wz
    const m13 = xz + wy
    const m21 = xy + wz
    const m22 = 1 - (xx + zz)
    const m23 = yz - wx
    const m31 = xz - wy
    const m32 = yz + wx
    const m33 = 1 - (xx + yy)
    return this.setFromRotationElements(m11, m12, m13, m21, m22, m23, m31, m32, m33, order, update)
  }

  _onChange(callback: () => void): Euler {
    this._onChangeCallback = callback
    return this
  }
}

export class Matrix4 {
  readonly elements: number[]

  constructor() {
    this.elements = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
  }

  // Row-major argument order, stored column-major (three.js convention).
  set(
    n11: number, n12: number, n13: number, n14: number,
    n21: number, n22: number, n23: number, n24: number,
    n31: number, n32: number, n33: number, n34: number,
    n41: number, n42: number, n43: number, n44: number,
  ): Matrix4 {
    const te = this.elements
    te[0] = n11
    te[4] = n12
    te[8] = n13
    te[12] = n14
    te[1] = n21
    te[5] = n22
    te[9] = n23
    te[13] = n24
    te[2] = n31
    te[6] = n32
    te[10] = n33
    te[14] = n34
    te[3] = n41
    te[7] = n42
    te[11] = n43
    te[15] = n44
    return this
  }

  identity(): Matrix4 {
    return this.set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)
  }

  copy(m: Matrix4): Matrix4 {
    const te = this.elements
    const me = m.elements
    for (let i = 0; i < 16; i++) te[i] = me[i]
    return this
  }

  clone(): Matrix4 {
    return new Matrix4().copy(this)
  }

  multiply(m: Matrix4): Matrix4 {
    return this.multiplyMatrices(this, m)
  }

  premultiply(m: Matrix4): Matrix4 {
    return this.multiplyMatrices(m, this)
  }

  multiplyMatrices(a: Matrix4, b: Matrix4): Matrix4 {
    const ae = a.elements
    const be = b.elements
    const te = this.elements

    const a11 = ae[0]
    const a12 = ae[4]
    const a13 = ae[8]
    const a14 = ae[12]
    const a21 = ae[1]
    const a22 = ae[5]
    const a23 = ae[9]
    const a24 = ae[13]
    const a31 = ae[2]
    const a32 = ae[6]
    const a33 = ae[10]
    const a34 = ae[14]
    const a41 = ae[3]
    const a42 = ae[7]
    const a43 = ae[11]
    const a44 = ae[15]

    const b11 = be[0]
    const b12 = be[4]
    const b13 = be[8]
    const b14 = be[12]
    const b21 = be[1]
    const b22 = be[5]
    const b23 = be[9]
    const b24 = be[13]
    const b31 = be[2]
    const b32 = be[6]
    const b33 = be[10]
    const b34 = be[14]
    const b41 = be[3]
    const b42 = be[7]
    const b43 = be[11]
    const b44 = be[15]

    te[0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41
    te[4] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42
    te[8] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43
    te[12] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44
    te[1] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41
    te[5] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42
    te[9] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43
    te[13] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44
    te[2] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41
    te[6] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42
    te[10] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43
    te[14] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44
    te[3] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41
    te[7] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42
    te[11] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43
    te[15] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44
    return this
  }

  makeRotationFromQuaternion(q: Quaternion): Matrix4 {
    // compose(zero, q, one) without the temporary vectors
    const te = this.elements
    const x = q._x
    const y = q._y
    const z = q._z
    const w = q._w
    const x2 = x + x
    const y2 = y + y
    const z2 = z + z
    const xx = x * x2
    const xy = x * y2
    const xz = x * z2
    const yy = y * y2
    const yz = y * z2
    const zz = z * z2
    const wx = w * x2
    const wy = w * y2
    const wz = w * z2
    te[0] = 1 - (yy + zz)
    te[1] = xy + wz
    te[2] = xz - wy
    te[3] = 0
    te[4] = xy - wz
    te[5] = 1 - (xx + zz)
    te[6] = yz + wx
    te[7] = 0
    te[8] = xz + wy
    te[9] = yz - wx
    te[10] = 1 - (xx + yy)
    te[11] = 0
    te[12] = 0
    te[13] = 0
    te[14] = 0
    te[15] = 1
    return this
  }

  compose(position: Vector3, quaternion: Quaternion, scale: Vector3): Matrix4 {
    const te = this.elements
    const x = quaternion._x
    const y = quaternion._y
    const z = quaternion._z
    const w = quaternion._w
    const x2 = x + x
    const y2 = y + y
    const z2 = z + z
    const xx = x * x2
    const xy = x * y2
    const xz = x * z2
    const yy = y * y2
    const yz = y * z2
    const zz = z * z2
    const wx = w * x2
    const wy = w * y2
    const wz = w * z2
    const sx = scale.x
    const sy = scale.y
    const sz = scale.z

    te[0] = (1 - (yy + zz)) * sx
    te[1] = (xy + wz) * sx
    te[2] = (xz - wy) * sx
    te[3] = 0
    te[4] = (xy - wz) * sy
    te[5] = (1 - (xx + zz)) * sy
    te[6] = (yz + wx) * sy
    te[7] = 0
    te[8] = (xz + wy) * sz
    te[9] = (yz - wx) * sz
    te[10] = (1 - (xx + yy)) * sz
    te[11] = 0
    te[12] = position.x
    te[13] = position.y
    te[14] = position.z
    te[15] = 1
    return this
  }

  invert(): Matrix4 {
    // Full 4x4 inverse (three.js implementation).
    const te = this.elements
    const n11 = te[0]
    const n21 = te[1]
    const n31 = te[2]
    const n41 = te[3]
    const n12 = te[4]
    const n22 = te[5]
    const n32 = te[6]
    const n42 = te[7]
    const n13 = te[8]
    const n23 = te[9]
    const n33 = te[10]
    const n43 = te[11]
    const n14 = te[12]
    const n24 = te[13]
    const n34 = te[14]
    const n44 = te[15]

    const t11 = n23 * n34 * n42 - n24 * n33 * n42 + n24 * n32 * n43 - n22 * n34 * n43 - n23 * n32 * n44 + n22 * n33 * n44
    const t12 = n14 * n33 * n42 - n13 * n34 * n42 - n14 * n32 * n43 + n12 * n34 * n43 + n13 * n32 * n44 - n12 * n33 * n44
    const t13 = n13 * n24 * n42 - n14 * n23 * n42 + n14 * n22 * n43 - n12 * n24 * n43 - n13 * n22 * n44 + n12 * n23 * n44
    const t14 = n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34

    const det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14
    if (det === 0) return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)

    const detInv = 1 / det
    te[0] = t11 * detInv
    te[1] = (n24 * n33 * n41 - n23 * n34 * n41 - n24 * n31 * n43 + n21 * n34 * n43 + n23 * n31 * n44 - n21 * n33 * n44) * detInv
    te[2] = (n22 * n34 * n41 - n24 * n32 * n41 + n24 * n31 * n42 - n21 * n34 * n42 - n22 * n31 * n44 + n21 * n32 * n44) * detInv
    te[3] = (n23 * n32 * n41 - n22 * n33 * n41 - n23 * n31 * n42 + n21 * n33 * n42 + n22 * n31 * n43 - n21 * n32 * n43) * detInv
    te[4] = t12 * detInv
    te[5] = (n13 * n34 * n41 - n14 * n33 * n41 + n14 * n31 * n43 - n11 * n34 * n43 - n13 * n31 * n44 + n11 * n33 * n44) * detInv
    te[6] = (n14 * n32 * n41 - n12 * n34 * n41 - n14 * n31 * n42 + n11 * n34 * n42 + n12 * n31 * n44 - n11 * n32 * n44) * detInv
    te[7] = (n12 * n33 * n41 - n13 * n32 * n41 + n13 * n31 * n42 - n11 * n33 * n42 - n12 * n31 * n43 + n11 * n32 * n43) * detInv
    te[8] = t13 * detInv
    te[9] = (n14 * n23 * n41 - n13 * n24 * n41 - n14 * n21 * n43 + n11 * n24 * n43 + n13 * n21 * n44 - n11 * n23 * n44) * detInv
    te[10] = (n12 * n24 * n41 - n14 * n22 * n41 + n14 * n21 * n42 - n11 * n24 * n42 - n12 * n21 * n44 + n11 * n22 * n44) * detInv
    te[11] = (n13 * n22 * n41 - n12 * n23 * n41 - n13 * n21 * n42 + n11 * n23 * n42 + n12 * n21 * n43 - n11 * n22 * n43) * detInv
    te[12] = t14 * detInv
    te[13] = (n13 * n24 * n31 - n14 * n23 * n31 + n14 * n21 * n33 - n11 * n24 * n33 - n13 * n21 * n34 + n11 * n23 * n34) * detInv
    te[14] = (n14 * n22 * n31 - n12 * n24 * n31 - n14 * n21 * n32 + n11 * n24 * n32 + n12 * n21 * n34 - n11 * n22 * n34) * detInv
    te[15] = (n12 * n23 * n31 - n13 * n22 * n31 + n13 * n21 * n32 - n11 * n23 * n32 - n12 * n21 * n33 + n11 * n22 * n33) * detInv
    return this
  }

  setPosition(x: number, y: number, z: number): Matrix4 {
    const te = this.elements
    te[12] = x
    te[13] = y
    te[14] = z
    return this
  }

  // Rotation-only look-at (three.js Matrix4.lookAt), scalar-style.
  lookAt(eye: Vector3, target: Vector3, up: Vector3): Matrix4 {
    return this.lookAtScalar(eye.x, eye.y, eye.z, target.x, target.y, target.z, up.x, up.y, up.z)
  }

  lookAtScalar(
    eyeX: number, eyeY: number, eyeZ: number,
    targetX: number, targetY: number, targetZ: number,
    upX: number, upY: number, upZ: number,
  ): Matrix4 {
    const te = this.elements
    let zx = eyeX - targetX
    let zy = eyeY - targetY
    let zz = eyeZ - targetZ
    let zLenSq = zx * zx + zy * zy + zz * zz
    if (zLenSq === 0) {
      zz = 1
      zLenSq = 1
    }
    let inv = 1 / Math.sqrt(zLenSq)
    zx *= inv
    zy *= inv
    zz *= inv
    let xx = upY * zz - upZ * zy
    let xy = upZ * zx - upX * zz
    let xz = upX * zy - upY * zx
    let xLenSq = xx * xx + xy * xy + xz * xz
    if (xLenSq === 0) {
      // up and z are parallel
      if (Math.abs(upZ) === 1) zx += 0.0001
      else zz += 0.0001
      inv = 1 / Math.sqrt(zx * zx + zy * zy + zz * zz)
      zx *= inv
      zy *= inv
      zz *= inv
      xx = upY * zz - upZ * zy
      xy = upZ * zx - upX * zz
      xz = upX * zy - upY * zx
      xLenSq = xx * xx + xy * xy + xz * xz
    }
    inv = xLenSq > 0 ? 1 / Math.sqrt(xLenSq) : 1
    xx *= inv
    xy *= inv
    xz *= inv
    const yx = zy * xz - zz * xy
    const yy = zz * xx - zx * xz
    const yz = zx * xy - zy * xx
    te[0] = xx
    te[4] = yx
    te[8] = zx
    te[1] = xy
    te[5] = yy
    te[9] = zy
    te[2] = xz
    te[6] = yz
    te[10] = zz
    return this
  }

  makePerspective(left: number, right: number, top: number, bottom: number, near: number, far: number): Matrix4 {
    const te = this.elements
    const x = (2 * near) / (right - left)
    const y = (2 * near) / (top - bottom)
    const a = (right + left) / (right - left)
    const b = (top + bottom) / (top - bottom)
    const c = -(far + near) / (far - near)
    const d = (-2 * far * near) / (far - near)
    te[0] = x
    te[4] = 0
    te[8] = a
    te[12] = 0
    te[1] = 0
    te[5] = y
    te[9] = b
    te[13] = 0
    te[2] = 0
    te[6] = 0
    te[10] = c
    te[14] = d
    te[3] = 0
    te[7] = 0
    te[11] = -1
    te[15] = 0
    return this
  }

  makeOrthographic(left: number, right: number, top: number, bottom: number, near: number, far: number): Matrix4 {
    const te = this.elements
    const w = 1.0 / (right - left)
    const h = 1.0 / (top - bottom)
    const p = 1.0 / (far - near)
    te[0] = 2 * w
    te[4] = 0
    te[8] = 0
    te[12] = -(right + left) * w
    te[1] = 0
    te[5] = 2 * h
    te[9] = 0
    te[13] = -(top + bottom) * h
    te[2] = 0
    te[6] = 0
    te[10] = -2 * p
    te[14] = -(far + near) * p
    te[3] = 0
    te[7] = 0
    te[11] = 0
    te[15] = 1
    return this
  }

  getMaxScaleOnAxis(): number {
    const te = this.elements
    const sqX = te[0] * te[0] + te[1] * te[1] + te[2] * te[2]
    const sqY = te[4] * te[4] + te[5] * te[5] + te[6] * te[6]
    const sqZ = te[8] * te[8] + te[9] * te[9] + te[10] * te[10]
    return Math.sqrt(Math.max(sqX, Math.max(sqY, sqZ)))
  }
}

// NOTE: no module-scope scratch singletons and no lazy scratch containers —
// both patterns miscompile in embedded geatsc today (module-scope instances
// lower by-value; nullable class-typed globals box and fail to round-trip).
// Hot conversions are written scalar-style instead; cold paths allocate
// small temporaries per call.

export class Color {
  r: number
  g: number
  b: number

  constructor(r: number = -1, g: number = -1, b: number = -1) {
    this.r = 1
    this.g = 1
    this.b = 1
    if (r < 0) return // new Color() = white
    if (g < 0 || b < 0) this.setHex(Math.floor(r))
    else this.setRGB(r, g, b)
  }

  set(hex: number): Color {
    return this.setHex(hex)
  }

  setHex(hex: number): Color {
    const h = Math.floor(hex)
    this.r = ((h >> 16) & 255) / 255
    this.g = ((h >> 8) & 255) / 255
    this.b = (h & 255) / 255
    return this
  }

  setRGB(r: number, g: number, b: number): Color {
    this.r = r
    this.g = g
    this.b = b
    return this
  }

  setHSL(h: number, s: number, l: number): Color {
    // h,s,l in [0,1] (three.js semantics)
    let hue = h % 1
    if (hue < 0) hue += 1
    if (s === 0) {
      this.r = l
      this.g = l
      this.b = l
      return this
    }
    const q = l <= 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    this.r = hue2rgb(p, q, hue + 1 / 3)
    this.g = hue2rgb(p, q, hue)
    this.b = hue2rgb(p, q, hue - 1 / 3)
    return this
  }

  copy(c: Color): Color {
    this.r = c.r
    this.g = c.g
    this.b = c.b
    return this
  }

  clone(): Color {
    const c = new Color(0xffffff)
    c.r = this.r
    c.g = this.g
    c.b = this.b
    return c
  }

  multiply(c: Color): Color {
    this.r *= c.r
    this.g *= c.g
    this.b *= c.b
    return this
  }

  multiplyScalar(s: number): Color {
    this.r *= s
    this.g *= s
    this.b *= s
    return this
  }

  getHex(): number {
    const r = Math.round(clamp(this.r * 255, 0, 255))
    const g = Math.round(clamp(this.g * 255, 0, 255))
    const b = Math.round(clamp(this.b * 255, 0, 255))
    return (r << 16) | (g << 8) | b
  }
}

function hue2rgb(p: number, q: number, t: number): number {
  let tt = t
  if (tt < 0) tt += 1
  if (tt > 1) tt -= 1
  if (tt < 1 / 6) return p + (q - p) * 6 * tt
  if (tt < 1 / 2) return q
  if (tt < 2 / 3) return p + (q - p) * 6 * (2 / 3 - tt)
  return p
}
