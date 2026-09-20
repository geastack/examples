import { ReactiveComponent, Store, mount, imageFromId, wifi, Geolocation } from '@geastack/core'
import type { Element, GeaCanvasElement, GeaEmbeddedImage } from '@geastack/core'
import {
  ATTRIBUTION,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  MIN_ZOOM,
  MAX_ZOOM,
  TILE_LEVELS,
  TILE_LEVELS_CSV,
  nearestTileLevel,
  tileLevelBelow,
  tileLevelAbove,
  tileUrl
} from './constants'
import { panned, zoomedAt, visibleTiles, latLonToScreen, type ViewState } from './src/viewport-math'
import './styles/device-fonts.css'

declare global {
  function requestAnimationFrame(cb: (timestampMs: number) => void): number
}

declare const Display: {
  setOrientation(orientation: string): void
  setSupportedOrientations(orientations: string): void
  setBrightness(brightness: number): void
}
Display.setSupportedOrientations('landscape')
Display.setOrientation('landscape-primary')
Display.setBrightness(50)

declare const tiles: {
  request(key: string, num: number, path: string, url: string, opaque: boolean, rotate90?: boolean): void
  setNetworkAllowed(allowed: boolean): void
  purgeQueued(): void
  pruneLevels(keepCsv: string): void
  poll(): boolean
  key(): string
  keyNum(): number
  imageId(): number
  status(): number
}

const RAIL_W = 0
const SCREEN_W = Math.max(1, Math.floor(window.innerWidth))
const H = Math.max(1, Math.floor(window.innerHeight))
// Map viewport: x in [MAP_X, SCREEN_W), width W.
const MAP_X = RAIL_W
const W = Math.max(1, SCREEN_W - RAIL_W)
console.log('[maps] dims ' + SCREEN_W + 'x' + H)

// Saved places shown in the rail (tap to fly there). Static defaults for the
// device build; the web build's Nominatim search can append to this model.
const PLACE_NAMES = ['Berlin', 'Paris', 'London', 'New York', 'Tokyo', 'Istanbul']
const PLACE_LATS = [52.52, 48.8566, 51.5074, 40.7128, 35.6762, 41.0082]
const PLACE_LONS = [13.405, 2.3522, -0.1278, -74.006, 139.6503, 28.9784]
const PLACE_ZOOM = 13

type Canvas2DContext = ReturnType<GeaCanvasElement['getContext']>

// ── Render state ───────────────────────────────────────────────────────────
let ctx: Canvas2DContext
// View as three primitive doubles (not a shared record) so every function reads
// the same file-scope globals with no boxing.
let viewLat = DEFAULT_CENTER.lat
let viewLon = DEFAULT_CENTER.lon
let viewZoom = DEFAULT_ZOOM

// Tile cache as parallel typed arrays rather than a Map/Set (a Map boxes its
// keys/values to gea_cpp_value). cacheImgs holds native GeaEmbeddedImage
// handles into the fixed image-store pool.
const cacheNum: number[] = []
const cacheImgs: GeaEmbeddedImage[] = []
const failedNum: number[] = []
// When each failure was recorded: failures EXPIRE (5s) so a transient cause —
// image-store slot pressure, a flaky 5xx — retries instead of leaving a
// permanently gray gap tile.
const failedAtMs: number[] = []
let wifiLogged = false
let frame = 0
let needsRender = 0
// Last moment a finger moved/landed. Remote tile loading is allowed only once
// the view has SETTLED (no finger down + 250ms quiet) — while panning or
// pinching, tiles come from RAM/SD only. Basic map UX: never let downloads
// compete with a live gesture.
let lastGestureMs = 0
let networkAllowed = 1
let lastRequestMs = 0
let lastZoomLabel = -1
let railPointer = 0
let gpsApplied = 0
let lastGpsProbeMs = 0

// Decoded tiles kept resident in PSRAM. The round S3 board has only 8MB PSRAM:
// 84 RGB565 map tiles alone can exceed 11MB before framebuffer/TLS/WiFi. Keep
// roughly one visible screen plus parent fallbacks on small displays and rely
// on the SD tile cache for pan-back; larger boards keep the old deeper cache.
const SMALL_TILE_BUDGET = SCREEN_W <= 520 && H <= 520 ? 1 : 0
const MAX_TILES = SMALL_TILE_BUDGET === 1 ? 18 : 84
const TILE_PREFETCH_PAD = SMALL_TILE_BUDGET === 1 ? 128 : 512
const TILE_PROTECT_PAD = SMALL_TILE_BUDGET === 1 ? 0 : TILE_PREFETCH_PAD

// Persistent on-SD tile cache: /sdcard/tiles/<z>/<x>/<y>.png. Survives reboots,
// so a tile is downloaded over the network at most once, ever.
function tilePath(z: number, x: number, y: number): string {
  return '/sdcard/tiles/' + z + '/' + x + '/' + y + '.png'
}

