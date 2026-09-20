import { Display, rgb } from '@geastack/core'

const initialDisplayW = Math.floor(window.innerWidth)
const initialDisplayH = Math.floor(window.innerHeight)
export const DISPLAY_W = initialDisplayW < 1 ? 1 : initialDisplayW
export const DISPLAY_H = initialDisplayH < 1 ? 1 : initialDisplayH
// Scale design-time pixel constants by the device pixel ratio so the cube
// renders the same physical size as it was authored for on the reference
// (DPR=1) screen. The canvas is already a physical-pixel framebuffer of
// DISPLAY_W × DISPLAY_H, so we just multiply the projection focal length,
// shadow radius, and HUD offsets here.
let devicePixelRatio: f32 = Display.getDevicePixelRatio() as f32
if (devicePixelRatio < 1) devicePixelRatio = 1
const DPR: f32 = devicePixelRatio

const VERTEX_COUNT = 8
const TRIANGLE_COUNT = 12
const FACE_COUNT = 6
const CUBE_SCALE: f32 = 1.15
const DEPTH_TABLE_COUNT = 146
const DEPTH_TABLE_LAST_INDEX = DEPTH_TABLE_COUNT - 2
const DEPTH_TABLE_MIN: f32 = 2
const DEPTH_TABLE_STEP: f32 = 0.03125
const DEPTH_TABLE_INV_STEP: f32 = 32
const INV_3: f32 = 0.33333334
const FRAME_STEP_PER_MS: f32 = 0.05999988
const ROTATE_X_PER_STEP: f32 = 0.018
const ROTATE_Y_PER_STEP: f32 = 0.032
const INITIAL_ROT_X_SIN: f32 = 0.40776045
const INITIAL_ROT_X_COS: f32 = 0.91308894
const INITIAL_ROT_Y_SIN: f32 = 0.19866933
const INITIAL_ROT_Y_COS: f32 = 0.98006658
const CENTER_X: f32 = (DISPLAY_W / 2) as f32
const CENTER_Y: f32 = (DISPLAY_H / 2 + 12 * DPR) as f32
const FOCAL_LENGTH: f32 = (178 * DPR) as f32
const CAMERA_Z: f32 = 4.2
const LIGHT_X: f32 = -0.36
const LIGHT_Y: f32 = -0.58
const LIGHT_Z: f32 = -0.73

const baseX = new Float32Array(VERTEX_COUNT)
const baseY = new Float32Array(VERTEX_COUNT)
const baseZ = new Float32Array(VERTEX_COUNT)
const worldX = new Float32Array(VERTEX_COUNT)
const worldY = new Float32Array(VERTEX_COUNT)
const worldZ = new Float32Array(VERTEX_COUNT)
const screenX = new Int32Array(VERTEX_COUNT)
const screenY = new Int32Array(VERTEX_COUNT)

const triA = new Int32Array(TRIANGLE_COUNT)
const triB = new Int32Array(TRIANGLE_COUNT)
const triC = new Int32Array(TRIANGLE_COUNT)
const triFace = new Int32Array(TRIANGLE_COUNT)
const triR = new Int32Array(TRIANGLE_COUNT)
const triG = new Int32Array(TRIANGLE_COUNT)
const triBColor = new Int32Array(TRIANGLE_COUNT)
const triOrder = new Int32Array(TRIANGLE_COUNT)
const triDepth = new Float32Array(TRIANGLE_COUNT)
const triColor = new Uint32Array(TRIANGLE_COUNT)
const faceNormalX = new Float32Array(FACE_COUNT)
const faceNormalY = new Float32Array(FACE_COUNT)
const faceNormalZ = new Float32Array(FACE_COUNT)
const invDepthTable = new Float32Array(DEPTH_TABLE_COUNT)

let ctx = Display.ctx
let rotXSin: f32 = INITIAL_ROT_X_SIN
let rotXCos: f32 = INITIAL_ROT_X_COS
let rotYSin: f32 = INITIAL_ROT_Y_SIN
let rotYCos: f32 = INITIAL_ROT_Y_COS
let jumpOffset: f32 = 0
let jumpVelocity: f32 = 0
let lastTimestamp = 0
let fpsWindowStart = 0
let fpsFrames = 0
let fps = 0

