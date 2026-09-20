import { Display, rgb } from '@geastack/core'
import type { GeaCanvasElement } from '@geastack/core'

export const DISPLAY_W = Math.max(1, Math.floor(window.innerWidth))
export const DISPLAY_H = Math.max(1, Math.floor(window.innerHeight))

const DPR = Math.max(0.8, Math.min(1.25, Math.min(DISPLAY_W / 410, DISPLAY_H / 502)))
const CENTER_X = DISPLAY_W / 2
const CENTER_Y = DISPLAY_H / 2 + 48 * DPR
const HORIZON_Y = Math.floor(DISPLAY_H * 0.54)
const GRID = 38 * DPR
const CAMERA_Z = 4.85
const FOCAL_LENGTH = 310 * DPR
const CUBE_SIZE = Math.max(77 * DPR, Math.min(DISPLAY_W * 0.19, 130 * DPR))
const FACE_COUNT = 6
const VERTEX_COUNT = 8

type Canvas2DContext = ReturnType<GeaCanvasElement['getContext']>

type CanvasCubeDemo = {
  drawInitialFrame(): void
  renderFrame(timestampMs: number): void
  toggleOpaque(): void
}

export type { CanvasCubeDemo }

declare global {
  function requestAnimationFrame(cb: (timestampMs: number) => void): number
}

let ctx: Canvas2DContext
let lastTimestamp = 0
let fpsWindowStart = 0
let fpsFrames = 0
let fps = 0
let opaque = false

const baseX = new Float64Array(VERTEX_COUNT)
const baseY = new Float64Array(VERTEX_COUNT)
const baseZ = new Float64Array(VERTEX_COUNT)
const worldX = new Float64Array(VERTEX_COUNT)
const worldY = new Float64Array(VERTEX_COUNT)
const worldZ = new Float64Array(VERTEX_COUNT)
const screenX = new Int32Array(VERTEX_COUNT)
const screenY = new Int32Array(VERTEX_COUNT)

const faceA = new Int32Array(FACE_COUNT)
const faceB = new Int32Array(FACE_COUNT)
const faceC = new Int32Array(FACE_COUNT)
const faceD = new Int32Array(FACE_COUNT)
const faceNear = new Uint32Array(FACE_COUNT)
const faceFar = new Uint32Array(FACE_COUNT)
const faceOrder = new Int32Array(FACE_COUNT)
const faceDepth = new Float64Array(FACE_COUNT)
const faceLabel = ['front', 'back', 'right', 'left', 'top', 'base']

function clamp255(value: number): number {
  if (value < 0) return 0
  if (value > 255) return 255
  return Math.floor(value)
}

function mixColor(ar: number, ag: number, ab: number, br: number, bg: number, bb: number, t: number): number {
  return rgb(
    clamp255(ar + (br - ar) * t),
    clamp255(ag + (bg - ag) * t),
    clamp255(ab + (bb - ab) * t)
  )
}

function shade(color: number, amount: number): number {
  const rr = (color >>> 24) & 255
  const gg = (color >>> 16) & 255
  const bb = (color >>> 8) & 255
  return rgb(clamp255(rr * amount), clamp255(gg * amount), clamp255(bb * amount))
}

function dim(color: number, amount: number): number {
  const rr = (color >>> 24) & 255
  const gg = (color >>> 16) & 255
  const bb = (color >>> 8) & 255
  const floor = 8
  return rgb(
    clamp255(floor + rr * amount),
    clamp255(floor + gg * amount),
    clamp255(floor + bb * amount)
  )
}

function setFill(color: number, alpha = 1) {
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
}

function fillRect(x: number, y: number, w: number, h: number, color: number, alpha = 1) {
  setFill(color, alpha)
  ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h))
}