function indexOfKey(keys: string[], key: string): number {
  for (let i = 0; i < keys.length; i++) {
    const candidate = keys[i]
    if (candidate === key) return i
  }
  return -1
}

function markRetryLater(nk: number) {
  const existing = indexOfNum(failedNum, nk)
  const now = Date.now()
  if (existing >= 0) failedAtMs[existing] = now
  else {
    failedNum.push(nk)
    failedAtMs.push(now)
  }
}

function currentView(): ViewState {
  return { lat: viewLat, lon: viewLon, zoom: viewZoom }
}

function applyViewValues(lat: number, lonValue: number, zoom: number) {
  // Hard validation: an out-of-range (or NaN — fails every comparison) view
  // must NEVER land. In C++, fmax(0, round(NaN)) is 0, so one poisoned value
  // renders tile 0/0/0 — the "zoom suddenly resets to the whole world" bug.
  // Every reject is an upstream defect; log it so the source is identifiable
  // from the serial console.
  const zoomOk = zoom >= MIN_ZOOM && zoom <= MAX_ZOOM ? 1 : 0
  const latOk = lat >= -86 && lat <= 86 ? 1 : 0
  const lonOk = lonValue >= -540 && lonValue <= 540 ? 1 : 0
  if (zoomOk === 0 || latOk === 0 || lonOk === 0) {
    console.log('[maps] REJECTED view zoom=' + zoom + ' lat=' + lat + ' lon=' + lonValue)
    return
  }
  viewLat = lat
  // Wrap longitude across the antimeridian so panning around the world keeps
  // the value bounded.
  let lon = lonValue
  if (lon > 180) lon = lon - 360
  if (lon < -180) lon = lon + 360
  viewLon = lon
  viewZoom = zoom
}

function applyView(v: ViewState) {
  applyViewValues(v.lat, v.lon, v.zoom)
}

function applyGpsFixIfAvailable(): number {
  const position = Geolocation.currentPosition()
  if (!position.hasFix) return 0
  const lat = position.coords.latitude
  const lon = position.coords.longitude
  const latOk = lat >= -86 && lat <= 86 ? 1 : 0
  const lonOk = lon >= -180 && lon <= 180 ? 1 : 0
  if (latOk === 0 || lonOk === 0) return 0
  applyViewValues(lat, lon, 15)
  rail.setZoom(viewZoom)
  invalidate()
  requestVisibleTiles()
  console.log('[maps] gps fix lat=' + lat + ' lon=' + lon + ' acc=' + position.coords.accuracy)
  return 1
}

// Packed numeric tile key: exact in a double up to z19 (max ~2^43 < 2^53).
// The hot per-frame cache lookups scan plain numbers — std::string keys cost
// 6-14ms per render on this MCU (one heap alloc per keyOf + string compares).
function numKey(z: number, x: number, y: number): number {
  return (z * 524288 + x) * 524288 + y
}

// Out-of-line image accessor: a direct `cacheImgs[idx]` inside the render
// loops inlines a large defensive bounds-check/cast expansion at every site,
// blowing the loop body past the instruction cache (measured ~180us per
// drawImage iteration from code refetch). One shared helper keeps it hot.
function imgAt(idx: number): GeaEmbeddedImage {
  return cacheImgs[idx]
}

function drawTileImage(img: GeaEmbeddedImage, x: number, y: number, w: number, h: number) {
  ctx.drawImage(img, x, y, w, h)
}

function indexOfNum(arr: number[], v: number): number {
  for (let i = 0; i < arr.length; i++) {
    // Hoist to a double local: comparing the element access directly routes
    // through the boxed strict-equals (the access's storage is conservatively
    // dynamic), costing ~2ms per 84-entry scan in the hot render loops.
    const candidate = arr[i]
    if (candidate === v) return i
  }
  return -1
}

function keyOf(z: number, x: number, y: number): string {
  return z + '/' + x + '/' + y
}

// Composite the visible grid from whatever is cached. Synchronous, so the
// framebuffer updates instantly. So the map never blanks while exact-zoom tiles
// load (e.g. right after a pinch), a coarse fallback layer is drawn first.
let renderProbeA = 0
let renderProbeB = 0
let renderProbeC = 0

