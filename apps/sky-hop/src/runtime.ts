import { Display, rgb, touch as hostTouch, type CanvasRenderingContext2D, type GeaEmbeddedImage } from '@geastack/core'

export const DISPLAY_WIDTH = Math.max(1, Math.floor(window.innerWidth))
export const DISPLAY_HEIGHT = Math.max(1, Math.floor(window.innerHeight))

export const CONTROL_PANEL_HEIGHT = 112
export const PORTRAIT_STAGE_RATIO = 4 / 3

export function usesTallControlsLayoutFor(width: number, height: number) {
  return height >= Math.floor(width * 1.45) && height > width + CONTROL_PANEL_HEIGHT
}

export function gameViewHeightFor(width: number, height: number) {
  if (!usesTallControlsLayoutFor(width, height)) return height
  const stageHeight = Math.floor(width * PORTRAIT_STAGE_RATIO)
  return Math.max(1, Math.min(height - CONTROL_PANEL_HEIGHT, stageHeight))
}

export const TALL_CONTROLS_LAYOUT = usesTallControlsLayoutFor(DISPLAY_WIDTH, DISPLAY_HEIGHT)
export const GAME_VIEW_HEIGHT = gameViewHeightFor(DISPLAY_WIDTH, DISPLAY_HEIGHT)
export const CONTROLS_PANEL_TOP = TALL_CONTROLS_LAYOUT ? GAME_VIEW_HEIGHT : 0

export type CanvasColor = number


export type TouchSample = {
  touching: boolean
  x: number
  y: number
}

export type GeaTouchRuntime = {
  read(): TouchSample
}

Display.setFrameRate(60)
Display.setFlushConfig({ rows: 80, depth: 2 })

// The engine's own context type, not a structural copy of it. A copy has to be
// laid out as a record, and `drawImage` is overloaded, so there is no single
// field type for it -- which is what refused this app ("no record layout: field
// \"drawImage\" carries unresolved(no primitive joining 2 overload signatures)").
// `Display.ctx` is a host handle; overloads on a handle are resolved per call.
const ctx: CanvasRenderingContext2D = Display.ctx

export function canvas(): CanvasRenderingContext2D {
  return ctx
}

function resetPaintState() {
  ctx.globalAlpha = 1
  ctx.lineWidth = 1
  ctx.textBaseline = 'top'
  ctx.font = '16px monospace'
}

export function configureCanvasRuntime() {
  resetPaintState()
}

// Authoring colours go through the shared gea rgb() helper (0xRRGGBBAA); geatsc
// lowers them to the board's native pixel. No app-side pixel packing.
export const color = rgb

export function clearCanvas() {
  ctx.clear()
  resetPaintState()
}

export function beginFrame() {
  ctx.beginBatch()
}

export function endFrame() {
  ctx.endBatch()
}

export function fillRect(x: number, y: number, w: number, h: number, fill: CanvasColor) {
  ctx.fillStyle = fill
  ctx.fillRect(x, y, w, h)
}

export function strokeRect(x: number, y: number, w: number, h: number, stroke: CanvasColor) {
  ctx.strokeStyle = stroke
  ctx.strokeRect(x, y, w, h)
}

export function fillCircle(x: number, y: number, r: number, fill: CanvasColor) {
  ctx.fillCircle(x, y, r, fill)
}

export function strokeCircle(x: number, y: number, r: number, stroke: CanvasColor) {
  ctx.strokeStyle = stroke
  ctx.strokeCircle(x, y, r)
}

export function fillTriangle(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  fill: CanvasColor
) {
  ctx.fillTriangleRgb565(x0, y0, x1, y1, x2, y2, fill)
}

export function drawText(text: string, x: number, y: number, fill: CanvasColor, scale: number) {
  ctx.fillStyle = fill
  ctx.textBaseline = 'top'
  ctx.font = `${Math.max(1, scale) * 16}px monospace`
  ctx.fillText(text, x, y)
}

export function setAlpha(alpha: number) {
  ctx.globalAlpha = Math.max(0, Math.min(255, alpha)) / 255
}

export function drawImage(source: GeaEmbeddedImage, dx: number, dy: number) {
  ctx.drawImage(source, dx, dy)
}

export function drawImageTiledX(source: GeaEmbeddedImage, dx: number, dy: number, width: number) {
  ctx.drawImageTiledX(source, dx, dy, width)
}

export function drawImageScaled(source: GeaEmbeddedImage, dx: number, dy: number, dw: number, dh: number) {
  ctx.drawImage(source, dx, dy, dw, dh)
}

export const touch: GeaTouchRuntime = {
  read() {
    return hostTouch.read()
  }
}