function strokeLine(x0: number, y0: number, x1: number, y1: number, color: number, alpha: number, width: number) {
  const dx = x1 - x0
  const dy = y1 - y0
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len <= 0.001) return
  const half = Math.max(0.5, width * 0.5)
  const ox = (-dy / len) * half
  const oy = (dx / len) * half
  ctx.globalAlpha = 1
  fillQuad(x0 - ox, y0 - oy, x0 + ox, y0 + oy, x1 + ox, y1 + oy, x1 - ox, y1 - oy, dim(color, alpha))
}

function fillQuad(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, color: number) {
  ctx.fillTriangleRgb565(x0, y0, x1, y1, x2, y2, color)
  ctx.fillTriangleRgb565(x0, y0, x2, y2, x3, y3, color)
}

function drawVerticalGradient(y0: number, y1: number, top: number[], bottom: number[]) {
  const steps = Math.max(1, Math.floor((y1 - y0) / (8 * DPR)))
  const band = (y1 - y0) / steps
  for (let i = 0; i < steps; i++) {
    const t = steps <= 1 ? 0 : i / (steps - 1)
    fillRect(0, y0 + i * band, DISPLAY_W, band + 1, mixColor(top[0], top[1], top[2], bottom[0], bottom[1], bottom[2], t))
  }
}

function drawBackdrop() {
  drawVerticalGradient(0, DISPLAY_H, [18, 19, 15], [37, 26, 21])
  drawVerticalGradient(0, HORIZON_Y, [9, 10, 7], [22, 28, 20])

  const wallLine = rgb(140, 232, 196)
  ctx.globalAlpha = 1
  for (let x = 0; x < DISPLAY_W + GRID; x += GRID) fillRect(x, 0, 1, HORIZON_Y, wallLine, 0.11)
  for (let y = HORIZON_Y; y >= -GRID; y -= GRID) fillRect(0, y, DISPLAY_W, 1, wallLine, 0.08)

  const floorTop = rgb(36, 26, 18)
  const floorBottom = rgb(9, 10, 7)
  for (let i = 0; i < 18; i++) {
    const t0 = i / 18
    const t1 = (i + 1) / 18
    const y0 = HORIZON_Y + (DISPLAY_H - HORIZON_Y) * t0
    const y1 = HORIZON_Y + (DISPLAY_H - HORIZON_Y) * t1
    const e0 = DISPLAY_W * 0.5 * Math.pow(t0, 1.55)
    const e1 = DISPLAY_W * 0.5 * Math.pow(t1, 1.55)
    const col = mixColor(36, 26, 18, 9, 10, 7, t0)
    ctx.globalAlpha = 1
    fillQuad(-e0, y0, DISPLAY_W + e0, y0, DISPLAY_W + e1, y1, -e1, y1, col)
  }

  const floorLine = rgb(255, 241, 118)
  const halfSpan = DISPLAY_W * 1.4
  for (let x = -GRID * 3; x <= DISPLAY_W + GRID * 3; x += GRID) {
    const bottomX = CENTER_X + (x - CENTER_X) * 2.8
    strokeLine(x, HORIZON_Y, bottomX, DISPLAY_H + 8 * DPR, floorLine, 0.15, 1)
  }
  for (let i = 0; i < 10; i++) {
    const t = i / 9
    const y = HORIZON_Y + Math.pow(t, 1.55) * (DISPLAY_H - HORIZON_Y)
    const edge = DISPLAY_W * 0.48 * Math.pow(t, 1.55)
    strokeLine(-edge, y, DISPLAY_W + edge, y, floorLine, 0.13, 1)
  }
  for (let i = 0; i < 24; i++) {
    const t = i / 23
    const x = t * DISPLAY_W
    const a = 0.5 * (1 - Math.abs(t - 0.5) * 2)
    fillRect(x, HORIZON_Y - DPR, DISPLAY_W / 23 + 1, 2 * DPR, wallLine, a)
  }
  ctx.globalAlpha = 1
  fillRect(-halfSpan, DISPLAY_H - 2 * DPR, halfSpan * 2, 2 * DPR, rgb(9, 10, 7))
}