function render() {
  if (!ctx) return
  const probe0 = Date.now()
  const grid = visibleTiles(currentView(), W, H, nearestTileLevel(viewZoom))
  ctx.beginBatch()
  // The full-screen opaque fill is REQUIRED as the first command: the display's
  // present fast path only engages for frames with an opaque base
  // (frameHasOpaqueBase), and it rasters commands per dirty region — so this
  // fill costs only the region actually repainted, while qualifying the whole
  // frame for command-diff dirty tracking + the fast region rasterizer.
  // Removing it forces the slow full-canvas replay+flush path (~2x slower).
  ctx.fillStyle = 'rgb(228,230,221)'
  // FULL-SCREEN base (not just the map area): the display's fast present
  // requires an opaque full-frame first command; the rail and tiles overpaint.
  ctx.fillRect(0, 0, SCREEN_W, H)

  const drawnAncestors: number[] = []
  for (const t of grid) {
    if (indexOfNum(cacheNum, numKey(t.z, t.x, t.y)) >= 0) continue

    // Nearest cached ancestor: k levels up, scaled 2^k to cover its block.
    let span = 2
    for (let k = 1; k <= 5 && t.z - k >= 0; k++) {
      const ax = Math.floor(t.x / span)
      const ay = Math.floor(t.y / span)
      const ak = numKey(t.z - k, ax, ay)
      const aidx = indexOfNum(cacheNum, ak)
      if (aidx >= 0) {
        if (indexOfNum(drawnAncestors, ak) < 0) {
          drawTileImage(
            imgAt(aidx),
            MAP_X + t.left - (t.x % span) * t.w,
            t.top - (t.y % span) * t.h,
            t.w * span,
            t.h * span
          )
          drawnAncestors.push(ak)
        }
        break
      }
      span = span * 2
    }

    // Children from the ladder level ABOVE (z+1 tiles no longer exist on the
    // sparse ladder), each scaled into its sub-cell — sharper than any
    // ancestor, so they draw after (on top of) it. Gap <= 2 keeps this at most
    // 16 lookups per missing tile; the typical use is covering a zoom-out
    // with the street tiles already cached.
    const cz = tileLevelAbove(t.z)
    if (cz > t.z && cz - t.z <= 2) {
      const span = 2 ** (cz - t.z)
      for (let cy = 0; cy < span; cy++) {
        for (let cx = 0; cx < span; cx++) {
          const cidx = indexOfNum(cacheNum, numKey(cz, t.x * span + cx, t.y * span + cy))
          if (cidx >= 0)
            drawTileImage(
              imgAt(cidx),
              MAP_X + t.left + (cx * t.w) / span,
              t.top + (cy * t.h) / span,
              t.w / span,
              t.h / span
            )
        }
      }
    }
  }

  renderProbeA = Date.now() - probe0

  // Exact-level tiles on top, scaled to the fractional zoom.
  for (const t of grid) {
    const idx = indexOfNum(cacheNum, numKey(t.z, t.x, t.y))
    if (idx >= 0) drawTileImage(imgAt(idx), MAP_X + t.left, t.top, t.w, t.h)
  }
  renderProbeB = Date.now() - probe0

  drawPins()
  // drawRail()
  ctx.endBatch()
  renderProbeC = Date.now() - probe0
}

// Saved-place pins, prototype style: red dot + white name label above it.
function drawPins() {
  ctx.font = '10px Inter'
  for (let i = 0; i < PLACE_NAMES.length; i++) {
    const pos = latLonToScreen(currentView(), PLACE_LATS[i], PLACE_LONS[i], W, H)
    if (pos.x < -10 || pos.x > W + 10 || pos.y < -10 || pos.y > H + 10) continue
    const px = MAP_X + pos.x
    ctx.fillStyle = 'rgb(232,72,44)'
    ctx.fillRect(px - 2, pos.y - 10, 4, 10)
    ctx.fillRect(px - 5, pos.y - 16, 10, 8)
    const label = PLACE_NAMES[i]
    const lw = label.length * 6 + 10
    ctx.fillStyle = 'rgb(245,246,248)'
    ctx.fillRect(px - lw / 2, pos.y - 34, lw, 16)
    ctx.fillStyle = 'rgb(34,34,34)'
    ctx.fillText(label, px - lw / 2 + 5, pos.y - 32)
  }
}

// ── The rail (left, prototype palette: #15171d bg, #e6e9ef text) ───────────
const RAIL_PAD = 12
const RAIL_SEARCH_Y = 44
const RAIL_LIST_Y = 118
const RAIL_ITEM_H = 38
const RAIL_ZOOM_H = 44

