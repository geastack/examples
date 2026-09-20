// Vector map renderer: turns decoded MVT tiles into canvas draw calls, live,
// every frame — NO bitmap tiles. Geometry is transformed by the current view
// (tile-local 0..extent → screen pixels) and drawn through the gea canvas 2D
// API, which is a subset of the browser's native 2D context, so the exact same
// module renders on the device (gea canvas) and on the web (native canvas).
//
// Paint order follows the style list; labels draw in a second pass with simple
// box-collision so they don't pile up.

import { STYLE, BACKGROUND, type StyleLayer } from './style'
import { featureStr, GEOM_LINE, GEOM_POLYGON, type VectorTile, type VectorLayer, type VectorFeature } from './mvt'
import type { TilePlacement } from './viewport-math'
// Use the gea canvas context TYPE for the ctx parameter so geatsc lowers the
// fillRect/fill/stroke/fillText calls to native canvas intrinsics on the device
// (a custom interface would lower to a boxed struct and miss the intrinsics).
// The browser's own 2D context satisfies the same calls at runtime; the web
// harness passes it through with a cast.
import type { CanvasRenderingContext2D } from '@geastack/core'

// Module-level canvas handle, set once per frame by renderVector. geatsc lowers
// a passed object PARAMETER as a `const&`, but the canvas intrinsics
// (canvasFillRect/canvasFill/...) need a MUTABLE handle — so the draw helpers
// call methods on this global (the same shape the raster maps app uses) rather
// than receiving ctx as an argument.
let ctx: CanvasRenderingContext2D

// A visible tile paired with its decoded geometry (null while still loading).
export interface PlacedTile {
  p: TilePlacement
  tile: VectorTile | null
}

function matchesClass(sl: StyleLayer, layer: VectorLayer, feat: VectorFeature): boolean {
  if (!sl.classes || sl.classes.length === 0) return true
  const cls = featureStr(layer, feat, sl.filterKey || 'class')
  return sl.classes.indexOf(cls) >= 0
}

// Is a tile's screen rect fully inside the viewport? (No per-feature culling
// needed then — every feature is on-screen, so the cull would be pure overhead.)
function tileFullyInside(p: TilePlacement, w: number, h: number): boolean {
  return p.left >= 0 && p.top >= 0 && p.left + p.w <= w && p.top + p.h <= h
}

// Screen-space bbox test for one feature; used only for edge tiles to skip
// features scrolled off-screen.
function featureOnScreen(f: VectorFeature, p: TilePlacement, sx: number, sy: number, w: number, h: number): boolean {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let i = 0; i < f.x.length; i++) {
    const X = p.left + f.x[i] * sx
    const Y = p.top + f.y[i] * sy
    if (X < minX) minX = X
    if (X > maxX) maxX = X
    if (Y < minY) minY = Y
    if (Y > maxY) maxY = Y
  }
  return !(maxX < 0 || minX > w || maxY < 0 || minY > h)
}

// ── Polygon fill ─────────────────────────────────────────────────────────────
function drawFillLayer(sl: StyleLayer, placed: PlacedTile[], w: number, h: number) {
  ctx.fillStyle = sl.color
  for (let ti = 0; ti < placed.length; ti++) {
    const pt = placed[ti]
    if (!pt.tile) continue
    const layer = findSource(pt.tile, sl.source)
    if (!layer) continue
    const p = pt.p
    const sx = p.w / layer.extent
    const sy = p.h / layer.extent
    const edge = !tileFullyInside(p, w, h)
    for (let fi = 0; fi < layer.features.length; fi++) {
      const f = layer.features[fi]
      if (f.type !== GEOM_POLYGON || !matchesClass(sl, layer, f)) continue
      if (edge && !featureOnScreen(f, p, sx, sy, w, h)) continue
      ctx.beginPath()
      for (let pi = 0; pi < f.parts.length; pi++) {
        const start = f.parts[pi]
        const stop = pi + 1 < f.parts.length ? f.parts[pi + 1] : f.x.length
        ctx.moveTo(p.left + f.x[start] * sx, p.top + f.y[start] * sy)
        for (let k = start + 1; k < stop; k++) ctx.lineTo(p.left + f.x[k] * sx, p.top + f.y[k] * sy)
        ctx.closePath()
      }
      ctx.fill()
    }
  }
}

// ── Line stroke ──────────────────────────────────────────────────────────────
function drawLineLayer(sl: StyleLayer, placed: PlacedTile[], zoom: number, w: number, h: number) {
  ctx.strokeStyle = sl.color
  ctx.lineWidth = sl.width ? sl.width(zoom) : 1
  const minPx = sl.minPx || 0
  for (let ti = 0; ti < placed.length; ti++) {
    const pt = placed[ti]
    if (!pt.tile) continue
    const layer = findSource(pt.tile, sl.source)
    if (!layer) continue
    const p = pt.p
    const sx = p.w / layer.extent
    const sy = p.h / layer.extent
    const edge = !tileFullyInside(p, w, h)
    for (let fi = 0; fi < layer.features.length; fi++) {
      const f = layer.features[fi]
      if ((f.type !== GEOM_LINE && f.type !== GEOM_POLYGON) || !matchesClass(sl, layer, f)) continue
      if (edge && !featureOnScreen(f, p, sx, sy, w, h)) continue
      for (let pi = 0; pi < f.parts.length; pi++) {
        const start = f.parts[pi]
        const stop = pi + 1 < f.parts.length ? f.parts[pi + 1] : f.x.length
        if (stop - start < 2) continue
        // Cheap length cull: skip parts whose bbox is sub-minPx.
        if (minPx > 0 && partSpanPx(f, start, stop, sx, sy) < minPx) continue
        ctx.beginPath()
        ctx.moveTo(p.left + f.x[start] * sx, p.top + f.y[start] * sy)
        for (let k = start + 1; k < stop; k++) ctx.lineTo(p.left + f.x[k] * sx, p.top + f.y[k] * sy)
        ctx.stroke()
      }
    }
  }
}