function setVertex(i: number, x: number, y: number, z: number) {
  baseX[i] = x
  baseY[i] = y
  baseZ[i] = z
}

function setFace(i: number, a: number, b: number, c: number, d: number, nearColor: number, farColor: number) {
  faceA[i] = a
  faceB[i] = b
  faceC[i] = c
  faceD[i] = d
  faceNear[i] = nearColor
  faceFar[i] = farColor
  faceOrder[i] = i
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

  setFace(0, 4, 5, 6, 7, rgb(255, 241, 118), rgb(255, 128, 97))
  setFace(1, 1, 0, 3, 2, rgb(49, 211, 196), rgb(93, 196, 110))
  setFace(2, 5, 1, 2, 6, rgb(255, 128, 97), rgb(231, 86, 128))
  setFace(3, 0, 4, 7, 3, rgb(140, 232, 196), rgb(255, 241, 118))
  setFace(4, 7, 6, 2, 3, rgb(255, 246, 232), rgb(140, 232, 196))
  setFace(5, 0, 1, 5, 4, rgb(36, 35, 28), rgb(255, 128, 97))
}

function projectVertices(angleX: number, angleY: number, angleZ: number, floatOffset: number) {
  const cy = Math.cos(angleY)
  const sy = Math.sin(angleY)
  const cx = Math.cos(angleX)
  const sx = Math.sin(angleX)
  const cz = Math.cos(angleZ)
  const sz = Math.sin(angleZ)

  for (let i = 0; i < VERTEX_COUNT; i++) {
    const x = baseX[i] * CUBE_SIZE
    const y = baseY[i] * CUBE_SIZE
    const z = baseZ[i] * CUBE_SIZE
    const rx = x * cy - z * sy
    const rz = x * sy + z * cy
    const ry = y * cx - rz * sx
    const rz2 = y * sx + rz * cx
    const rz3 = rz2 / CUBE_SIZE
    const zx = rx * cz - ry * sz
    const zy = rx * sz + ry * cz - floatOffset
    const depth = rz3 + CAMERA_Z
    const scale = FOCAL_LENGTH / (depth * CUBE_SIZE)

    worldX[i] = zx / CUBE_SIZE
    worldY[i] = zy / CUBE_SIZE
    worldZ[i] = rz3
    screenX[i] = Math.floor(CENTER_X + zx * scale)
    screenY[i] = Math.floor(CENTER_Y + zy * scale)
  }
}

function prepareFaces() {
  for (let i = 0; i < FACE_COUNT; i++) {
    const a = faceA[i]
    const b = faceB[i]
    const c = faceC[i]
    const d = faceD[i]
    faceDepth[i] = (worldZ[a] + worldZ[b] + worldZ[c] + worldZ[d]) / 4
    faceOrder[i] = i
  }

  for (let i = 1; i < FACE_COUNT; i++) {
    const current = faceOrder[i]
    const depth = faceDepth[current]
    let j = i - 1
    while (j >= 0 && faceDepth[faceOrder[j]] < depth) {
      faceOrder[j + 1] = faceOrder[j]
      j--
    }
    faceOrder[j + 1] = current
  }
}