function drawRail() {
  ctx.fillStyle = 'rgb(21,23,29)'
  ctx.fillRect(0, 0, RAIL_W, H)
  ctx.fillStyle = 'rgb(230,233,239)'
  ctx.font = '16px Inter'
  ctx.fillText('Maps', RAIL_PAD + 2, 18)

  // Search pill (white, like the prototype).
  ctx.fillStyle = 'rgb(255,255,255)'
  ctx.fillRect(RAIL_PAD, RAIL_SEARCH_Y, RAIL_W - RAIL_PAD * 2, 32)
  ctx.font = '13px Inter'
  if (searchQuery.length > 0) {
    ctx.fillStyle = 'rgb(34,34,34)'
    ctx.fillText(searchQuery, RAIL_PAD + 10, RAIL_SEARCH_Y + 9)
  } else {
    ctx.fillStyle = 'rgb(119,119,119)'
    ctx.fillText(searchActive === 1 ? 'type below...' : 'Search a place...', RAIL_PAD + 10, RAIL_SEARCH_Y + 9)
  }

  if (searchActive === 1) {
    drawResults()
    return
  }

  ctx.fillStyle = 'rgb(125,130,144)'
  ctx.font = '10px Inter'
  ctx.fillText('S A V E D   P L A C E S', RAIL_PAD + 2, RAIL_LIST_Y - 20)
  for (let i = 0; i < PLACE_NAMES.length; i++) {
    const y = RAIL_LIST_Y + i * RAIL_ITEM_H
    ctx.fillStyle = 'rgb(36,39,48)'
    ctx.fillRect(RAIL_PAD, y, RAIL_W - RAIL_PAD * 2, RAIL_ITEM_H - 6)
    ctx.fillStyle = 'rgb(230,233,239)'
    ctx.font = '12px Inter'
    ctx.fillText(PLACE_NAMES[i], RAIL_PAD + 10, y + 9)
  }

  // Zoom row pinned near the rail foot.
  const zy = H - 92
  ctx.fillStyle = 'rgb(40,44,54)'
  ctx.fillRect(RAIL_PAD, zy, 52, RAIL_ZOOM_H)
  ctx.fillRect(RAIL_W - RAIL_PAD - 52, zy, 52, RAIL_ZOOM_H)
  ctx.fillStyle = 'rgb(207,211,219)'
  ctx.font = '22px Inter'
  ctx.fillText('-', RAIL_PAD + 22, zy + 11)
  ctx.fillText('+', RAIL_W - RAIL_PAD - 33, zy + 11)
  ctx.font = '13px Inter'
  ctx.fillStyle = 'rgb(174,182,194)'
  ctx.fillText('z' + Math.round(viewZoom), RAIL_W / 2 - 12, zy + 15)

  ctx.fillStyle = 'rgb(107,112,128)'
  ctx.font = '10px Inter'
  ctx.fillText('(c) OpenStreetMap contributors', RAIL_PAD, H - 26)
}

// ── Search (Nominatim) with the on-screen keyboard ─────────────────────────
let searchActive = 0
let searchQuery = ''
let searchGeneration = 0
const resultNames: string[] = []
const resultLats: number[] = []
const resultLons: number[] = []

const RESULTS_Y = 96

function drawResults() {
  ctx.font = '12px Inter'
  for (let i = 0; i < resultNames.length && i < 6; i++) {
    const y = RESULTS_Y + i * 36
    ctx.fillStyle = 'rgb(36,39,48)'
    ctx.fillRect(RAIL_PAD, y, RAIL_W - RAIL_PAD * 2, 30)
    ctx.fillStyle = 'rgb(230,233,239)'
    ctx.fillText(resultNames[i], RAIL_PAD + 8, y + 8)
  }
}

async function runSearch() {
  const q = searchQuery
  if (q.length === 0) return
  searchGeneration++
  const generation = searchGeneration
  try {
    const res = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=6&q=' + encodeURIComponent(q))
    const text = await res.text()
    if (generation !== searchGeneration) return
    parseResults(text)
    invalidate()
  } catch {
    // network failure: keep the previous results
  }
}

// Minimal field scrape of the Nominatim JSON array (display_name/lat/lon).
function parseResults(text: string) {
  resultNames.length = 0
  resultLats.length = 0
  resultLons.length = 0
  let from = 0
  while (resultNames.length < 6) {
    const latIdx = text.indexOf('"lat":"', from)
    if (latIdx < 0) break
    const latEnd = text.indexOf('"', latIdx + 7)
    const lonIdx = text.indexOf('"lon":"', latEnd)
    const lonEnd = text.indexOf('"', lonIdx + 7)
    const nameIdx = text.indexOf('"display_name":"', lonEnd)
    const nameEnd = text.indexOf('"', nameIdx + 16)
    if (latEnd < 0 || lonIdx < 0 || lonEnd < 0 || nameIdx < 0 || nameEnd < 0) break
    const lat = Number(text.substring(latIdx + 7, latEnd))
    const lon = Number(text.substring(lonIdx + 7, lonEnd))
    let name = text.substring(nameIdx + 16, nameEnd)
    const comma = name.indexOf(',')
    if (comma > 0) {
      const second = name.indexOf(',', comma + 1)
      name = second > 0 ? name.substring(0, second) : name
    }
    if (name.length > 26) name = name.substring(0, 26)
    resultNames.push(name)
    resultLats.push(lat)
    resultLons.push(lon)
    from = nameEnd
  }
}

