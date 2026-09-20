import { Display, rgb } from '@geastack/core'

// Flat-shaded fixed-function pipeline over preallocated typed arrays.
// View space follows the three.js convention: camera at the origin looking
// down -Z, right-handed, CCW front faces. Matrices are column-major
// Float32Array(16) (three.js element order).
//
// Depth ordering is painter's (no z-buffer exists in the gea runtime): view
// depth is bucket-sorted and triangles are emitted back-to-front.

export const SHADE_UNLIT = 0
export const SHADE_LAMBERT = 1
export const SHADE_NORMAL = 2

const MAX_DIR_LIGHTS = 4
const DEPTH_BUCKETS = 1024
const COORD_LIMIT = 30000

// Emission goes straight to Display.ctx (fetched as a local per frame — the
// proven canvas-3d pattern). A presenter abstraction (class or interface
// field) boxes or miscompiles in embedded geatsc today; the Phase-3 native
// backend swaps the emit loop in endFrame instead.
export class RasterPipeline {
  readonly capacity: number

  // Emitted-triangle store (SoA)
  private readonly outX0: Int32Array
  private readonly outY0: Int32Array
  private readonly outX1: Int32Array
  private readonly outY1: Int32Array
  private readonly outX2: Int32Array
  private readonly outY2: Int32Array
  private readonly outDepth: Float32Array
  private readonly outColor: Uint32Array
  private outCount = 0
  droppedTriangles = 0
  // Diagnostic gate counters (reset per frame)
  statSubmitted = 0
  statNearRejected = 0
  statCulled = 0
  statClipDropped = 0
  // TEMP MEASUREMENT (gea3d phase split): remove after profiling.
  perfSortMs = 0
  perfEmitMs = 0
  perfPresentMs = 0

  // Sort scratch
  private readonly sortKeys: Int32Array
  private readonly sortOrder: Int32Array
  private readonly bucketStarts: Int32Array

  // Frame state
  private viewportW = 0
  private viewportH = 0
  private near: f32 = 0.1
  private readonly proj: Float32Array

  // Lights (view space, normalized "toward the light" directions)
  private ambientR: f32 = 1
  private ambientG: f32 = 1
  private ambientB: f32 = 1
  private dirCount = 0
  private readonly dirX: Float32Array
  private readonly dirY: Float32Array
  private readonly dirZ: Float32Array
  private readonly dirR: Float32Array
  private readonly dirG: Float32Array
  private readonly dirB: Float32Array

  // Near-clip scratch: a triangle clipped against one plane yields <= 4 verts.
  private readonly clipX: Float32Array
  private readonly clipY: Float32Array
  private readonly clipZ: Float32Array

  // Default matches GeaRenderer's own default triangleCapacity. A real
  // literal default (not "no default") matters for embedded-geatsc: this
  // field is assigned in GeaRenderer's constructor BODY, not its
  // initializer list, so the emitter member-initializes it via a
  // placeholder default construction before the body reassigns it. With no
  // TS default here, the emitter synthesizes an unsafe `gea_cpp_value::
  // missing()` param default for that placeholder call — missing() coerces
  // to NaN, and `static_cast<size_t>(NaN)` silently truncates to 0 under
  // emscripten (harmless empty vectors, invisible in the WASM sim) but is
  // UB on xtensa: it aliased a garbage huge size_t, blew std::vector's
  // max_size() check, and hard-aborted at boot (exceptions are disabled on
  // this embedded target, so the throw becomes an immediate abort()). A
  // real numeric default here removes the need for any unsafe stand-in.
  constructor(capacity: number = 4096) {
    // Hoist to a plain local before typed-array allocation: constructor
    // params arrive boxed in embedded geatsc, and `new Int32Array(<boxed>)`
    // takes the from-value path and throws.
    const cap = capacity < 1 ? 1 : Math.floor(capacity)
    this.capacity = cap
    this.outX0 = new Int32Array(cap)
    this.outY0 = new Int32Array(cap)
    this.outX1 = new Int32Array(cap)
    this.outY1 = new Int32Array(cap)
    this.outX2 = new Int32Array(cap)
    this.outY2 = new Int32Array(cap)
    this.outDepth = new Float32Array(cap)
    this.outColor = new Uint32Array(cap)
    this.sortKeys = new Int32Array(cap)
    this.sortOrder = new Int32Array(cap)
    this.bucketStarts = new Int32Array(DEPTH_BUCKETS + 1)
    this.proj = new Float32Array(16)
    this.dirX = new Float32Array(MAX_DIR_LIGHTS)
    this.dirY = new Float32Array(MAX_DIR_LIGHTS)
    this.dirZ = new Float32Array(MAX_DIR_LIGHTS)
    this.dirR = new Float32Array(MAX_DIR_LIGHTS)
    this.dirG = new Float32Array(MAX_DIR_LIGHTS)
    this.dirB = new Float32Array(MAX_DIR_LIGHTS)
    this.clipX = new Float32Array(4)
    this.clipY = new Float32Array(4)
    this.clipZ = new Float32Array(4)
  }

