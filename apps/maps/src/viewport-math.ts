import { TILE_SIZE } from '../constants'
import { lonToWorldX, latToWorldY, worldXToLon, worldYToLat, clampLat } from './mercator'

export interface ViewState {
  lat: number
  lon: number
  zoom: number
}

export interface TilePlacement {
  z: number
  x: number
  y: number
  left: number
  top: number
  // On-screen size of this tile. Exactly 256 at an integer view zoom; at a
  // fractional zoom the nearest integer level's tiles draw scaled by
  // 2^(zoom - z), so w/h carry the (edge-rounded) scaled size for drawImage.
  w: number
  h: number
}

// Screen pixel → geographic coordinate, given the viewport size.
export function screenToLatLon(s: ViewState, sx: number, sy: number, w: number, h: number): { lat: number; lon: number } {
  const centerX = lonToWorldX(s.lon, s.zoom)
  const centerY = latToWorldY(s.lat, s.zoom)
  const worldX = centerX + (sx - w / 2)
  const worldY = centerY + (sy - h / 2)
  return { lat: worldYToLat(worldY, s.zoom), lon: worldXToLon(worldX, s.zoom) }
}

// Geographic coordinate → screen pixel (inverse of screenToLatLon).
export function latLonToScreen(s: ViewState, lat: number, lon: number, w: number, h: number): { x: number; y: number } {
  const centerX = lonToWorldX(s.lon, s.zoom)
  const centerY = latToWorldY(s.lat, s.zoom)
  return {
    x: lonToWorldX(lon, s.zoom) - centerX + w / 2,
    y: latToWorldY(lat, s.zoom) - centerY + h / 2
  }
}

// Drag the map content by a screen-pixel delta. Dragging content right (dx>0)
// shifts the center west, so subtract the delta from the center's world position.
export function panned(s: ViewState, dx: number, dy: number): ViewState {
  const centerX = lonToWorldX(s.lon, s.zoom)
  const centerY = latToWorldY(s.lat, s.zoom)
  return {
    lat: clampLat(worldYToLat(centerY - dy, s.zoom)),
    lon: worldXToLon(centerX - dx, s.zoom),
    zoom: s.zoom
  }
}

// Zoom by `dz` about a focal screen point, keeping that point geographically fixed.
export function zoomedAt(
  s: ViewState,
  focalX: number,
  focalY: number,
  dz: number,
  w: number,
  h: number,
  minZoom: number,
  maxZoom: number
): ViewState {
  const nextZoom = Math.max(minZoom, Math.min(maxZoom, s.zoom + dz))
  // Plain `s`, not `{ ...s }`: callers treat ViewState as immutable, and the
  // spread once hit a codegen bug that returned an all-zero record (zoom 0 =
  // whole-world view) every time a pinch ran into the zoom clamp.
  if (nextZoom === s.zoom) return s
  const focal = screenToLatLon(s, focalX, focalY, w, h)
  const focalWorldX = lonToWorldX(focal.lon, nextZoom)
  const focalWorldY = latToWorldY(focal.lat, nextZoom)
  const centerX = focalWorldX - (focalX - w / 2)
  const centerY = focalWorldY - (focalY - h / 2)
  return {
    lat: clampLat(worldYToLat(centerY, nextZoom)),
    lon: worldXToLon(centerX, nextZoom),
    zoom: nextZoom
  }
}

// Every tile that intersects the viewport, with its top-left pixel offset and
// on-screen size. The view zoom is CONTINUOUS (pinch produces fractional
// zooms); tiles only exist at integer levels, so a source level `zi` is
// picked and each tile draws scaled by 2^(zoom - zi). The caller may pass an
// explicit `tileLevel` (e.g. the nearest level of a sparse fetch ladder);
// without one, the nearest integer is used (Leaflet-style rounding keeps the
// scale within [0.71, 1.41]). Adjacent edges are rounded from the SAME
// running coordinate so scaled tiles butt with no hairline seams. x is
// wrapped into [0, 2^zi); off-world rows (y) are skipped.
export function visibleTiles(s: ViewState, w: number, h: number, tileLevel: number = -1): TilePlacement[] {
  const z = s.zoom
  const zi = tileLevel >= 0 ? tileLevel : Math.max(0, Math.round(z))
  const tileCount = 2 ** zi
  // On-screen size of one zi tile at this fractional zoom.
  const tileScreen = TILE_SIZE * 2 ** (z - zi)
  const centerX = lonToWorldX(s.lon, z)
  const centerY = latToWorldY(s.lat, z)
  // INTEGER origin (sub-pixel shift is imperceptible): with a fractional
  // origin, per-tile rounding makes neighboring tiles shift by ±1px
  // differently during a pan, which (a) makes tile sizes breathe and (b)
  // breaks the display's uniform-shift detection, forcing full-screen
  // repaints instead of the scroll-origin pan fast path.
  const originX = Math.round(centerX - w / 2)
  const originY = Math.round(centerY - h / 2)
  const minTileX = Math.floor(originX / tileScreen)
  const minTileY = Math.floor(originY / tileScreen)
  const maxTileX = Math.floor((originX + w) / tileScreen)
  const maxTileY = Math.floor((originY + h) / tileScreen)

  const out: TilePlacement[] = []
  for (let ty = minTileY; ty <= maxTileY; ty++) {
    if (ty < 0 || ty >= tileCount) continue
    const top = Math.round(ty * tileScreen - originY)
    const bottom = Math.round((ty + 1) * tileScreen - originY)
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      const wrappedX = ((tx % tileCount) + tileCount) % tileCount
      const left = Math.round(tx * tileScreen - originX)
      const right = Math.round((tx + 1) * tileScreen - originX)
      out.push({
        z: zi,
        x: wrappedX,
        y: ty,
        left,
        top,
        w: right - left,
        h: bottom - top
      })
    }
  }
  return out
}