// Tap routing for the rail (x < RAIL_W). Returns 1 when consumed.
function railHit(x: number, y: number): number {
  if (x >= RAIL_W) return 0
  if (y >= RAIL_SEARCH_Y && y < RAIL_SEARCH_Y + 32) {
    searchActive = searchActive === 1 ? 0 : 1
    if (searchInput) {
      if (searchActive === 1) searchInput.focus()
      else {
        searchInput.blur()
        searchInput.setAttribute('value', '')
        searchQuery = ''
        resultNames.length = 0
      }
    }
    invalidate()
    return 1
  }
  if (searchActive === 1) {
    const idx = Math.floor((y - RESULTS_Y) / 36)
    if (idx >= 0 && idx < resultNames.length) {
      applyViewValues(resultLats[idx], resultLons[idx], 15)
      searchActive = 0
      if (searchInput) searchInput.blur()
      invalidate()
      requestVisibleTiles()
      return 1
    }
    return 1
  }
  const li = Math.floor((y - RAIL_LIST_Y) / RAIL_ITEM_H)
  if (li >= 0 && li < PLACE_NAMES.length && y >= RAIL_LIST_Y) {
    rail.goTo(li)
    return 1
  }
  const zy = H - 92
  if (y >= zy && y < zy + RAIL_ZOOM_H) {
    if (x < RAIL_PAD + 60) rail.zoomOut()
    else if (x > RAIL_W - RAIL_PAD - 60) rail.zoomIn()
    return 1
  }
  return 1
}

// Dispose off-screen tiles (freeing their image-store slots) until the cache is
// back under MAX_TILES, never evicting a currently-visible tile. Insertion order
// approximates least-recently-added.
function evictToCap(visibleNum: number[]) {
  let i = 0
  while (cacheNum.length > MAX_TILES && i < cacheNum.length) {
    if (indexOfNum(visibleNum, cacheNum[i]) >= 0) {
      i++
      continue
    }
    cacheImgs[i].dispose()
    cacheNum.splice(i, 1)
    cacheImgs.splice(i, 1)
  }
}

function protectedTileNums(): number[] {
  const grid = visibleTiles(currentView(), W + TILE_PROTECT_PAD, H + TILE_PROTECT_PAD, nearestTileLevel(viewZoom))
  const visibleNum: number[] = []
  for (const t of grid) {
    visibleNum.push(numKey(t.z, t.x, t.y))
    // Protect the ladder parent too, so render()'s scaled-ancestor fallback
    // keeps its best source during a zoom-in.
    if (t.z > TILE_LEVELS[0]) {
      const pz = tileLevelBelow(t.z)
      const shift = 2 ** (t.z - pz)
      visibleNum.push(numKey(pz, Math.floor(t.x / shift), Math.floor(t.y / shift)))
    }
  }
  return visibleNum
}

// Non-blocking loader, async edition: queue every missing visible tile on the
// second-core worker (request() dedups in-flight keys, so calling this every
// few frames is cheap), evicting far-off-screen tiles first. Completed decodes
// arrive via drainCompletedTiles() — the frame task never touches SD, network,
// or the PNG decoder.
function requestVisibleTiles() {
  // Padded viewport: request (and protect from eviction) one extra tile ring
  // beyond the visible edge, so panning exposes ALREADY-LOADED tiles instead
  // of gray gaps that fill at network speed. ~12-20 extra tiles, well inside
  // the cache cap; mid-gesture the workers are cache-only, so the ring
  // prefetches from SD instantly and from the network once settled.
  const grid = visibleTiles(currentView(), W + TILE_PREFETCH_PAD, H + TILE_PREFETCH_PAD, nearestTileLevel(viewZoom))
  const visibleNum = protectedTileNums()
  evictToCap(visibleNum)
  // Drop whatever older zoom levels / panned-away areas are still queued —
  // only the CURRENT view's tiles deserve worker time.
  tiles.purgeQueued()
  // Request center-out: the tile under the user's focus loads first. Simple
  // O(n^2) selection over ~30 tiles per pass.
  const cx = W / 2
  const cy = H / 2
  const wanted: number[] = []
  const wantedDist: number[] = []
  let gi = -1
  for (const t of grid) {
    gi++
    const nk = numKey(t.z, t.x, t.y)
    if (indexOfNum(cacheNum, nk) >= 0) continue
    const fidx = indexOfNum(failedNum, nk)
    if (fidx >= 0) {
      if (Date.now() - failedAtMs[fidx] < 5000) continue
      // Failure expired — forget it and re-request below.
      failedNum.splice(fidx, 1)
      failedAtMs.splice(fidx, 1)
    }
    const dx = t.left + t.w / 2 - cx
    const dy = t.top + t.h / 2 - cy
    wanted.push(gi)
    wantedDist.push(dx * dx + dy * dy)
  }
  while (wanted.length > 0) {
    let best = 0
    for (let j = 1; j < wanted.length; j++) {
      if (wantedDist[j] < wantedDist[best]) best = j
    }
    const t = grid[wanted[best]]
    tiles.request(
      keyOf(t.z, t.x, t.y),
      numKey(t.z, t.x, t.y),
      tilePath(t.z, t.x, t.y),
      tileUrl(t.z, t.x, t.y),
      true,
      true
    )
    wanted.splice(best, 1)
    wantedDist.splice(best, 1)
  }
}