export type CanvasColor = number

declare global {
  function requestAnimationFrame(cb: (timestampMs: number) => void): number
}

function clampColor(value: number): number {
  if (value < 0) return 0
  if (value > 255) return 255
  return Math.floor(value)
}

function shadedColor(r: number, g: number, b: number, light: f32): CanvasColor {
  const shade: f32 = (0.24 + light * 0.76) as f32
  return rgb(clampColor(r * shade), clampColor(g * shade), clampColor(b * shade))
}

function setVertex(i: number, x: f32, y: f32, z: f32) {
  baseX[i] = x
  baseY[i] = y
  baseZ[i] = z
}

function setTriangle(i: number, a: number, b: number, c: number, face: number, r: number, g: number, blue: number) {
  triA[i] = a
  triB[i] = b
  triC[i] = c
  triFace[i] = face
  triR[i] = r
  triG[i] = g
  triBColor[i] = blue
}

function initGeometry() {
  setVertex(0, -1, -1, -1)
  setVertex(1, 1, -1, -1)
  setVertex(2, 1, 1, -1)
  setVertex(3, -1, 1, -1)
  setVertex(4, -1, -1, 1)
  setVertex(5, 1, -1, 1)
  setVertex(6, 1, 1, 1)
  setVertex(7, -1, 1, 1)

  setTriangle(0, 0, 2, 1, 0, 64, 210, 255)
  setTriangle(1, 0, 3, 2, 0, 64, 210, 255)
  setTriangle(2, 4, 5, 6, 1, 72, 104, 255)
  setTriangle(3, 4, 6, 7, 1, 72, 104, 255)
  setTriangle(4, 0, 4, 7, 2, 62, 226, 154)
  setTriangle(5, 0, 7, 3, 2, 62, 226, 154)
  setTriangle(6, 1, 2, 6, 3, 255, 142, 76)
  setTriangle(7, 1, 6, 5, 3, 255, 142, 76)
  setTriangle(8, 0, 1, 5, 4, 244, 235, 128)
  setTriangle(9, 0, 5, 4, 4, 244, 235, 128)
  setTriangle(10, 3, 7, 6, 5, 186, 112, 255)
  setTriangle(11, 3, 6, 2, 5, 186, 112, 255)

  for (let i = 0; i < TRIANGLE_COUNT; i++) triOrder[i] = i
}

function initDepthTable() {
  for (let i = 0; i < DEPTH_TABLE_COUNT; i++) {
    const depth: f32 = (DEPTH_TABLE_MIN + i * DEPTH_TABLE_STEP) as f32
    invDepthTable[i] = (1 / depth) as f32
  }
}

function reciprocalDepth(depth: f32): f32 {
  const sample: f32 = ((depth - DEPTH_TABLE_MIN) * DEPTH_TABLE_INV_STEP) as f32
  if (sample <= 0) return invDepthTable[0] as f32
  if (sample >= DEPTH_TABLE_LAST_INDEX) return invDepthTable[DEPTH_TABLE_COUNT - 1] as f32

  const index = Math.floor(sample)
  const a: f32 = invDepthTable[index] as f32
  const b: f32 = invDepthTable[index + 1] as f32
  return (a + (b - a) * (sample - index)) as f32
}

function resetRotation() {
  rotXSin = INITIAL_ROT_X_SIN
  rotXCos = INITIAL_ROT_X_COS
  rotYSin = INITIAL_ROT_Y_SIN
  rotYCos = INITIAL_ROT_Y_COS
}

function sinSmall(value: f32): f32 {
  const x2: f32 = (value * value) as f32
  const x4: f32 = (x2 * x2) as f32
  return (value * (1 - x2 * 0.16666667 + x4 * 0.00833333)) as f32
}

function cosSmall(value: f32): f32 {
  const x2: f32 = (value * value) as f32
  const x4: f32 = (x2 * x2) as f32
  return (1 - x2 * 0.5 + x4 * 0.04166667) as f32
}