function drawFace(index: number) {
  const a = faceA[index]
  const b = faceB[index]
  const c = faceC[index]
  const d = faceD[index]
  const depth = faceDepth[index]
  const brightness = Math.max(0.58, Math.min(1.12, 0.86 + depth * 0.1))
  const near = shade(faceNear[index], brightness)
  const far = shade(faceFar[index], brightness * 0.96)
  ctx.globalAlpha = 1
  ctx.fillTriangleRgb565(screenX[a], screenY[a], screenX[b], screenY[b], screenX[c], screenY[c], near)
  ctx.fillTriangleRgb565(screenX[a], screenY[a], screenX[c], screenY[c], screenX[d], screenY[d], far)

  const edge = rgb(255, 246, 232)
  strokeLine(screenX[a], screenY[a], screenX[b], screenY[b], edge, 0.42, 1)
  strokeLine(screenX[b], screenY[b], screenX[c], screenY[c], edge, 0.42, 1)
  strokeLine(screenX[c], screenY[c], screenX[d], screenY[d], edge, 0.42, 1)
  strokeLine(screenX[d], screenY[d], screenX[a], screenY[a], edge, 0.42, 1)

  const labelX = Math.floor((screenX[a] + screenX[b] + screenX[c] + screenX[d]) / 4)
  const labelY = Math.floor((screenY[a] + screenY[b] + screenY[c] + screenY[d]) / 4 + 11 * DPR)
  ctx.globalAlpha = opaque ? 0.72 : 0.64
  ctx.fillStyle = rgb(18, 19, 15)
  ctx.textAlign = 'center'
  ctx.font = `${Math.floor(28 * DPR)}px Bebas Neue`
  ctx.fillText(faceLabel[index].toUpperCase(), labelX, labelY)
}

function drawCube(timestampMs: number) {
  const t = timestampMs / 10000
  const phase = (t % 1) * 2 * Math.PI
  const stageFloat = Math.sin(timestampMs / 5800 * Math.PI) * 10 * DPR
  const angleX = -0.314 + Math.sin(phase * 0.9) * 0.64 + phase * 0.44
  const angleY = 0.42 + phase * 1.02
  const angleZ = Math.sin(phase) * 0.045

  projectVertices(angleX, angleY, angleZ, 38 * DPR + stageFloat)
  prepareFaces()

  for (let i = 0; i < FACE_COUNT; i++) drawFace(faceOrder[i])
  ctx.globalAlpha = 1
}

function drawTitle() {
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.globalAlpha = 1
  ctx.fillStyle = rgb(140, 232, 196)
  ctx.font = `${Math.floor(14 * DPR)}px Cossette Texte`
  ctx.fillText('CSS MOTION STUDY', CENTER_X, 42 * DPR)

  ctx.fillStyle = rgb(255, 246, 232)
  ctx.font = `${Math.floor(64 * DPR)}px Bebas Neue`
  ctx.fillText('3D CUBE', CENTER_X, 114 * DPR)
}

function drawFps() {
  ctx.globalAlpha = 1
  ctx.textAlign = 'center'
  ctx.fillStyle = rgb(140, 232, 196)
  ctx.font = `${Math.floor(18 * DPR)}px Bebas Neue`
  ctx.fillText(`FPS ${fps > 0 ? Math.floor(fps) : '--'}`, CENTER_X, DISPLAY_H - 34 * DPR)
}

function drawScene(timestampMs: number) {
  ctx.beginBatch()
  ctx.clearRect(0, 0, DISPLAY_W, DISPLAY_H)
  drawBackdrop()
  drawTitle()
  drawCube(timestampMs)
  drawFps()
  ctx.globalAlpha = 1
  ctx.endBatch()
}

export function createCanvasCubeDemo(canvas: GeaCanvasElement): CanvasCubeDemo {
  ctx = canvas.getContext('2d')
  initGeometry()
  lastTimestamp = 0
  fpsWindowStart = 0
  fpsFrames = 0
  fps = 0
  opaque = false

  return {
    drawInitialFrame(): void {
      drawScene(0)
    },
    renderFrame(timestampMs: number): void {
      if (lastTimestamp === 0) {
        lastTimestamp = timestampMs
        fpsWindowStart = timestampMs
      }
      lastTimestamp = timestampMs
      fpsFrames++
      const elapsed = timestampMs - fpsWindowStart
      if (elapsed >= 500) {
        fps = Math.round((fpsFrames * 1000) / elapsed)
        fpsFrames = 0
        fpsWindowStart = timestampMs
      }
      drawScene(timestampMs)
    },
    toggleOpaque(): void {
      opaque = !opaque
    },
  }
}