function partSpanPx(f: VectorFeature, start: number, stop: number, sx: number, sy: number): number {
  let minx = f.x[start]
  let maxx = minx
  let miny = f.y[start]
  let maxy = miny
  for (let k = start + 1; k < stop; k++) {
    const x = f.x[k]
    const y = f.y[k]
    if (x < minx) minx = x
    else if (x > maxx) maxx = x
    if (y < miny) miny = y
    else if (y > maxy) maxy = y
  }
  return Math.max((maxx - minx) * sx, (maxy - miny) * sy)
}

// ── Labels (second pass, collision-aware) ────────────────────────────────────
interface LabelBox {
  x0: number
  y0: number
  x1: number
  y1: number
}

function drawLabelLayer(sl: StyleLayer, placed: PlacedTile[], w: number, h: number, boxes: LabelBox[]) {
  const size = sl.fontSize || 12
  ctx.font = size + 'px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let ti = 0; ti < placed.length; ti++) {
    const pt = placed[ti]
    if (!pt.tile) continue
    const layer = findSource(pt.tile, sl.source)
    if (!layer) continue
    const p = pt.p
    const sx = p.w / layer.extent
    const sy = p.h / layer.extent
    for (let fi = 0; fi < layer.features.length; fi++) {
      const f = layer.features[fi]
      if (!matchesClass(sl, layer, f)) continue
      const text = featureStr(layer, f, sl.textKey || 'name')
      if (!text) continue
      // Anchor: point label → the point; line label → its middle vertex.
      const mid = f.parts.length > 0 ? f.parts[0] + Math.floor((labelEnd(f, 0) - f.parts[0]) / 2) : 0
      const ax = p.left + f.x[mid] * sx
      // POI labels (markerColor set) sit just below their dot; other labels are
      // centered on the anchor.
      const ty = p.top + f.y[mid] * sy + (sl.markerColor ? size : 0)
      if (ax < 0 || ty < 0 || ax > w || ty > h) continue
      const halfW = (text.length * size * 0.3) | 0
      const halfH = (size * 0.6) | 0
      const box: LabelBox = { x0: ax - halfW, y0: ty - halfH, x1: ax + halfW, y1: ty + halfH }
      if (overlapsAny(box, boxes)) continue
      boxes.push(box)
      if (sl.markerColor) {
        ctx.fillStyle = sl.markerColor
        ctx.fillRect(ax - 2, ty - size - 2, 4, 4)
      }
      if (sl.textHalo) {
        ctx.fillStyle = sl.textHalo
        ctx.fillText(text, ax - 1, ty)
        ctx.fillText(text, ax + 1, ty)
        ctx.fillText(text, ax, ty - 1)
        ctx.fillText(text, ax, ty + 1)
      }
      ctx.fillStyle = sl.color
      ctx.fillText(text, ax, ty)
    }
  }
}

function labelEnd(f: VectorFeature, p: number): number {
  return p + 1 < f.parts.length ? f.parts[p + 1] : f.x.length
}

function overlapsAny(b: LabelBox, boxes: LabelBox[]): boolean {
  for (let i = 0; i < boxes.length; i++) {
    const o = boxes[i]
    if (b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0) return true
  }
  return false
}

function findSource(tile: VectorTile, name: string): VectorLayer | null {
  for (let i = 0; i < tile.layers.length; i++) if (tile.layers[i].name === name) return tile.layers[i]
  return null
}

// ── Top-level frame render ───────────────────────────────────────────────────
// Crash-bisect switches: enable passes one at a time on device.
// Hand-flipped debug toggles. Annotated `number` rather than left to literal
// inference: `const DRAW_LINES = 0` has the literal TYPE `0`, so the guard
// `DRAW_LINES === 1` below is a comparison the checker rejects as impossible --
// a type error produced entirely by which value the switch is parked at.
const DRAW_FILLS: number = 1
const DRAW_LINES: number = 0
const DRAW_LABELS: number = 0

export function renderVector(context: CanvasRenderingContext2D, placed: PlacedTile[], zoom: number, w: number, h: number, style: StyleLayer[] = STYLE) {
  ctx = context
  ctx.fillStyle = BACKGROUND
  ctx.fillRect(0, 0, w, h)
  // Geometry pass (fills + lines) in paint order.
  for (let i = 0; i < style.length; i++) {
    const sl = style[i]
    if (zoom < sl.minZoom || zoom >= sl.maxZoom) continue
    if (sl.kind === 'fill' && DRAW_FILLS === 1) drawFillLayer(sl, placed, w, h)
    else if (sl.kind === 'line' && DRAW_LINES === 1) drawLineLayer(sl, placed, zoom, w, h)
  }
  if (DRAW_LABELS === 1) {
    // Label pass, collision-aware, on top.
    const boxes: LabelBox[] = []
    for (let i = 0; i < style.length; i++) {
      const sl = style[i]
      if (sl.kind !== 'symbol' || zoom < sl.minZoom || zoom >= sl.maxZoom) continue
      drawLabelLayer(sl, placed, w, h, boxes)
    }
  }
}
