// GeaRenderer — walks a three-style scene graph and feeds the NATIVE
// fixed-function pipeline (gea3d/src/native/gea3d_native.cpp, compiled into
// the firmware via the app's `gea.nativeSources`). The TS side keeps the
// scene graph and matrix math; per-vertex/per-triangle work, depth sorting
// and display present all happen natively. Geometry uploads once per
// BufferGeometry (WebGL semantics: createBuffer + bufferData); per-frame
// traffic is beginFrame + lights + one drawElements per mesh + endFrame.
// Scene classification is double-dispatch through SceneCollector (no
// instanceof, no downcasts — both miscompile in embedded geatsc; see README).

import { Display } from '@geastack/core'
import { Camera } from '../three/camera'
import {
  LIGHT_KIND_DIRECTIONAL,
  LIGHT_KIND_HEMISPHERE,
  Scene,
  SceneCollector,
} from '../three/core'
import { Matrix4, Vector3, clamp } from '../three/math'
import { DoubleSide } from '../three/materials'

// Native engine surface — backed by gea3d_native.cpp through the app's
// `gea.nativeSources`; geatsc lowers these calls to gea::host::gea3d::*.
declare const gea3dNative: {
  createBuffer(): number
  bufferDataF32(buffer: number, data: Float32Array): void
  bufferDataU32(buffer: number, data: Uint32Array): void
  beginFrame(projection: Float32Array, near: number, bgColor: number, viewportW: number, viewportH: number): void
  ambientLight(r: number, g: number, b: number): void
  directionalLight(x: number, y: number, z: number, r: number, g: number, b: number): void
  drawElements(
    positionBuffer: number,
    indexBuffer: number,
    colorBuffer: number,
    triangleCount: number,
    modelView: Float32Array,
    shadeMode: number,
    baseR: number,
    baseG: number,
    baseB: number,
    doubleSide: number,
  ): void
  endFrame(): number
  stat(which: number): number
}

export interface GeaRendererOptions {
  triangleCapacity?: number
}

export class GeaRenderer {
  width: number
  height: number
  autoClear: boolean
  // Render stats for the last frame
  trianglesDrawn: number
  trianglesDropped: number
  statLine: string

  private readonly collector: SceneCollector
  private readonly modelView: Matrix4
  private readonly mvF32: Float32Array
  private readonly projF32: Float32Array
  private readonly lightDir: Vector3
  private readonly lightWorld: Vector3
  private readonly targetWorld: Vector3
  private readonly sphereCenter: Vector3
  // TEMP MEASUREMENT (gea3d phase split): remove after profiling.
  private __perfSetupMs: number
  private __perfDrawMs: number
  private __perfEndMs: number
  private __perfFrames: number

  constructor(options?: GeaRendererOptions) {
    // triangleCapacity is fixed natively (4096); the option is kept for API
    // compatibility and ignored.
    this.collector = new SceneCollector()
    this.width = 0
    this.height = 0
    this.autoClear = true
    this.trianglesDrawn = 0
    this.trianglesDropped = 0
    this.statLine = ''
    // TEMP MEASUREMENT (gea3d phase split): remove after profiling.
    this.__perfSetupMs = 0
    this.__perfDrawMs = 0
    this.__perfEndMs = 0
    this.__perfFrames = 0
    this.modelView = new Matrix4()
    this.mvF32 = new Float32Array(16)
    this.projF32 = new Float32Array(16)
    this.lightDir = new Vector3()
    this.lightWorld = new Vector3()
    this.targetWorld = new Vector3()
    this.sphereCenter = new Vector3()
  }

  setSize(width: number, height: number): void {
    this.width = Math.floor(width)
    this.height = Math.floor(height)
  }

