export const TILE_SIZE = 256
export const MIN_ZOOM = 2
export const MAX_ZOOM = 19

// The 8 TILE levels actually fetched/stored (view zoom stays continuous —
// rendering scales tiles from the nearest ladder level). Fewer levels = far
// fewer downloads on a deep zoom journey: z13→z19 used to cross 7 fetch
// levels, now 4. Dense at street zooms (gap 2 ≈ max 1.4x scaling), coarse at
// world zooms where softness doesn't matter.
export const TILE_LEVELS = [2, 5, 8, 11, 13, 15, 17, 19]
// Same ladder as a CSV (host prune call) — keep in sync with TILE_LEVELS.
export const TILE_LEVELS_CSV = '2,5,8,11,13,15,17,19'

// Ladder level for a continuous zoom (used for rendering + fetching),
// UPSCALE-BIASED: the highest level not above z + 0.3. Rendering from below
// (upscaling) keeps the visible grid bounded (~24-40 tiles). Picking the
// level ABOVE at the gap midpoint meant 0.5x downscale grids of ~77 tiles
// plus ladder parents — beyond the tile cache cap and the image-store slot
// pool, so decodes failed and left permanent gray gaps; it also doubled the
// download count. Tiles sharpen as soon as z crosses within 0.3 of the next
// level.
export function nearestTileLevel(z: number): number {
  let best = TILE_LEVELS[0]
  for (let i = 0; i < TILE_LEVELS.length; i++) {
    if (TILE_LEVELS[i] <= z + 0.3) best = TILE_LEVELS[i]
  }
  return best
}

// The ladder level below `level` (for fallback-parent cache protection).
export function tileLevelBelow(level: number): number {
  for (let i = TILE_LEVELS.length - 1; i >= 0; i--) {
    if (TILE_LEVELS[i] < level) return TILE_LEVELS[i]
  }
  return TILE_LEVELS[0]
}

// The ladder level above `level` (double-tap zoom target).
export function tileLevelAbove(level: number): number {
  for (let i = 0; i < TILE_LEVELS.length; i++) {
    if (TILE_LEVELS[i] > level) return TILE_LEVELS[i]
  }
  return TILE_LEVELS[TILE_LEVELS.length - 1]
}

// OSM standard tile server. Browser fetch sends its own User-Agent on the web
// dev loop; the device backend (later plan) sets a proper identifying UA.
export const OSM_TILE_URL = 'https://tile.openstreetmap.org'
export const ATTRIBUTION = '© OpenStreetMap contributors'

// Default view: Berlin.
export const DEFAULT_CENTER = { lat: 52.52, lon: 13.405 }
export const DEFAULT_ZOOM = 13

export function tileUrl(z: number, x: number, y: number): string {
  return `${OSM_TILE_URL}/${z}/${x}/${y}.png`
}
