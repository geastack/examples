// Vector tile source config (kept out of the shared constants.ts so the vector
// map is self-contained). OpenFreeMap public instance: keyless, no limits, MVT
// tiles in the OpenMapTiles schema. The tile URL carries a weekly-rotating
// version segment, so the live template is resolved from the TileJSON at
// startup; the baked-in fallback is used only if that request fails (and will
// eventually 404 as the build rotates).
export const OFM_TILEJSON = 'https://tiles.openfreemap.org/planet'
export const VECTOR_TILE_TEMPLATE_FALLBACK = 'https://tiles.openfreemap.org/planet/20260531_080002_pt/{z}/{x}/{y}.pbf'
export const VECTOR_ATTRIBUTION = '© OpenStreetMap, © OpenFreeMap'

// OpenFreeMap planet tiles are generated through z14; deeper views overzoom
// (scale) the z14 geometry rather than fetching non-existent tiles.
export const MAX_DATA_ZOOM = 14

import { TILE_SIZE } from '../constants'
import { lonToWorldX, latToWorldY } from './mercator'
import type { ViewState, TilePlacement } from './viewport-math'

export function fillTemplate(tpl: string, z: number, x: number, y: number): string {
  return tpl.replace('{z}', '' + z).replace('{x}', '' + x).replace('{y}', '' + y)
}

// Like viewport-math's visibleTiles, but caps the integer tile level at
// `maxZoom` so deep views OVERZOOM (the data's deepest tiles drawn scaled-up)
// instead of requesting tiles past the source's max zoom (which don't exist).
// Kept here, mirroring the shared math, so the vector map owns its overzoom
// policy without modifying the shared viewport-math module.
export function visibleVectorTiles(s: ViewState, w: number, h: number, maxZoom: number): TilePlacement[] {
  const z = s.zoom
  const zi = Math.min(maxZoom, Math.max(0, Math.round(z)))
  const tileCount = Math.pow(2, zi)
  const tileScreen = TILE_SIZE * Math.pow(2, z - zi)
  const centerX = lonToWorldX(s.lon, z)
  const centerY = latToWorldY(s.lat, z)
  const originX = centerX - w / 2
  const originY = centerY - h / 2
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
      out.push({ z: zi, x: wrappedX, y: ty, left, top, w: right - left, h: bottom - top })
    }
  }
  return out
}
