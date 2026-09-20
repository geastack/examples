// Vector map entry (web + device): a <canvas> that draws OpenStreetMap vector
// tiles (MVT, OpenMapTiles schema) LIVE every frame — no bitmap tiles. Geometry
// is fetched as MVT, decoded to native typed arrays (src/mvt.ts), and drawn
// through the gea canvas 2D API by src/vector-renderer.ts under the current view
// transform. The gea canvas API is a subset of the browser's, so the same code
// renders on the device and in the web dev server (dev-web.mjs).
//
// This is a SEPARATE entry from the raster index.device.tsx; switch the app's
// gea.entry to "index.vector.tsx" to run it. On device the live `fetch` source
// is replaced by the offline PMTiles-on-SD reader (host vector service) — same
// renderer, different byte source.
//
// Pan/pinch state is module-level primitive bindings and the gesture methods
// live on a typed `Store`, mirroring the raster app — only the tile pipeline
// (image cache + blit) is replaced by (geometry cache + vector draw).
import { Component, Store, mount, wifi } from '@geastack/core'
import type { GeaCanvasElement } from '@geastack/core'
import { DEFAULT_CENTER, DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM } from './constants'
import { panned, zoomedAt, type ViewState } from './src/viewport-math'
import { openSdArchive, decodeSdTile, fetchTile, pmMinZoom, pmMaxZoom, type VectorTile } from './src/mvt'
import { renderVector, type PlacedTile } from './src/vector-renderer'
import { MAX_DATA_ZOOM, fillTemplate, visibleVectorTiles } from './src/vector-source'

// Offline region archive on the microSD card (opened by byte range). If absent,
// the app downloads MVT tiles over WiFi (plain HTTP) from a tile server on the
// local network — the P4 cannot do TLS to public CDNs, so HTTP to a LAN host
// instead. Point gea-dev.local at your own machine, or edit the URL below.
const PMTILES_PATH = '/sdcard/maps.pmtiles'
const LOCAL_TILE_URL = 'http://gea-dev.local:8080/{z}/{x}/{y}.pbf'

declare global {
  function requestAnimationFrame(cb: (timestampMs: number) => void): number
}

const W = Math.max(1, Math.floor(window.innerWidth))
const H = Math.max(1, Math.floor(window.innerHeight))

type Canvas2DContext = ReturnType<GeaCanvasElement['getContext']>

// ── Render state ───────────────────────────────────────────────────────────
let ctx: Canvas2DContext
let viewLat = DEFAULT_CENTER.lat
let viewLon = DEFAULT_CENTER.lon
let viewZoom = DEFAULT_ZOOM
let needsRender = 0
let frame = 0

// Decoded-tile cache as parallel arrays (a Map would box to gea_cpp_value).
const cacheKeys: string[] = []
const cacheTiles: VectorTile[] = []
const failedKeys: string[] = []
// Cap the decoded-tile cache tightly: each tile is double[] geometry arrays in
// PSRAM, and WiFi (esp_hosted) already takes a big PSRAM bite, so a large cache
// OOMs. ~the visible set at z13 portrait.
const MAX_TILES = 16
let loggedTile0 = 0

// Offline mode: set once the SD archive parses; tiles come from decodeSdTile().
// When 0, we download tiles over WiFi instead (fetchTile).
let offline = 0
let wifiTried = 0

function keyOf(z: number, x: number, y: number): string {
  return z + '/' + x + '/' + y
}

function indexOfKey(keys: string[], key: string): number {
  for (let i = 0; i < keys.length; i++) {
    if (keys[i] === key) return i
  }
  return -1
}

function currentView(): ViewState {
  return { lat: viewLat, lon: viewLon, zoom: viewZoom }
}

function applyView(v: ViewState) {
  viewLat = v.lat
  viewLon = v.lon
  viewZoom = v.zoom
}

function evictToCap(visibleKeys: string[]) {
  let i = 0
  while (cacheKeys.length > MAX_TILES && i < cacheKeys.length) {
    if (indexOfKey(visibleKeys, cacheKeys[i]) >= 0) {
      i++
      continue
    }
    cacheKeys.splice(i, 1)
    cacheTiles.splice(i, 1)
  }
}

// Try to open the on-SD PMTiles archive (offline mode). No-op on web / when
// absent — readCacheFile returns an empty array and we stay on the HTTP path.
function openOfflineSource() {
  // Prefer the .pmtiles flashed into the ota_1 partition over USB (reliable
  // esptool path); fall back to one pushed onto the SD card. The loaders keep
  // the archive bytes in a module global — nothing is passed as a Uint8Array.
  // Open the .pmtiles on the SD card (reads only its header + directory; tiles
  // are read on demand by byte range, never the whole file).
  if (openSdArchive(PMTILES_PATH) === 1) {
    offline = 1
    console.log('[maps] offline from sd z=' + pmMinZoom + '..' + pmMaxZoom)
    return
  }
  console.log('[maps] no offline source -> wifi fallback')
}