function renormalizeRotation() {
  const lenX: f32 = (rotXSin * rotXSin + rotXCos * rotXCos) as f32
  const fixX: f32 = (1.5 - 0.5 * lenX) as f32
  rotXSin = (rotXSin * fixX) as f32
  rotXCos = (rotXCos * fixX) as f32

  const lenY: f32 = (rotYSin * rotYSin + rotYCos * rotYCos) as f32
  const fixY: f32 = (1.5 - 0.5 * lenY) as f32
  rotYSin = (rotYSin * fixY) as f32
  rotYCos = (rotYCos * fixY) as f32
}

function advanceRotation(step: f32) {
  const stepX: f32 = (ROTATE_X_PER_STEP * step) as f32
  const stepY: f32 = (ROTATE_Y_PER_STEP * step) as f32
  const sx: f32 = sinSmall(stepX)
  const cx: f32 = cosSmall(stepX)
  const sy: f32 = sinSmall(stepY)
  const cy: f32 = cosSmall(stepY)

  const nextRotXSin: f32 = (rotXSin * cx + rotXCos * sx) as f32
  const nextRotXCos: f32 = (rotXCos * cx - rotXSin * sx) as f32
  const nextRotYSin: f32 = (rotYSin * cy + rotYCos * sy) as f32
  const nextRotYCos: f32 = (rotYCos * cy - rotYSin * sy) as f32

  rotXSin = nextRotXSin
  rotXCos = nextRotXCos
  rotYSin = nextRotYSin
  rotYCos = nextRotYCos
  renormalizeRotation()
}

function updateFaceNormals(cx: f32, sx: f32, cy: f32, sy: f32) {
  faceNormalX[0] = sy
  faceNormalY[0] = (cy * sx) as f32
  faceNormalZ[0] = (-cy * cx) as f32

  faceNormalX[1] = -sy
  faceNormalY[1] = (-cy * sx) as f32
  faceNormalZ[1] = (cy * cx) as f32

  faceNormalX[2] = -cy
  faceNormalY[2] = (sy * sx) as f32
  faceNormalZ[2] = (-sy * cx) as f32

  faceNormalX[3] = cy
  faceNormalY[3] = (-sy * sx) as f32
  faceNormalZ[3] = (sy * cx) as f32

  faceNormalX[4] = 0
  faceNormalY[4] = -cx
  faceNormalZ[4] = -sx

  faceNormalX[5] = 0
  faceNormalY[5] = cx
  faceNormalZ[5] = sx
}

function projectVertices(cx: f32, sx: f32, cy: f32, sy: f32, jumpOffset: f32) {
  updateFaceNormals(cx, sx, cy, sy)

  for (let i = 0; i < VERTEX_COUNT; i++) {
    const x: f32 = (baseX[i] * CUBE_SCALE) as f32
    const y: f32 = (baseY[i] * CUBE_SCALE) as f32
    const z: f32 = (baseZ[i] * CUBE_SCALE) as f32
    const rx: f32 = (x * cy - z * sy) as f32
    const rz: f32 = (x * sy + z * cy) as f32
    const ry: f32 = (y * cx - rz * sx) as f32
    const rz2: f32 = (y * sx + rz * cx) as f32
    const py: f32 = (ry - jumpOffset) as f32
    const depth: f32 = (rz2 + CAMERA_Z) as f32
    const scale: f32 = (FOCAL_LENGTH * reciprocalDepth(depth)) as f32

    worldX[i] = rx
    worldY[i] = ry
    worldZ[i] = rz2
    screenX[i] = Math.floor(CENTER_X + rx * scale)
    screenY[i] = Math.floor(CENTER_Y + py * scale)
  }
}

