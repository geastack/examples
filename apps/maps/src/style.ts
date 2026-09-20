// Street-map style for the OpenMapTiles vector schema (the schema OpenFreeMap /
// Protomaps-OMT / MapTiler serve). A flat, ordered list of draw rules — the
// renderer walks it bottom-to-top so later layers paint over earlier ones
// (land → water → buildings → road casing → road fill → boundaries → labels).
//
// Colors are CSS strings, which both the browser 2D context (web) and the gea
// canvas (device) parse — so one style drives both backends. Widths are
// functions of the (fractional) view zoom so roads thicken smoothly as you zoom.

export type StyleKind = 'fill' | 'line' | 'symbol'

export interface StyleLayer {
  id: string
  // Source MVT layer name (e.g. 'water', 'transportation').
  source: string
  kind: StyleKind
  minZoom: number
  maxZoom: number
  // Optional class filter: only features whose `filterKey` (default 'class') is
  // in this set draw. Empty/absent = all features in the source layer.
  filterKey?: string
  classes?: string[]
  // fill / line color, and optional line casing (drawn under the fill, wider).
  color: string
  width?: (z: number) => number
  casingColor?: string
  casingWidth?: (z: number) => number
  // symbol (label) options.
  textKey?: string
  textColor?: string
  textHalo?: string
  fontSize?: number
  // POI marker dot color (drawn above the label); set only on point-of-interest
  // layers to distinguish them from area/place labels.
  markerColor?: string
  // Minimum on-screen length (px) for a line feature to bother drawing — cheap
  // per-zoom simplification so we don't stroke sub-pixel road stubs.
  minPx?: number
}

// Road widths scale ~2x per zoom around z15. lerp on fractional zoom.
function roadWidth(base: number, ref = 15): (z: number) => number {
  return (z: number) => Math.max(0.6, base * Math.pow(2, (z - ref) * 0.65))
}

export const BACKGROUND = '#e9e6df'

export const STYLE: StyleLayer[] = [
  // ── Land cover ────────────────────────────────────────────────────────────
  { id: 'landcover-wood', source: 'landcover', kind: 'fill', minZoom: 0, maxZoom: 22, classes: ['wood', 'forest'], color: '#c8d8b8' },
  { id: 'landcover-grass', source: 'landcover', kind: 'fill', minZoom: 0, maxZoom: 22, classes: ['grass', 'meadow', 'park'], color: '#d4e4c0' },
  { id: 'landcover-sand', source: 'landcover', kind: 'fill', minZoom: 0, maxZoom: 22, classes: ['sand', 'beach'], color: '#eee5c8' },
  { id: 'landcover-ice', source: 'landcover', kind: 'fill', minZoom: 0, maxZoom: 22, classes: ['ice', 'glacier'], color: '#e8f0f4' },

  // ── Land use ───────────────────────────────────────────────────────────────
  { id: 'landuse-residential', source: 'landuse', kind: 'fill', minZoom: 8, maxZoom: 22, classes: ['residential', 'suburb', 'neighbourhood'], color: '#e5e0d8' },
  { id: 'landuse-park', source: 'landuse', kind: 'fill', minZoom: 6, maxZoom: 22, classes: ['park', 'cemetery', 'recreation_ground', 'golf_course', 'grass'], color: '#cfe6c0' },
  { id: 'landuse-hospital', source: 'landuse', kind: 'fill', minZoom: 10, maxZoom: 22, classes: ['hospital'], color: '#f0e0e0' },
  { id: 'landuse-school', source: 'landuse', kind: 'fill', minZoom: 10, maxZoom: 22, classes: ['school', 'university', 'college'], color: '#eee8d8' },

  // ── Water ────────────────────────────────────────────────────────────────
  { id: 'water', source: 'water', kind: 'fill', minZoom: 0, maxZoom: 22, color: '#a3c9e8' },
  { id: 'waterway', source: 'waterway', kind: 'line', minZoom: 8, maxZoom: 22, color: '#a3c9e8', width: roadWidth(1.2, 14), minPx: 2 },

  // ── Buildings ──────────────────────────────────────────────────────────────
  // z14+ only: at z13 a tile holds hundreds of tiny footprints, which dominate
  // the per-frame draw cost for no visual gain at that scale.
  { id: 'building', source: 'building', kind: 'fill', minZoom: 14, maxZoom: 22, color: '#d9d0c3' },

  // ── Road casing (drawn under road fill, wider + darker) ────────────────────
  { id: 'road-casing-major', source: 'transportation', kind: 'line', minZoom: 7, maxZoom: 22, classes: ['motorway', 'trunk', 'primary'], color: '#e8a33d', width: roadWidth(7), minPx: 2 },
  { id: 'road-casing-secondary', source: 'transportation', kind: 'line', minZoom: 10, maxZoom: 22, classes: ['secondary', 'tertiary'], color: '#cfcabf', width: roadWidth(5), minPx: 2 },
  { id: 'road-casing-minor', source: 'transportation', kind: 'line', minZoom: 13, maxZoom: 22, classes: ['minor', 'service', 'residential', 'living_street'], color: '#cfcabf', width: roadWidth(3.4), minPx: 2 },

  // ── Road fill ──────────────────────────────────────────────────────────────
  { id: 'road-major', source: 'transportation', kind: 'line', minZoom: 7, maxZoom: 22, classes: ['motorway', 'trunk', 'primary'], color: '#fcd672', width: roadWidth(4.5), minPx: 2 },
  { id: 'road-secondary', source: 'transportation', kind: 'line', minZoom: 10, maxZoom: 22, classes: ['secondary', 'tertiary'], color: '#ffffff', width: roadWidth(3), minPx: 2 },
  { id: 'road-minor', source: 'transportation', kind: 'line', minZoom: 13, maxZoom: 22, classes: ['minor', 'service', 'residential', 'living_street'], color: '#ffffff', width: roadWidth(2), minPx: 2 },
  { id: 'road-path', source: 'transportation', kind: 'line', minZoom: 14, maxZoom: 22, classes: ['path', 'pedestrian', 'track'], color: '#bbb2a0', width: roadWidth(1, 16), minPx: 2 },
  { id: 'road-rail', source: 'transportation', kind: 'line', minZoom: 12, maxZoom: 22, classes: ['rail', 'transit'], color: '#b4b0aa', width: roadWidth(1.4, 15), minPx: 2 },

  // ── Boundaries ──────────────────────────────────────────────────────────────
  { id: 'boundary', source: 'boundary', kind: 'line', minZoom: 4, maxZoom: 22, color: '#9a8fb0', width: () => 1, minPx: 3 },

  // ── Labels ─────────────────────────────────────────────────────────────────
  { id: 'place-label', source: 'place', kind: 'symbol', minZoom: 4, maxZoom: 22, textKey: 'name', color: '#3a3a3a', textHalo: '#ffffff', fontSize: 13 },
  { id: 'road-label', source: 'transportation_name', kind: 'symbol', minZoom: 14, maxZoom: 22, textKey: 'name', color: '#5a5a5a', textHalo: '#ffffff', fontSize: 11 },
  // Points of interest — shops, restaurants, stations, etc. Dense (thousands
  // per tile), so only from z15; the label collision pass thins them out. A
  // small dot marks each, with the name below.
  { id: 'poi-label', source: 'poi', kind: 'symbol', minZoom: 15, maxZoom: 22, textKey: 'name', color: '#7a5a2a', textHalo: '#ffffff', fontSize: 11, markerColor: '#c0863a' }
]