function requestVisibleTiles() {
  const grid = visibleVectorTiles(currentView(), W, H, MAX_DATA_ZOOM)
  const visibleKeys: string[] = []
  for (let i = 0; i < grid.length; i++) visibleKeys.push(keyOf(grid[i].z, grid[i].x, grid[i].y))
  evictToCap(visibleKeys)
  if (offline === 1) {
    // Decode a bounded number of fresh tiles per pass so a sweep of new tiles
    // never stalls a single frame. decodeArchiveTile reads + decodes straight
    // from the archive global and returns a native VectorTile (no Uint8Array
    // crosses a parameter).
    let budget = 4
    for (let i = 0; i < grid.length && budget > 0; i++) {
      const t = grid[i]
      const k = keyOf(t.z, t.x, t.y)
      if (indexOfKey(cacheKeys, k) >= 0 || indexOfKey(failedKeys, k) >= 0) continue
      const tile = decodeSdTile(t.z, t.x, t.y)
      if (tile.layers.length > 0) {
        if (loggedTile0 === 0) {
          loggedTile0 = 1
          const l0 = tile.layers[0]
          console.log('[maps] tile0 ' + t.z + '/' + t.x + '/' + t.y + ' layers=' + tile.layers.length + ' first=' + l0.name + '(' + l0.features.length + 'f,ext' + l0.extent + ')')
        }
        cacheKeys.push(k)
        cacheTiles.push(tile)
        needsRender = 1
      } else {
        failedKeys.push(k) // absent in this archive (or empty) — don't retry
      }
      budget--
    }
    return
  }
  // WiFi: download MVT tiles over PLAIN HTTP from the dev-Mac tile server
  // (scripts/serve-pmtiles-http.mjs). HTTP, not HTTPS, because the P4 can't
  // complete TLS to public CDNs (HW-ECDSA unsupported on this chip rev).
  // fetchTile blocks the frame task and returns empty until WiFi associates, so
  // this is a no-op early on and fills in over a few seconds once connected.
  let budget = 2
  for (let i = 0; i < grid.length && budget > 0; i++) {
    const t = grid[i]
    const k = keyOf(t.z, t.x, t.y)
    if (indexOfKey(cacheKeys, k) >= 0) continue
    const tile = fetchTile(fillTemplate(LOCAL_TILE_URL, t.z, t.x, t.y))
    if (tile.layers.length > 0) {
      cacheKeys.push(k)
      cacheTiles.push(tile)
      needsRender = 1
      budget-- // only spend budget on a real download; empty (WiFi not up yet) retries next pass
      console.log('[maps] cached ' + k + ' layers=' + tile.layers.length + ' total=' + cacheKeys.length)
    } else {
      console.log('[maps] empty ' + k)
    }
  }
}

function render() {
  if (!ctx) return
  const grid = visibleVectorTiles(currentView(), W, H, MAX_DATA_ZOOM)
  const placed: PlacedTile[] = []
  for (let i = 0; i < grid.length; i++) {
    const t = grid[i]
    const idx = indexOfKey(cacheKeys, keyOf(t.z, t.x, t.y))
    placed.push({ p: t, tile: idx >= 0 ? cacheTiles[idx] : null })
  }
  // Direct (unbatched) drawing: rasterize into the canvas surface once per
  // change; the tree blits the cached pixels every frame. A present batch here
  // would record ~100K 1-px span commands per city tile and replay them EVERY
  // frame — multi-second frames and memory exhaustion (the wedge-reboot loop).
  if (RENDER_ENABLED === 1) renderVector(ctx, placed, viewZoom, W, H)
}

// Bisect switch: 0 = fetch+decode only (crash isolation), 1 = full render.
const RENDER_ENABLED = 1

function invalidate() {
  needsRender = 1
}

// ── Gesture input (typed Store, all-primitive finger state) ────────────────
let pCount = 0
let s0id = -1
let s0x = 0
let s0y = 0
let s1id = -1
let s1x = 0
let s1y = 0
let lastX = 0
let lastY = 0
let lastMidX = 0
let lastMidY = 0
let lastPinchDist = 0
let s0SeenMs = 0
let s1SeenMs = 0
let gestureHadSecondFinger = 0
let gestureMoved = 0
let downX = 0
let downY = 0
let lastTapMs = 0

const INV_LN2 = 1.4426950408889634

function pinchDist(): number {
  return Math.hypot(s0x - s1x, s0y - s1y)
}

