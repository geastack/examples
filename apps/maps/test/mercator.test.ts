import { describe, expect, it } from 'vitest'
import { lonToWorldX, latToWorldY, worldXToLon, worldYToLat, worldSize, clampLat } from '../src/mercator'
import { TILE_SIZE } from '../constants'

describe('mercator', () => {
  it('worldSize doubles per zoom level', () => {
    expect(worldSize(0)).toBe(TILE_SIZE)
    expect(worldSize(1)).toBe(TILE_SIZE * 2)
    expect(worldSize(13)).toBe(TILE_SIZE * 2 ** 13)
  })

  it('maps longitude edges and center to world X', () => {
    const size = worldSize(0)
    expect(lonToWorldX(-180, 0)).toBeCloseTo(0, 6)
    expect(lonToWorldX(180, 0)).toBeCloseTo(size, 6)
    expect(lonToWorldX(0, 0)).toBeCloseTo(size / 2, 6)
  })

  it('maps the equator to the vertical middle', () => {
    expect(latToWorldY(0, 0)).toBeCloseTo(worldSize(0) / 2, 6)
  })

  it('round-trips lon/lat through world coordinates', () => {
    for (const z of [1, 5, 13, 19]) {
      for (const lon of [-179, -45, 0, 13.405, 100, 179]) {
        expect(worldXToLon(lonToWorldX(lon, z), z)).toBeCloseTo(lon, 6)
      }
      for (const lat of [-80, -45, 0, 52.52, 60, 80]) {
        expect(worldYToLat(latToWorldY(lat, z), z)).toBeCloseTo(lat, 4)
      }
    }
  })

  it('clamps latitude to the Web-Mercator limit', () => {
    expect(clampLat(90)).toBeCloseTo(85.0511, 3)
    expect(clampLat(-90)).toBeCloseTo(-85.0511, 3)
    expect(clampLat(40)).toBe(40)
  })
})