// Collect tiles the worker finished since last frame. status 0 means a
// transport/WiFi failure — retryable, so it isn't marked failed and the next
// requestVisibleTiles() pass re-queues it; a real HTTP error (404/...) is
// permanent for the tile.
function drainCompletedTiles() {
  let accepted = 0
  while (tiles.poll()) {
    const nk = tiles.keyNum()
    const id = tiles.imageId()
    if (id >= 0) {
      const img = imageFromId(id)
      if (img.width > 0) {
        cacheNum.push(nk)
        cacheImgs.push(img)
        needsRender = 1
        accepted++
      } else {
        img.dispose()
      }
    } else if (tiles.status() === -2 || tiles.status() === 200) {
      // Decode/image-store admission failed (usually PSRAM pressure), not a
      // bad tile. Back off briefly so eviction and allocator coalescing can
      // happen instead of hammering the same URL in a tight loop.
      console.log('[maps] tile ' + tiles.key() + ' decode retry')
      markRetryLater(nk)
    } else if (tiles.status() !== 0) {
      console.log('[maps] tile ' + tiles.key() + ' http ' + tiles.status())
      failedNum.push(nk)
      failedAtMs.push(Date.now())
    }
  }
  if (accepted > 0) evictToCap(protectedTileNums())
}

// Mark the view dirty; the rAF tick re-composites at most once per frame.
// Gesture move events (especially the second finger's, which aren't coalesced
// by the runtime) can arrive faster than the display refreshes — a synchronous
// render per event would waste full-screen scaled blits.
function invalidate() {
  needsRender = 1
}

// ── Gesture input (typed Store, all-primitive finger state) ────────────────
// Up to two contacts tracked in slots 0/1. Each is an id + last position, all
// plain doubles. The runtime delivers the primary pointer as id 1 and the first
// extra finger as id 2 (web convention, matched by the device touch runtime).
let pCount = 0
let s0id = -1
let s0x = 0
let s0y = 0
let s1id = -1
let s1x = 0
let s1y = 0
let lastX = 0
let lastY = 0
// Continuous pinch state: the previous frame's finger midpoint + distance.
// Each move applies the INCREMENTAL pan (midpoint delta) and zoom
// (log2 of the distance ratio) about the current midpoint — Apple/Google-maps
// style combined two-finger pan + continuous fractional zoom.
let lastMidX = 0
let lastMidY = 0
let lastPinchDist = 0
// When each finger was last heard from. A ghost finger (its Up event lost —
// typical when a spreading pinch slides a finger off the panel edge) freezes
// its slot and turns the OTHER finger's motion into a continuous zoom-out
// against the stale anchor — the "zoom resets to the world" bug. Zoom steps
// are therefore only applied when BOTH fingers reported recently.
let s0SeenMs = 0
let s1SeenMs = 0
// Tap bookkeeping: a lift only counts as a tap when the WHOLE gesture was one
// finger and barely moved. A pinch end or a pan flick must not arm/trigger the
// double-tap zoom (that was the other "zoom jumps by itself" path).
let gestureHadSecondFinger = 0
let gestureMoved = 0
let downX = 0
let downY = 0
let lastTapMs = 0

// 1/ln(2): zoom delta = ln(distNow/distPrev) * INV_LN2 = log2 of the ratio.
const INV_LN2 = 1.4426950408889634

function pinchDist(): number {
  return Math.hypot(s0x - s1x, s0y - s1y)
}

// Free functions because Store method bodies lower through the native
// store-method path, which resolves free-function calls but not the `Math`
// namespace directly.
//
// The per-event zoom delta is CLAMPED: two real fingers can't change their
// distance ratio much between ~10ms touch samples, so a huge log2 means bad
// input (a finger teleport / ghost), not a huge pinch. The clamp keeps one bad
// event from launching the zoom level somewhere stupid.
function zoomDelta(ratio: number): number {
  const dz = Math.log(ratio) * INV_LN2
  return Math.max(-0.3, Math.min(0.3, dz))
}

function nextIntegerZoom(z: number): number {
  // Double-tap targets the next LADDER level, so a tap-tap always lands on a
  // level with native tiles.
  return tileLevelAbove(nearestTileLevel(z))
}

function movedFar(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by) > 16 ? 1 : 0
}

