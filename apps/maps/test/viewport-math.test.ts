import { describe, expect, it } from 'vitest'
import { panned, zoomedAt, screenToLatLon, latLonToScreen, visibleTiles, type ViewState } from '../src/viewport-math'
import { TILE_SIZE } from '../constants'

const MINZ = 1
const MAXZ = 19

describe('viewport-math', () => {
  it('panning right by N then left by N returns to the same center', () => {
    const s: ViewState = { lat: 52.52, lon: 13.405, zoom: 13 }
    const back = panned(panned(s, 120, 80), -120, -80)
    expect(back.lat).toBeCloseTo(s.lat, 9)
    expect(back.lon).toBeCloseTo(s.lon, 9)
  })

  it('panning content right (dx>0) decreases longitude', () => {
    const s: ViewState = { lat: 0, lon: 0, zoom: 4 }
    expect(panned(s, 256, 0).lon).toBeLessThan(0)
  })

  it('clamps zoom to [minZoom, maxZoom]', () => {
    expect(zoomedAt({ lat: 0, lon: 0, zoom: MINZ }, 10, 10, -1, 400, 300, MINZ, MAXZ).zoom).toBe(MINZ)
    expect(zoomedAt({ lat: 0, lon: 0, zoom: MAXZ }, 10, 10, +1, 400, 300, MINZ, MAXZ).zoom).toBe(MAXZ)
  })

  it('zoomAt keeps the focal point geographically stable', () => {
    const s: ViewState = { lat: 52.52, lon: 13.405, zoom: 13 }
    const fx = 600
    const fy = 200
    const before = screenToLatLon(s, fx, fy, 1024, 720)
    const z = zoomedAt(s, fx, fy, +1, 1024, 720, MINZ, MAXZ)
    const after = screenToLatLon(z, fx, fy, 1024, 720)
    expect(after.lat).toBeCloseTo(before.lat, 4)
    expect(after.lon).toBeCloseTo(before.lon, 4)
  })

  it('latLonToScreen round-trips with screenToLatLon', () => {
    const s: ViewState = { lat: 52.52, lon: 13.405, zoom: 14 }
    for (const [sx, sy] of [[0, 0], [512, 360], [1023, 719]]) {
      const ll = screenToLatLon(s, sx, sy, 1024, 720)
      const back = latLonToScreen(s, ll.lat, ll.lon, 1024, 720)
      expect(back.x).toBeCloseTo(sx, 3)
      expect(back.y).toBeCloseTo(sy, 3)
    }
  })

  it('latLonToScreen places the center at the viewport middle', () => {
    const s: ViewState = { lat: 52.52, lon: 13.405, zoom: 12 }
    const p = latLonToScreen(s, s.lat, s.lon, 1024, 720)
    expect(p.x).toBeCloseTo(512, 6)
    expect(p.y).toBeCloseTo(360, 6)
  })

  it('visibleTiles covers the viewport and wraps x into [0, 2^z)', () => {
    const s: ViewState = { lat: 52.52, lon: 13.405, zoom: 13 }
    const w = 1024
    const h = 720
    const tiles = visibleTiles(s, w, h)
    // Covers the top-left and bottom-right corners.
    const covers = (px: number, py: number) =>
      tiles.some(t => t.left <= px && px < t.left + TILE_SIZE && t.top <= py && py < t.top + TILE_SIZE)
    expect(covers(0, 0)).toBe(true)
    expect(covers(w - 1, h - 1)).toBe(true)
    // All x within world bounds.
    const count = 2 ** s.zoom
    expect(tiles.every(t => t.x >= 0 && t.x < count)).toBe(true)
  })
})
