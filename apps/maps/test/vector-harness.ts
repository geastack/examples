// Standalone browser harness for the vector render pipeline. Imports ONLY the
// pure, gea-free modules (mvt / style / vector-renderer / viewport-math) and
// draws to a real <canvas> — so it verifies decoding + styling + rendering
// without the gea runtime or the app entry. Pan with drag, zoom with wheel.
import { panned, zoomedAt, type ViewState } from '../src/viewport-math'
import { decodeMvt, type VectorTile } from '../src/mvt'
import { renderVector, type PlacedTile } from '../src/vector-renderer'
import { OFM_TILEJSON, VECTOR_TILE_TEMPLATE_FALLBACK, MAX_DATA_ZOOM, fillTemplate, visibleVectorTiles } from '../src/vector-source'

const W = 900
const H = 640
const canvas = document.getElementById('map') as HTMLCanvasElement
const hud = document.getElementById('hud') as HTMLDivElement
canvas.width = W
canvas.height = H
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

let view: ViewState = { lat: 52.52, lon: 13.405, zoom: 13 }
const cacheKeys: string[] = []
const cacheTiles: VectorTile[] = []
let template = VECTOR_TILE_TEMPLATE_FALLBACK
let dirty = true

async function resolveSource() {
  try {
    const j = await (await fetch(OFM_TILEJSON)).json()
    if (j && j.tiles && j.tiles[0]) template = j.tiles[0]
  } catch {}
}

function tileZoomFor(v: ViewState): number {
  const zi = Math.round(v.zoom)
  return zi > MAX_DATA_ZOOM ? MAX_DATA_ZOOM : zi
}

async function loadVisible() {
  const grid = visibleVectorTiles(view, W, H, MAX_DATA_ZOOM)
  await Promise.all(
    grid.map(async t => {
      const k = `${t.z}/${t.x}/${t.y}`
      if (cacheKeys.includes(k)) return
      try {
        const r = await fetch(fillTemplate(template, t.z, t.x, t.y))
        if (!r.ok) return
        const tile = decodeMvt(new Uint8Array(await r.arrayBuffer()))
        cacheKeys.push(k)
        cacheTiles.push(tile)
        dirty = true
      } catch {}
    })
  )
}

function draw() {
  const grid = visibleVectorTiles(view, W, H, MAX_DATA_ZOOM)
  const placed: PlacedTile[] = grid.map(t => {
    const i = cacheKeys.indexOf(`${t.z}/${t.x}/${t.y}`)
    return { p: t, tile: i >= 0 ? cacheTiles[i] : null }
  })
  const t0 = performance.now()
  renderVector(ctx as any, placed, view.zoom, W, H)
  const dt = performance.now() - t0
  const loaded = grid.filter(t => cacheKeys.includes(`${t.z}/${t.x}/${t.y}`)).length
  hud.textContent = `z=${view.zoom.toFixed(2)} lat=${view.lat.toFixed(4)} lon=${view.lon.toFixed(4)} | tiles ${loaded}/${grid.length} | render ${dt.toFixed(1)}ms`
}

// rAF render loop (cheap: only redraws when dirty).
function tick() {
  if (dirty) {
    dirty = false
    draw()
  }
  requestAnimationFrame(tick)
}

// ── interaction ──────────────────────────────────────────────────────────────
let dragging = false
let lx = 0
let ly = 0
canvas.addEventListener('pointerdown', e => {
  dragging = true
  lx = e.clientX
  ly = e.clientY
  canvas.setPointerCapture(e.pointerId)
})
canvas.addEventListener('pointermove', e => {
  if (!dragging) return
  view = panned(view, e.clientX - lx, e.clientY - ly)
  lx = e.clientX
  ly = e.clientY
  dirty = true
})
const endDrag = () => {
  dragging = false
}
canvas.addEventListener('pointerup', endDrag)
canvas.addEventListener('pointercancel', endDrag)
canvas.addEventListener('wheel', e => {
  e.preventDefault()
  const r = canvas.getBoundingClientRect()
  view = zoomedAt(view, e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 0.5 : -0.5, W, H, 2, 19)
  dirty = true
  void loadVisible()
})

// Expose for the preview/screenshot driver.
;(window as any).__map = {
  setView(lat: number, lon: number, zoom: number) {
    view = { lat, lon, zoom }
    dirty = true
    return loadVisible()
  },
  ready: false
}

;(async () => {
  await resolveSource()
  await loadVisible()
  // a couple of settle passes for late tiles
  await loadVisible()
  draw()
  ;(window as any).__map.ready = true
  document.title = 'vector ready'
})()

tick()