  beginFrame(viewportW: number, viewportH: number, projection: Float32Array, near: f32): void {
    this.viewportW = viewportW
    this.viewportH = viewportH
    this.near = near < 0.0001 ? (0.0001 as f32) : near
    for (let i = 0; i < 16; i++) this.proj[i] = projection[i]
    this.outCount = 0
    this.droppedTriangles = 0
    this.statSubmitted = 0
    this.statNearRejected = 0
    this.statCulled = 0
    this.statClipDropped = 0
    this.dirCount = 0
    this.ambientR = 0
    this.ambientG = 0
    this.ambientB = 0
  }

  // Ambient accumulates (several AmbientLights sum, like three.js).
  addAmbient(r: f32, g: f32, b: f32): void {
    this.ambientR = (this.ambientR + r) as f32
    this.ambientG = (this.ambientG + g) as f32
    this.ambientB = (this.ambientB + b) as f32
  }

  // dir = vector pointing TOWARD the light, in view space.
  addDirectionalLight(x: f32, y: f32, z: f32, r: f32, g: f32, b: f32): void {
    if (this.dirCount >= MAX_DIR_LIGHTS) return
    const lenSq: f32 = (x * x + y * y + z * z) as f32
    if (lenSq <= 0) return
    const inv: f32 = (1 / Math.sqrt(lenSq)) as f32
    const i = this.dirCount
    this.dirX[i] = x * inv
    this.dirY[i] = y * inv
    this.dirZ[i] = z * inv
    this.dirR[i] = r
    this.dirG[i] = g
    this.dirB[i] = b
    this.dirCount = i + 1
  }