  render(scene: Scene, camera: Camera): void {
    const __perfT0 = Date.now() // TEMP MEASUREMENT (gea3d phase split): remove after profiling.
    if (this.width <= 0 || this.height <= 0) {
      // Use window.* rather than Display.width/height: both are host
      // property→method bridges, but the emitter lowers window.innerWidth
      // reliably, whereas Display.width intermittently emits as a member ref
      // (uncalled method) on larger programs. App code always calls setSize
      // first, so this is only a safety net.
      this.setSize(window.innerWidth, window.innerHeight)
    }

    scene.updateMatrixWorld(false)
    camera.updateMatrixWorld(false)

    const near = camera.near
    const far = camera.far

    const projElements = camera.projectionMatrix.elements
    for (let i = 0; i < 16; i++) this.projF32[i] = projElements[i]

    let bgColor = -1
    if (this.autoClear && scene.backgroundColor >= 0) bgColor = scene.backgroundColor
    gea3dNative.beginFrame(this.projF32, near, bgColor, this.width, this.height)

    // Collect meshes and lights via double dispatch.
    const collector = this.collector
    collector.reset()
    scene.collect(collector)

    // Apply lights first (shading happens during drawElements).
    for (let li = 0; li < collector.lightCount; li++) {
      const light = collector.lights[li]
      if (light.lightKind === LIGHT_KIND_DIRECTIONAL) {
        // Direction toward the light, world space, then into view space.
        this.lightWorld.setFromMatrixPosition(light.matrixWorld)
        this.targetWorld.copy(light.target.position)
        this.lightDir.subVectors(this.lightWorld, this.targetWorld)
        this.lightDir.transformDirection(camera.matrixWorldInverse)
        const c = light.color
        const intensity = light.intensity
        gea3dNative.directionalLight(
          this.lightDir.x,
          this.lightDir.y,
          this.lightDir.z,
          c.r * intensity,
          c.g * intensity,
          c.b * intensity,
        )
      } else if (light.lightKind === LIGHT_KIND_HEMISPHERE) {
        const sky = light.color
        const ground = light.groundColor
        const half = light.intensity * 0.5
        gea3dNative.ambientLight((sky.r + ground.r) * half, (sky.g + ground.g) * half, (sky.b + ground.b) * half)
      } else {
        const c = light.color
        const intensity = light.intensity
        gea3dNative.ambientLight(c.r * intensity, c.g * intensity, c.b * intensity)
      }
    }

    const __perfT1 = Date.now() // TEMP MEASUREMENT (gea3d phase split): remove after profiling.
    // Draw meshes
    for (let m = 0; m < collector.meshCount; m++) {
      const mesh = collector.meshes[m]
      const material = mesh.material
      if (!material.visible) continue
      const geometry = mesh.geometry
      const position = geometry.attributes.position
      if (position.count === 0) continue

      this.modelView.multiplyMatrices(camera.matrixWorldInverse, mesh.matrixWorld)

      // Bounding-sphere reject against near/far planes.
      if (mesh.frustumCulled) {
        if (geometry.boundingSphere.radius < 0) geometry.computeBoundingSphere()
        const sphere = geometry.boundingSphere
        this.sphereCenter.copy(sphere.center).applyMatrix4(this.modelView)
        const radius = sphere.radius * this.modelView.getMaxScaleOnAxis()
        const z = this.sphereCenter.z
        if (z - radius > -near) continue
        if (z + radius < -far) continue
      }

      const indices = geometry.ensureIndexArray()
      const triangleCount = Math.floor(indices.length / 3)
      if (triangleCount <= 0) continue

      // Upload once (WebGL semantics): geometry is static after creation.
      if (geometry.nativePositionBuffer < 0) {
        geometry.nativePositionBuffer = gea3dNative.createBuffer()
        gea3dNative.bufferDataF32(geometry.nativePositionBuffer, position.array)
        geometry.nativeIndexBuffer = gea3dNative.createBuffer()
        gea3dNative.bufferDataU32(geometry.nativeIndexBuffer, indices)
        const colorAttr = geometry.attributes.color
        if (colorAttr.count > 0) {
          geometry.nativeColorBuffer = gea3dNative.createBuffer()
          gea3dNative.bufferDataF32(geometry.nativeColorBuffer, colorAttr.array)
        }
      }

      let colorBuffer = -1
      if (material.vertexColors && geometry.nativeColorBuffer >= 0) colorBuffer = geometry.nativeColorBuffer

      const mve = this.modelView.elements
      for (let i = 0; i < 16; i++) this.mvF32[i] = mve[i]

      const baseR = clamp(material.color.r, 0, 1) * 255
      const baseG = clamp(material.color.g, 0, 1) * 255
      const baseB = clamp(material.color.b, 0, 1) * 255
      const doubleSide = material.side === DoubleSide ? 1 : 0

      gea3dNative.drawElements(
        geometry.nativePositionBuffer,
        geometry.nativeIndexBuffer,
        colorBuffer,
        triangleCount,
        this.mvF32,
        material.shadeMode,
        baseR,
        baseG,
        baseB,
        doubleSide,
      )
    }

    const __perfT2 = Date.now() // TEMP MEASUREMENT (gea3d phase split): remove after profiling.
    const drawn = gea3dNative.endFrame()
    this.trianglesDrawn = drawn < 0 ? 0 : drawn
    this.trianglesDropped = gea3dNative.stat(4)
    // TEMP MEASUREMENT (gea3d phase split): remove after profiling.
    const __perfT3 = Date.now()
    this.__perfSetupMs += __perfT1 - __perfT0
    this.__perfDrawMs += __perfT2 - __perfT1
    this.__perfEndMs += __perfT3 - __perfT2
    this.__perfFrames++
    if (this.__perfFrames >= 120) {
      const n = this.__perfFrames
      this.statLine =
        'submitted=' + gea3dNative.stat(0) +
        ' near=' + gea3dNative.stat(1) +
        ' culled=' + gea3dNative.stat(2) +
        ' clip=' + gea3dNative.stat(3) +
        ' drawn=' + this.trianglesDrawn +
        ' meshes=' + this.collector.meshCount +
        ' lights=' + this.collector.lightCount
      console.log(
        'gea3dperf setup=' + Math.round((this.__perfSetupMs * 10) / n) / 10 +
        ' draw=' + Math.round((this.__perfDrawMs * 10) / n) / 10 +
        ' endFrame=' + Math.round((this.__perfEndMs * 10) / n) / 10 +
        ' | ' + this.statLine,
      )
      this.__perfSetupMs = 0
      this.__perfDrawMs = 0
      this.__perfEndMs = 0
      this.__perfFrames = 0
    }
  }
}