export class MapInput extends Store {
  down(id: number, x: number, y: number) {
    console.log('[maps] down ' + x + ',' + y)
    if (x < RAIL_W) {
      railPointer = 1
      return
    }
    // Map-local coordinates from here on (the map starts at MAP_X).
    x = x - MAP_X
    lastGestureMs = Date.now()
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
    if (railPointer === 1) return
    x = x - MAP_X
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
    lastGestureMs = Date.now()
    if (gestureMoved === 0 && movedFar(x, y, downX, downY) === 1) gestureMoved = 1
    if (pCount === 1) {
      applyView(panned(currentView(), x - lastX, y - lastY))
      lastX = x
      lastY = y
      invalidate()
    } else if (pCount === 2) {
      const now = Date.now()
      // Ghost-finger guard: if the OTHER finger has been silent for 300ms while
      // this one streams moves, its Up was lost (typical when a spreading pinch
      // slides a finger off the panel edge) — demote to a pan instead of
      // zooming against a frozen anchor.
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
      // Continuous combined pan + zoom: pan by the midpoint's movement, then
      // zoom about the current midpoint by the distance ratio since the last
      // event. The geographic point between the fingers stays pinned under
      // them, and the zoom is fractional — render() scales tiles to match.
      const midX = (s0x + s1x) / 2
      const midY = (s0y + s1y) / 2
      const dist = pinchDist()
      // Zoom only on trustworthy geometry: BOTH fingers fresh (≤120ms — a
      // staler anchor means lost events) and far enough apart that controller
      // jitter/merging can't fake a big ratio. Otherwise re-base silently.
      const trustworthy = now - otherSeenMs <= 120 && dist > 30 && lastPinchDist > 30 ? 1 : 0
      if (trustworthy === 1) {
        const dz = zoomDelta(dist / lastPinchDist)
        applyView(
          zoomedAt(panned(currentView(), midX - lastMidX, midY - lastMidY), midX, midY, dz, W, H, MIN_ZOOM, MAX_ZOOM)
        )
        invalidate()
      }
      lastMidX = midX
      lastMidY = midY
      lastPinchDist = dist
    }
  }

