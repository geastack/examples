import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  decodeMvt,
  findLayer,
  featureStr,
  partLength,
  GEOM_POINT,
  GEOM_LINE,
  GEOM_POLYGON,
  type VectorFeature
} from '../src/mvt'

const here = dirname(fileURLToPath(import.meta.url))
function fixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(here, 'fixtures', name)))
}

describe('mvt decoder', () => {
  it('decodes layers, names and extents from a real tile', () => {
    const tile = decodeMvt(fixture('demotiles-0-0-0.pbf'))
    expect(tile.layers.length).toBeGreaterThan(0)
    // Every layer has a non-empty name and a power-of-two-ish extent.
    for (const layer of tile.layers) {
      expect(layer.name.length).toBeGreaterThan(0)
      expect(layer.extent).toBeGreaterThan(0)
    }
    // The MapLibre demo schema includes a 'centroids' layer (seen in the header).
    expect(findLayer(tile, 'centroids')).not.toBeNull()
  })

  it('decodes features with valid geometry types and coordinates', () => {
    const tile = decodeMvt(fixture('demotiles-2-2-1.pbf'))
    let total = 0
    let polys = 0
    for (const layer of tile.layers) {
      for (const feat of layer.features) {
        total++
        expect([GEOM_POINT, GEOM_LINE, GEOM_POLYGON]).toContain(feat.type)
        expect(feat.x.length).toBe(feat.y.length)
        expect(feat.parts.length).toBeGreaterThan(0)
        // Coordinates land within (a small margin around) the tile extent.
        for (let i = 0; i < feat.x.length; i++) {
          expect(feat.x[i]).toBeGreaterThan(-layer.extent)
          expect(feat.x[i]).toBeLessThan(layer.extent * 2)
        }
        if (feat.type === GEOM_POLYGON) polys++
      }
    }
    expect(total).toBeGreaterThan(0)
    expect(polys).toBeGreaterThan(0)
  })

  it('multi-part geometry: parts index every ring/line start', () => {
    const tile = decodeMvt(fixture('demotiles-0-0-0.pbf'))
    let sawMultiPart = false
    for (const layer of tile.layers) {
      for (const feat of layer.features) {
        // parts are strictly increasing and within bounds.
        for (let p = 0; p < feat.parts.length; p++) {
          expect(feat.parts[p]).toBeGreaterThanOrEqual(0)
          expect(feat.parts[p]).toBeLessThan(feat.x.length)
          if (p > 0) expect(feat.parts[p]).toBeGreaterThan(feat.parts[p - 1])
          expect(partLength(feat, p)).toBeGreaterThan(0)
        }
        if (feat.parts.length > 1) sawMultiPart = true
      }
    }
    expect(sawMultiPart).toBe(true)
  })

  it('resolves string properties from the tag/value pools', () => {
    const tile = decodeMvt(fixture('demotiles-0-0-0.pbf'))
    // At least one feature in the tile should expose a readable string tag.
    let sawProp = false
    for (const layer of tile.layers) {
      if (layer.keys.length === 0) continue
      for (const feat of layer.features) {
        for (const key of layer.keys) {
          if (featureStr(layer, feat, key).length > 0) {
            sawProp = true
            break
          }
        }
        if (sawProp) break
      }
      if (sawProp) break
    }
    expect(sawProp).toBe(true)
  })
})