  // positions: packed xyz Float32Array. indices: 3 per triangle (Uint32Array).
  // modelView: column-major Float32Array(16). base*: material color 0..255.
  // colors: per-vertex rgb (0..1, packed like positions) modulating the base
  // color per face (averaged — flat shading); pass an EMPTY array to disable
  // (a `Float32Array | null` union would box to gea_cpp_value).
  drawTriangles(
    positions: Float32Array,
    indices: Uint32Array,
    triangleCount: number,
    modelView: Float32Array,
    shadeMode: number,
    baseR: number,
    baseG: number,
    baseB: number,
    colors: Float32Array,
    doubleSide: boolean,
  ): void {
    const m0: f32 = modelView[0] as f32
    const m1: f32 = modelView[1] as f32
    const m2: f32 = modelView[2] as f32
    const m4: f32 = modelView[4] as f32
    const m5: f32 = modelView[5] as f32
    const m6: f32 = modelView[6] as f32
    const m8: f32 = modelView[8] as f32
    const m9: f32 = modelView[9] as f32
    const m10: f32 = modelView[10] as f32
    const m12: f32 = modelView[12] as f32
    const m13: f32 = modelView[13] as f32
    const m14: f32 = modelView[14] as f32

    const nearZ: f32 = (-this.near) as f32
    const hasColors = colors.length > 0

    this.statSubmitted += triangleCount
    for (let t = 0; t < triangleCount; t++) {
      const i0 = indices[t * 3] * 3
      const i1 = indices[t * 3 + 1] * 3
      const i2 = indices[t * 3 + 2] * 3

      const p0x: f32 = positions[i0] as f32
      const p0y: f32 = positions[i0 + 1] as f32
      const p0z: f32 = positions[i0 + 2] as f32
      const p1x: f32 = positions[i1] as f32
      const p1y: f32 = positions[i1 + 1] as f32
      const p1z: f32 = positions[i1 + 2] as f32
      const p2x: f32 = positions[i2] as f32
      const p2y: f32 = positions[i2 + 1] as f32
      const p2z: f32 = positions[i2 + 2] as f32

      // To view space
      const v0x: f32 = (m0 * p0x + m4 * p0y + m8 * p0z + m12) as f32
      const v0y: f32 = (m1 * p0x + m5 * p0y + m9 * p0z + m13) as f32
      const v0z: f32 = (m2 * p0x + m6 * p0y + m10 * p0z + m14) as f32
      const v1x: f32 = (m0 * p1x + m4 * p1y + m8 * p1z + m12) as f32
      const v1y: f32 = (m1 * p1x + m5 * p1y + m9 * p1z + m13) as f32
      const v1z: f32 = (m2 * p1x + m6 * p1y + m10 * p1z + m14) as f32
      const v2x: f32 = (m0 * p2x + m4 * p2y + m8 * p2z + m12) as f32
      const v2y: f32 = (m1 * p2x + m5 * p2y + m9 * p2z + m13) as f32
      const v2z: f32 = (m2 * p2x + m6 * p2y + m10 * p2z + m14) as f32

      // Trivial reject: fully behind the near plane
      if (v0z > nearZ && v1z > nearZ && v2z > nearZ) {
        this.statNearRejected++
        continue
      }

      // Face normal (view space, unnormalized)
      const e1x: f32 = (v1x - v0x) as f32
      const e1y: f32 = (v1y - v0y) as f32
      const e1z: f32 = (v1z - v0z) as f32
      const e2x: f32 = (v2x - v0x) as f32
      const e2y: f32 = (v2y - v0y) as f32
      const e2z: f32 = (v2z - v0z) as f32
      let nx: f32 = (e1y * e2z - e1z * e2y) as f32
      let ny: f32 = (e1z * e2x - e1x * e2z) as f32
      let nz: f32 = (e1x * e2y - e1y * e2x) as f32

      // Backface cull against the view vector to the face (camera at origin).
      // CCW front faces have normals pointing toward the camera: dot < 0.
      const viewDot: f32 = (nx * v0x + ny * v0y + nz * v0z) as f32
      if (viewDot >= 0) {
        if (!doubleSide) {
          this.statCulled++
          continue
        }
        nx = (-nx) as f32
        ny = (-ny) as f32
        nz = (-nz) as f32
      }

      // Face color
      let fr: f32 = baseR as f32
      let fg: f32 = baseG as f32
      let fb: f32 = baseB as f32
      if (hasColors) {
        const cr: f32 = ((colors[i0] + colors[i1] + colors[i2]) * 0.33333334) as f32
        const cg: f32 = ((colors[i0 + 1] + colors[i1 + 1] + colors[i2 + 1]) * 0.33333334) as f32
        const cb: f32 = ((colors[i0 + 2] + colors[i1 + 2] + colors[i2 + 2]) * 0.33333334) as f32
        fr = (fr * cr) as f32
        fg = (fg * cg) as f32
        fb = (fb * cb) as f32
      }

      if (shadeMode === SHADE_LAMBERT) {
        const nLenSq: f32 = (nx * nx + ny * ny + nz * nz) as f32
        if (nLenSq > 0) {
          const nInv: f32 = (1 / Math.sqrt(nLenSq)) as f32
          const ux: f32 = (nx * nInv) as f32
          const uy: f32 = (ny * nInv) as f32
          const uz: f32 = (nz * nInv) as f32
          let lr: f32 = this.ambientR
          let lg: f32 = this.ambientG
          let lb: f32 = this.ambientB
          for (let li = 0; li < this.dirCount; li++) {
            const lx: f32 = this.dirX[li] as f32
            const ly: f32 = this.dirY[li] as f32
            const lz: f32 = this.dirZ[li] as f32
            const d: f32 = (ux * lx + uy * ly + uz * lz) as f32
            if (d > 0) {
              const cr: f32 = this.dirR[li] as f32
              const cg: f32 = this.dirG[li] as f32
              const cb: f32 = this.dirB[li] as f32
              lr = (lr + d * cr) as f32
              lg = (lg + d * cg) as f32
              lb = (lb + d * cb) as f32
            }
          }
          fr = (fr * lr) as f32
          fg = (fg * lg) as f32
          fb = (fb * lb) as f32
        }
      } else if (shadeMode === SHADE_NORMAL) {
        const nLenSq: f32 = (nx * nx + ny * ny + nz * nz) as f32
        if (nLenSq > 0) {
          const nInv: f32 = (1 / Math.sqrt(nLenSq)) as f32
          fr = ((nx * nInv * 0.5 + 0.5) * 255) as f32
          fg = ((ny * nInv * 0.5 + 0.5) * 255) as f32
          fb = ((-nz * nInv * 0.5 + 0.5) * 255) as f32
        }
      }

      let ir = Math.floor(fr)
      let ig = Math.floor(fg)
      let ib = Math.floor(fb)
      if (ir < 0) ir = 0
      if (ir > 255) ir = 255
      if (ig < 0) ig = 0
      if (ig > 255) ig = 255
      if (ib < 0) ib = 0
      if (ib > 255) ib = 255
      const pixel = rgb(ir, ig, ib)

      // Near-plane clip (keep z <= -near). Builds a 3- or 4-gon.
      const cx = this.clipX
      const cy = this.clipY
      const cz = this.clipZ
      let clipCount = 0
      // Unrolled edge walk v0->v1->v2->v0
      let ax: f32 = v0x
      let ay: f32 = v0y
      let az: f32 = v0z
      let bx: f32 = v1x
      let by: f32 = v1y
      let bz: f32 = v1z
      for (let e = 0; e < 3; e++) {
        const aIn = az <= nearZ
        const bIn = bz <= nearZ
        if (aIn) {
          cx[clipCount] = ax
          cy[clipCount] = ay
          cz[clipCount] = az
          clipCount++
        }
        if (aIn !== bIn) {
          const tt: f32 = ((nearZ - az) / (bz - az)) as f32
          cx[clipCount] = (ax + (bx - ax) * tt) as f32
          cy[clipCount] = (ay + (by - ay) * tt) as f32
          cz[clipCount] = nearZ
          clipCount++
        }
        ax = bx
        ay = by
        az = bz
        if (e === 0) {
          bx = v2x
          by = v2y
          bz = v2z
        } else {
          bx = v0x
          by = v0y
          bz = v0z
        }
      }
      if (clipCount < 3) {
        this.statClipDropped++
        continue
      }

      // Project the clipped polygon and fan-emit triangles.
      const p = this.proj
      const p0: f32 = p[0] as f32
      const p1: f32 = p[1] as f32
      const p3: f32 = p[3] as f32
      const p4: f32 = p[4] as f32
      const p5: f32 = p[5] as f32
      const p7: f32 = p[7] as f32
      const p8: f32 = p[8] as f32
      const p9: f32 = p[9] as f32
      const p11: f32 = p[11] as f32
      const p12: f32 = p[12] as f32
      const p13: f32 = p[13] as f32
      const p15: f32 = p[15] as f32
      const halfW: f32 = (this.viewportW * 0.5) as f32
      const halfH: f32 = (this.viewportH * 0.5) as f32
      let sx0 = 0
      let sy0 = 0
      let prevX = 0
      let prevY = 0
      // Face sort depth = FARTHEST vertex (Newell's primary key), not the
      // centroid. A large face (a ground plane) spans a wide depth range; its
      // centroid depth sorts it in front of geometry that is beyond the
      // centroid but above the plane, so the plane overdraws it (a floor-
      // colored bite in the torus at the exact screen band where mesh depth
      // crosses the floor's centroid depth). Farthest-vertex sorting draws a
      // ground plane before everything above it — correct for any camera on
      // the visible side — and matches the centroid within a facet's depth
      // span for small compact faces.
      //
      // Computed up front over the clipped vertices (<= 4) so each fan
      // triangle is depth-stamped as it is emitted — single pass, no
      // post-stamp loop over [fanStart, outCount) (that counter's non-literal
      // init resisted int narrowing and ran on soft-double indices on xtensa).
      let depthFar: f32 = cz[0] as f32
      for (let q = 1; q < clipCount; q++) {
        const vq: f32 = cz[q] as f32
        if (vq < depthFar) depthFar = vq
      }
      for (let k = 0; k < clipCount; k++) {
        const vx: f32 = cx[k] as f32
        const vy: f32 = cy[k] as f32
        const vz: f32 = cz[k] as f32
        const clipXk: f32 = (p0 * vx + p4 * vy + p8 * vz + p12) as f32
        const clipYk: f32 = (p1 * vx + p5 * vy + p9 * vz + p13) as f32
        let clipW: f32 = (p3 * vx + p7 * vy + p11 * vz + p15) as f32
        if (clipW < 0.000001 && clipW > -0.000001) clipW = 0.000001 as f32
        const invW: f32 = (1 / clipW) as f32
        let fx: f32 = ((clipXk * invW + 1) * halfW) as f32
        let fy: f32 = ((1 - clipYk * invW) * halfH) as f32
        if (fx < -COORD_LIMIT) fx = -COORD_LIMIT as f32
        if (fx > COORD_LIMIT) fx = COORD_LIMIT as f32
        if (fy < -COORD_LIMIT) fy = -COORD_LIMIT as f32
        if (fy > COORD_LIMIT) fy = COORD_LIMIT as f32
        const sx = Math.floor(fx)
        const sy = Math.floor(fy)
        if (k === 0) {
          sx0 = sx
          sy0 = sy
        } else if (k >= 2) {
          if (this.outCount >= this.capacity) {
            this.droppedTriangles++
          } else {
            const o = this.outCount
            this.outX0[o] = sx0
            this.outY0[o] = sy0
            this.outX1[o] = prevX
            this.outY1[o] = prevY
            this.outX2[o] = sx
            this.outY2[o] = sy
            this.outColor[o] = pixel
            // One depth per source triangle: farthest clipped vertex. All
            // fan triangles share it (one plane-coherent face).
            this.outDepth[o] = depthFar
            this.outCount = o + 1
          }
        }
        prevX = sx
        prevY = sy
      }
    }
  }

