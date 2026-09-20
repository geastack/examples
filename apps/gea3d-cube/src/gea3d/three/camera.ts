import { Object3D } from './core'
import { DEG2RAD, Matrix4 } from './math'

export class Camera extends Object3D {
  readonly matrixWorldInverse: Matrix4
  readonly projectionMatrix: Matrix4
  // Clip planes live on the base so the renderer never needs to downcast.
  near: number
  far: number

  constructor() {
    super()
    this.matrixWorldInverse = new Matrix4()
    this.projectionMatrix = new Matrix4()
    this.near = 0.1
    this.far = 2000
    this.isCamera = true
  }

  updateMatrixWorld(force: boolean = false): void {
    super.updateMatrixWorld(force)
    this.matrixWorldInverse.copy(this.matrixWorld).invert()
  }
}

export class PerspectiveCamera extends Camera {
  fov: number
  aspect: number
  zoom: number

  constructor(fov: number = 50, aspect: number = 1, near: number = 0.1, far: number = 2000) {
    super()
    this.fov = fov
    this.aspect = aspect
    this.near = near
    this.far = far
    this.zoom = 1
    this.updateProjectionMatrix()
  }

  updateProjectionMatrix(): void {
    const near = this.near
    const top = (near * Math.tan(DEG2RAD * 0.5 * this.fov)) / this.zoom
    const height = 2 * top
    const width = this.aspect * height
    const left = -0.5 * width
    this.projectionMatrix.makePerspective(left, left + width, top, top - height, near, this.far)
  }
}