function prepareTriangles() {
  for (let i = 0; i < TRIANGLE_COUNT; i++) {
    const a = triA[i]
    const b = triB[i]
    const c = triC[i]
    const face = triFace[i]
    const nx: f32 = faceNormalX[face] as f32
    const ny: f32 = faceNormalY[face] as f32
    const nz: f32 = faceNormalZ[face] as f32

    // Backface cull. The projection is PERSPECTIVE (depth = worldZ + CAMERA_Z,
    // camera at worldZ = -CAMERA_Z looking +Z), so cull against the actual view
    // vector to the face centroid — not the world-normal's Z (an orthographic
    // test). The orthographic `nz >= threshold` test wrongly keeps faces that
    // are perspectively back-facing near the silhouette, and they then paint
    // over the real front faces ("faces show through" for a few frames as the
    // cube turns). viewDot >= 0 means the outward normal points away from the
    // camera → back-facing.
    const centroidX: f32 = ((worldX[a] + worldX[b] + worldX[c]) * INV_3) as f32
    const centroidY: f32 = ((worldY[a] + worldY[b] + worldY[c]) * INV_3) as f32
    const centroidZ: f32 = ((worldZ[a] + worldZ[b] + worldZ[c]) * INV_3) as f32
    const viewDot: f32 = (nx * centroidX + ny * centroidY + nz * (centroidZ + CAMERA_Z)) as f32
    if (viewDot >= 0) {
      triDepth[i] = -999
      triColor[i] = 0
    } else {
      let light: f32 = (nx * LIGHT_X + ny * LIGHT_Y + nz * LIGHT_Z) as f32
      if (light < 0) light = 0
      if (light > 1) light = 1
      triDepth[i] = centroidZ
      triColor[i] = shadedColor(triR[i], triG[i], triBColor[i], light)
    }
    triOrder[i] = i
  }

  for (let i = 1; i < TRIANGLE_COUNT; i++) {
    const current = triOrder[i]
    const depth: f32 = triDepth[current] as f32
    let j = i - 1
    while (j >= 0 && triDepth[triOrder[j]] < depth) {
      triOrder[j + 1] = triOrder[j]
      j--
    }
    triOrder[j + 1] = current
  }
}

function drawDigit(x: number, y: number, digit: number, scale: number) {
  let mask = 0
  if (digit === 0) mask = 63
  else if (digit === 1) mask = 6
  else if (digit === 2) mask = 91
  else if (digit === 3) mask = 79
  else if (digit === 4) mask = 102
  else if (digit === 5) mask = 109
  else if (digit === 6) mask = 125
  else if (digit === 7) mask = 7
  else if (digit === 8) mask = 127
  else if (digit === 9) mask = 111

  const t = scale
  const l = scale * 3
  if (mask & 1) ctx.fillRect(x + t, y, l, t)
  if (mask & 2) ctx.fillRect(x + t * 4, y + t, t, l)
  if (mask & 4) ctx.fillRect(x + t * 4, y + t * 5, t, l)
  if (mask & 8) ctx.fillRect(x + t, y + t * 8, l, t)
  if (mask & 16) ctx.fillRect(x, y + t * 5, t, l)
  if (mask & 32) ctx.fillRect(x, y + t, t, l)
  if (mask & 64) ctx.fillRect(x + t, y + t * 4, l, t)
}

function drawBlockLabel(x: number, y: number, scale: number) {
  const w = scale
  const h = scale * 7
  ctx.fillStyle = 'rgb(128, 154, 174)'
  ctx.fillRect(x, y, w, h)
  ctx.fillRect(x, y, scale * 4, w)
  ctx.fillRect(x, y + scale * 3, scale * 3, w)

  const px = x + scale * 6
  ctx.fillRect(px, y, w, h)
  ctx.fillRect(px, y, scale * 4, w)
  ctx.fillRect(px + scale * 3, y + scale, w, scale * 2)
  ctx.fillRect(px, y + scale * 3, scale * 4, w)

  const sx = x + scale * 12
  ctx.fillRect(sx, y, scale * 4, w)
  ctx.fillRect(sx, y, w, scale * 3)
  ctx.fillRect(sx, y + scale * 3, scale * 4, w)
  ctx.fillRect(sx + scale * 3, y + scale * 3, w, scale * 4)
  ctx.fillRect(sx, y + scale * 6, scale * 4, w)
}