  // Sort back-to-front and emit to the presenter, wrapped in ONE batch on ONE
  // ctx instance. The batch/recording state (batchDepth_, presentCommands_)
  // lives on the CanvasRenderingContext2D VALUE HANDLE, not in shared storage:
  // when the renderer bracketed beginBatch()/endBatch() on ITS ctx and this
  // method fetched Display.ctx AGAIN, the second instance saw batchDepth_=0,
  // recording was off, and every fillTriangleRgb565 rasterized IMMEDIATELY
  // into the PSRAM framebuffer (~83us each, 30ms/frame) while the recorded
  // present frame carried only the background rect — the present path then
  // flushed background-only bands over the JSX-flushed triangles (the
  // inter-frame black flashing). The background fill lives here too so the
  // recorded frame keeps its full-screen opaque base (present()'s
  // frameHasOpaqueBase precondition).
  endFrame(bgStyle: string, viewW: number, viewH: number): number {
    const __perfT0 = Date.now() // TEMP MEASUREMENT (gea3d phase split): remove after profiling.
    const ctx = Display.ctx
    ctx.beginBatch()
    if (bgStyle !== '') {
      ctx.fillStyle = bgStyle
      ctx.fillRect(0, 0, viewW, viewH)
    }
    const n = this.outCount
    if (n === 0) {
      ctx.endBatch()
      return 0
    }

    // Depth range (distance in front of camera; view z is negative)
    let dMin: f32 = (-this.outDepth[0]) as f32
    let dMax: f32 = dMin
    for (let i = 1; i < n; i++) {
      const d: f32 = (-this.outDepth[i]) as f32
      if (d < dMin) dMin = d
      if (d > dMax) dMax = d
    }
    const range: f32 = (dMax - dMin) as f32
    const scale: f32 = range > 0.000001 ? ((DEPTH_BUCKETS - 1) / range) as f32 : (0 as f32)

    // Counting sort, key ascending == far-to-near
    const keys = this.sortKeys
    const starts = this.bucketStarts
    for (let b = 0; b <= DEPTH_BUCKETS; b++) starts[b] = 0
    for (let i = 0; i < n; i++) {
      const d: f32 = (-this.outDepth[i]) as f32
      let k = Math.floor((dMax - d) * scale)
      if (k < 0) k = 0
      if (k >= DEPTH_BUCKETS) k = DEPTH_BUCKETS - 1
      keys[i] = k
      starts[k + 1]++
    }
    for (let b = 1; b <= DEPTH_BUCKETS; b++) starts[b] += starts[b - 1]
    const order = this.sortOrder
    for (let i = 0; i < n; i++) {
      const k = keys[i]
      order[starts[k]] = i
      starts[k]++
    }

    const __perfT1 = Date.now() // TEMP MEASUREMENT (gea3d phase split): remove after profiling.
    // ONE recorded present command for the whole depth-sorted frame — the
    // per-triangle fillTriangleRgb565 loop paid command record + replay
    // dispatch per triangle, which dominated at a few hundred triangles.
    ctx.fillTrianglesRgb565Sorted(
      this.outX0,
      this.outY0,
      this.outX1,
      this.outY1,
      this.outX2,
      this.outY2,
      this.outColor,
      order,
      n,
    )
    const __perfT2 = Date.now() // TEMP MEASUREMENT (gea3d phase split): remove after profiling.
    ctx.endBatch()
    // TEMP MEASUREMENT (gea3d phase split): remove after profiling.
    const __perfT3 = Date.now()
    this.perfSortMs = __perfT1 - __perfT0
    this.perfEmitMs = __perfT2 - __perfT1
    this.perfPresentMs = __perfT3 - __perfT2
    return n
  }
}