function zoomDelta(ratio: number): number {
  const dz = Math.log(ratio) * INV_LN2
  return Math.max(-0.3, Math.min(0.3, dz))
}

function nextIntegerZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.floor(z) + 1)
}

function movedFar(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by) > 16 ? 1 : 0
}

export class MapInput extends Store {
  down(id: number, x: number, y: number) {
    if (pCount === 0) {
      s0id = id
      s0x = x
      s0y = y
      pCount = 1
      lastX = x
      lastY = y
      downX = x
      downY = y
      s0SeenMs = Date.now()
      gestureHadSecondFinger = 0
      gestureMoved = 0
    } else if (pCount === 1 && id !== s0id) {
      s1id = id
      s1x = x
      s1y = y
      pCount = 2
      lastMidX = (s0x + s1x) / 2
      lastMidY = (s0y + s1y) / 2
      lastPinchDist = pinchDist()
      s1SeenMs = Date.now()
      gestureHadSecondFinger = 1
    }
  }

  move(id: number, x: number, y: number) {
    if (pCount >= 1 && id === s0id) {
      s0x = x
      s0y = y
      s0SeenMs = Date.now()
    } else if (pCount >= 2 && id === s1id) {
      s1x = x
      s1y = y
      s1SeenMs = Date.now()
    } else {
      return
    }
    if (gestureMoved === 0 && movedFar(x, y, downX, downY) === 1) gestureMoved = 1
    if (pCount === 1) {
      applyView(panned(currentView(), x - lastX, y - lastY))
      lastX = x
      lastY = y
      invalidate()
    } else if (pCount === 2) {
      const now = Date.now()
      const otherSeenMs = id === s0id ? s1SeenMs : s0SeenMs
      if (now - otherSeenMs > 300) {
        pCount = 1
        s0id = id
        s0x = x
        s0y = y
        lastPinchDist = 0
        lastX = x
        lastY = y
        return
      }
      const midX = (s0x + s1x) / 2
      const midY = (s0y + s1y) / 2
      const dist = pinchDist()
      const trustworthy = now - otherSeenMs <= 120 && dist > 30 && lastPinchDist > 30 ? 1 : 0
      if (trustworthy === 1) {
        const dz = zoomDelta(dist / lastPinchDist)
        applyView(zoomedAt(panned(currentView(), midX - lastMidX, midY - lastMidY), midX, midY, dz, W, H, MIN_ZOOM, MAX_ZOOM))
        invalidate()
      }
      lastMidX = midX
      lastMidY = midY
      lastPinchDist = dist
    }
  }

  up(id: number, x: number, y: number) {
    if (id === s0id) {
      if (pCount === 2) {
        s0id = s1id
        s0x = s1x
        s0y = s1y
        pCount = 1
        lastX = s0x
        lastY = s0y
        lastPinchDist = 0
      } else {
        pCount = 0
      }
    } else if (id === s1id) {
      pCount = 1
      lastX = s0x
      lastY = s0y
      lastPinchDist = 0
    }
    if (pCount === 0) {
      if (gestureHadSecondFinger === 1 || gestureMoved === 1) {
        lastTapMs = 0
        return
      }
      const now = Date.now()
      if (now - lastTapMs < 300) {
        const target = nextIntegerZoom(viewZoom)
        applyView(zoomedAt(currentView(), x, y, target - viewZoom, W, H, MIN_ZOOM, MAX_ZOOM))
        lastTapMs = 0
        invalidate()
      } else {
        lastTapMs = now
      }
    }
  }
}

export const mapInput = new MapInput()

class MapApp extends Component<GeaCanvasElement> {
  started = false

  template() {
    return (
      <canvas
        width={W}
        height={H}
        style={{ width: W, height: H }}
        onPointerDown={e => mapInput.down(e.pointerId, e.clientX, e.clientY)}
        onPointerMove={e => mapInput.move(e.pointerId, e.clientX, e.clientY)}
        onPointerUp={e => mapInput.up(e.pointerId, e.clientX, e.clientY)}
      />
    )
  }

  onAfterRender() {
    if (this.started || !this.el) return
    this.started = true
    ctx = this.el.getContext('2d')
    // Prefer the SD archive; otherwise download tiles over WiFi.
    openOfflineSource()
    if (offline === 0 && wifiTried === 0) {
      wifiTried = 1
      wifi.setEnabled(true)
      console.log('[maps] no SD archive -> WiFi tile download')
    }
    invalidate()
    const tick = (_timestampMs: number) => {
      frame++
      if (needsRender === 1) {
        needsRender = 0
        render()
      }
      // Stream tiles every frame — the call is cheap when nothing new is
      // visible, and the per-pass decode budget bounds the work, so a fresh
      // screen fills in a few frames instead of seconds.
      requestVisibleTiles()
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }
}

mount(MapApp)