function drawFps(fpsValue: number) {
  let value = fpsValue
  if (value < 0) value = 0
  if (value > 199) value = 199
  value = Math.floor(value)

  const hudScale = 2 * DPR
  const hudPad = 14 * DPR
  const digitAdvance = 14 * DPR
  drawBlockLabel(hudPad, hudPad, hudScale)

  let x = hudPad
  const y = hudPad + 20 * DPR
  const hundreds = Math.floor(value / 100)
  const tens = Math.floor((value - hundreds * 100) / 10)
  const ones = value - hundreds * 100 - tens * 10
  ctx.fillStyle = 'rgb(230, 246, 255)'
  if (hundreds > 0) {
    drawDigit(x, y, hundreds, hudScale)
    x += digitAdvance
  }
  if (hundreds > 0 || tens > 0) {
    drawDigit(x, y, tens, hudScale)
    x += digitAdvance
  }
  drawDigit(x, y, ones, hudScale)
}

function drawCube() {
  prepareTriangles()
  for (let i = 0; i < TRIANGLE_COUNT; i++) {
    const t = triOrder[i]
    const fill = triColor[t]
    if (fill === 0) continue
    const a = triA[t]
    const b = triB[t]
    const c = triC[t]
    ctx.fillTriangleRgb565(screenX[a], screenY[a], screenX[b], screenY[b], screenX[c], screenY[c], fill)
  }
}

function drawScene(currentJumpOffset: f32, fpsValue: number) {
  ctx.beginBatch()
  ctx.clearRect(0, 0, DISPLAY_W, DISPLAY_H)
  ctx.fillStyle = 'rgb(5, 9, 15)'
  ctx.fillRect(0, 0, DISPLAY_W, DISPLAY_H)
  ctx.fillStyle = 'rgb(9, 18, 28)'
  // Floor band, centered vertically on the cube — px values from the
  // reference DPR=1 layout scale up here so the band stays the same
  // physical fraction of the screen on higher-DPR panels.
  const floorTop = CENTER_Y - 130 * DPR
  const floorHeight = 200 * DPR
  ctx.fillRect(0, floorTop, DISPLAY_W, floorHeight)

  const shadowRadius = Math.floor((40 - currentJumpOffset * 16) * DPR)
  const minShadow = Math.floor(18 * DPR)
  ctx.fillCircleRgb565(CENTER_X, CENTER_Y + 132 * DPR, shadowRadius < minShadow ? minShadow : shadowRadius, rgb(12, 20, 24))

  projectVertices(rotXCos, rotXSin, rotYCos, rotYSin, currentJumpOffset)
  drawCube()
  drawFps(fpsValue)
  ctx.endBatch()
}

export function initCanvas3dDemo(): void {
  initGeometry()
  initDepthTable()
  resetRotation()
  jumpOffset = 0
  jumpVelocity = 0
  lastTimestamp = 0
  fpsWindowStart = 0
  fpsFrames = 0
  fps = 0
}

export function configureCanvas3dDisplay(): void {
  Display.setFlushConfig({ rows: 80, depth: 2 })
  Display.setFrameRate(120)
}

export function drawInitialCanvas3dFrame(): void {
  drawScene(jumpOffset, fps)
}

export function renderCanvas3dFrame(timestampMs: number): void {
  if (lastTimestamp === 0) {
    lastTimestamp = timestampMs
    fpsWindowStart = timestampMs
  }
  const dt = timestampMs - lastTimestamp
  lastTimestamp = timestampMs

  let step: f32 = 1
  if (dt > 0 && dt < 80) step = (dt * FRAME_STEP_PER_MS) as f32
  advanceRotation(step)
  if (jumpOffset > 0 || jumpVelocity > 0) {
    jumpOffset = (jumpOffset + jumpVelocity * step) as f32
    jumpVelocity = (jumpVelocity - ROTATE_X_PER_STEP * step) as f32
    if (jumpOffset < 0) {
      jumpOffset = 0
      jumpVelocity = 0
    }
  }

  fpsFrames++
  const elapsed = timestampMs - fpsWindowStart
  if (elapsed >= 500) {
    fps = Math.floor((fpsFrames * 1000) / elapsed)
    fpsFrames = 0
    fpsWindowStart = timestampMs
  }

  drawScene(jumpOffset, fps)
}

export function jumpCanvas3d(): void {
  if (jumpOffset === 0) jumpVelocity = 0.18
  else jumpVelocity += 0.045
}
