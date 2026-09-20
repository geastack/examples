// Offline harness: renders the vector map straight out of a single .pmtiles
// archive (loaded once into memory, then random-access tile reads) — exactly
// the device's offline path (SD file → byte-range read → inflate → decode →
// draw), no per-tile HTTP. Drag to pan, wheel to zoom.
import { panned, zoomedAt, type ViewState } from '../src/viewport-math'
import { decodeMvt, type VectorTile } from '../src/mvt'
import { renderVector, type PlacedTile } from '../src/vector-renderer'
import { MAX_DATA_ZOOM, visibleVectorTiles } from '../src/vector-source'
import { PMTiles } from '../src/pmtiles'

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
let pm: PMTiles | null = null
let dirty = true

const failed: string[] = []
// Decode at most a couple of fresh tiles per call so panning into new area
// never stalls a frame on synchronous inflate + decode; the rest stream in
// over subsequent frames.
function loadVisible() {
  if (!pm) return
  const grid = visibleVectorTiles(view, W, H, MAX_DATA_ZOOM)
  // Tiles are uncompressed in the archive, so decode is cheap — a full screen
  // can fill in a frame or two without a stall.
  let budget = 6
  for (const t of grid) {
    if (budget <= 0) break
    const k = `${t.z}/${t.x}/${t.y}`
    if (cacheKeys.includes(k) || failed.includes(k)) continue
    const bytes = pm.getTile(t.z, t.x, t.y)
    if (!bytes) {
      failed.push(k) // not in this archive's region — don't retry every frame
      continue
    }
    cacheKeys.push(k)
    cacheTiles.push(decodeMvt(bytes))
    dirty = true
    budget--
  }
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
  hud.textContent = `PMTILES | z=${view.zoom.toFixed(2)} | tiles ${loaded}/${grid.length} | render ${dt.toFixed(1)}ms`
}

function tick() {
  // Stream tiles every frame (budgeted, cheap when nothing new); redraw only
  // when the view moved or a fresh tile arrived.
  loadVisible()
  if (dirty) {
    dirty = false
    draw()
  }
  requestAnimationFrame(tick)
}

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
})

;(window as any).__map = {
  setView(lat: number, lon: number, zoom: number) {
    view = { lat, lon, zoom }
    dirty = true
  },
  // Manual pump for measurement (the preview tab pauses rAF when unfocused).
  pump(n: number) {
    for (let i = 0; i < n; i++) {
      loadVisible()
      draw()
    }
  },
  ready: false
}

;(async () => {
  const buf = await (await fetch('/test/fixtures/berlin.pmtiles')).arrayBuffer()
  pm = new PMTiles(new Uint8Array(buf))
  loadVisible()
  draw()
  ;(window as any).__map.ready = true
  document.title = 'pmtiles ready'
})()

tick()