  up(id: number, x: number, y: number) {
    console.log('[maps] up ' + x + ',' + y + ' rail=' + railPointer)
    if (railPointer === 1) {
      railPointer = 0
      const consumed = railHit(x, y)
      console.log('[maps] railHit consumed=' + consumed + ' search=' + searchActive)
      return
    }
    x = x - MAP_X
    if (id === s0id) {
      // Primary slot lifted: promote slot 1 into slot 0 if it exists.
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
      // Only a true tap (single finger, no drag) participates in double-tap
      // zoom. A pinch end or a pan must neither trigger NOR arm it.
      if (gestureHadSecondFinger === 1 || gestureMoved === 1) {
        lastTapMs = 0
        return
      }
      const now = Date.now()
      if (now - lastTapMs < 300) {
        // Double-tap: snap to the NEXT integer zoom level (the view zoom is
        // fractional after a pinch), anchored at the tap point.
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

// Rail state: the zoom readout re-renders reactively as the view changes.
export class RailState extends Store {
  zoomLabel = 'z13'

  setZoom(z: number) {
    this.zoomLabel = 'z' + Math.round(z)
  }

  zoomIn() {
    applyView(
      zoomedAt(
        currentView(),
        W / 2,
        H / 2,
        tileLevelAbove(nearestTileLevel(viewZoom)) - viewZoom,
        W,
        H,
        MIN_ZOOM,
        MAX_ZOOM
      )
    )
    rail.setZoom(viewZoom)
    invalidate()
  }

  zoomOut() {
    applyView(
      zoomedAt(
        currentView(),
        W / 2,
        H / 2,
        tileLevelBelow(nearestTileLevel(viewZoom)) - viewZoom,
        W,
        H,
        MIN_ZOOM,
        MAX_ZOOM
      )
    )
    rail.setZoom(viewZoom)
    invalidate()
  }

  goTo(index: number) {
    applyViewValues(PLACE_LATS[index], PLACE_LONS[index], PLACE_ZOOM)
    rail.setZoom(viewZoom)
    invalidate()
  }
}

export const rail = new RailState()

// The rail's zoom label re-renders via needsRender when the level changes.

// The system search input: a hidden real <input> node under document.body.
// Focusing it summons the runtime VirtualKeyboard (the wide system keyboard,
// tree-rendered over the canvas); its typed value lives in the node's
// "value" attribute, polled each tick.
// `document` and the node it creates are the framework's own -- `Document` and
// `Element` in `@geastack/core`'s declarations, reached through the ambient
// `document` the framework declares. The local `declare const document` this
// replaced gave the name an anonymous object type with `any` members, which is
// a second, weaker authority for a host object that already has one: every
// call through it lowered dynamically, and `document` itself read as a host
// class used as a value rather than as the host singleton it is.
let searchInput: Element | null = null
let lastSearchedQuery = ''
let queryStableSinceMs = 0

class MapApp extends ReactiveComponent<GeaCanvasElement> {
  started = false
  // Bound by the template's ref: the canvas is no longer the component root
  // (the rail is its sibling), so this.el is the outer flex container.

  template() {
    return (
      <canvas
        width={SCREEN_W}
        height={H}
        style={{ width: SCREEN_W, height: H }}
        onPointerDown={e => mapInput.down(e.pointerId, e.clientX, e.clientY)}
        onPointerMove={e => mapInput.move(e.pointerId, e.clientX, e.clientY)}
        onPointerUp={e => mapInput.up(e.pointerId, e.clientX, e.clientY)}
      />
    )
  }

  onAfterRender() {
    // Guard on the ref, not this.el: the multi-node compiled template's
    // GEA_ELEMENT bookkeeping doesn't populate on device yet, but the ref
    // binds — and the canvas is all the init needs.
    if (this.started || !this.el) return
    this.started = true
    // WiFi is opt-in on these boards (not brought up at boot, to reclaim its
    // internal DMA RAM). Kick off the async bring-up with the build-time
    // credentials (wifi_config.h); tiles needing the network simply retry until
    // the radio associates.
    wifi.setEnabled(true)
    // One-time SD maintenance: drop tile levels outside the fetch ladder
    // (runs on the worker core before the census, never blocks frames).
    tiles.pruneLevels(TILE_LEVELS_CSV)
    // Component<GeaCanvasElement> types this.el statically, so getContext and
    // every ctx call lower to NATIVE C++ context methods (one shared instance
    // with batch state) — the boxed-value dispatch converted per call and
    // silently dropped the present batching (~110ms surface draws per frame).
    ctx = this.el.getContext('2d')
    gpsApplied = applyGpsFixIfAvailable()
    if (gpsApplied === 0) console.log('[maps] waiting for gps fix')
    searchInput = document.createElement('input')
    searchInput.setAttribute('type', 'text')
    searchInput.setAttribute('style', 'display:none')
    document.body.appendChild(searchInput)
    invalidate()
    const tick = (_timestampMs: number) => {
      frame++
      // Pull in whatever the second-core worker finished since last frame.
      drainCompletedTiles()
      // Coalesced re-composite: render once per frame when a gesture (or a
      // freshly decoded tile) marked the view dirty.
      if (needsRender === 1) {
        needsRender = 0
        const t0 = Date.now()
        render()
        const dt = Date.now() - t0
        if (dt > 20) {
          console.log(
            '[maps] render ' +
              dt +
              'ms fallback=' +
              renderProbeA +
              ' exact=' +
              (renderProbeB - renderProbeA) +
              ' flush=' +
              (renderProbeC - renderProbeB)
          )
        }
      }
      const zl = Math.round(viewZoom)
      if (zl !== lastZoomLabel) {
        lastZoomLabel = zl
        invalidate()
      }
      if (searchActive === 1 && searchInput) {
        const raw = searchInput.getAttribute('value')
        const typed = raw ? String(raw) : ''
        if (typed !== searchQuery) {
          searchQuery = typed
          queryStableSinceMs = Date.now()
          invalidate()
        } else if (
          searchQuery.length > 2 &&
          searchQuery !== lastSearchedQuery &&
          Date.now() - queryStableSinceMs > 800
        ) {
          lastSearchedQuery = searchQuery
          runSearch()
        }
      }
      if (gpsApplied === 0 && Date.now() - lastGpsProbeMs > 2000) {
        lastGpsProbeMs = Date.now()
        gpsApplied = applyGpsFixIfAvailable()
      }
      if (pCount > 0 && Date.now() - lastGestureMs > 1500) {
        console.log('[maps] stale pointer reset pCount=' + pCount)
        pCount = 0
        s0id = -1
        s1id = -1
        lastPinchDist = 0
        railPointer = 0
      }
      // Remote loading only when the view has settled (no finger + 250ms
      // quiet). Mid-gesture, the workers stay cache-only: RAM/SD tiles stream
      // in while panning, downloads wait for the hands to stop.
      const settled = pCount === 0 && Date.now() - lastGestureMs > 250 ? 1 : 0
      const canLoadRemoteTiles = settled === 1 && wifi.connected() ? 1 : 0
      if (canLoadRemoteTiles !== networkAllowed) {
        networkAllowed = canLoadRemoteTiles
        tiles.setNetworkAllowed(canLoadRemoteTiles === 1)
        console.log(
          '[maps] remote tiles ' + canLoadRemoteTiles + ' settled=' + settled + ' wifi=' + (wifi.connected() ? 1 : 0)
        )
      }
      // Queue missing visible tiles TIME-based, not frame-based: at 16fps
      // gesture rate, "every 15 frames" meant newly exposed tiles waited up
      // to a second before even being REQUESTED. request() is instant (the
      // worker does the I/O on the other core), so this runs even mid-gesture.
      if (Date.now() - lastRequestMs > 150) {
        lastRequestMs = Date.now()
        requestVisibleTiles()
      }
      if (!wifiLogged && frame % 60 === 0 && wifi.connected()) {
        console.log('[maps] wifi connected ssid=' + wifi.ssid() + ' ip=' + wifi.ip() + ' rssi=' + wifi.rssi())
        wifiLogged = true
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }
}

mount(MapApp)
