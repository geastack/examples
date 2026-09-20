import { TILE_SIZE } from '../constants'

export const MAX_MERCATOR_LAT = 85.05112877980659

export function clampLat(lat: number): number {
  return Math.max(-MAX_MERCATOR_LAT, Math.min(MAX_MERCATOR_LAT, lat))
}

export function worldSize(z: number): number {
  return TILE_SIZE * 2 ** z
}

export function lonToWorldX(lon: number, z: number): number {
  return ((lon + 180) / 360) * worldSize(z)
}

export function latToWorldY(lat: number, z: number): number {
  const rad = (clampLat(lat) * Math.PI) / 180
  const y = 0.5 - Math.log(Math.tan(Math.PI / 4 + rad / 2)) / (2 * Math.PI)
  return y * worldSize(z)
}

export function worldXToLon(worldX: number, z: number): number {
  return (worldX / worldSize(z)) * 360 - 180
}

export function worldYToLat(worldY: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * worldY) / worldSize(z)
  return (180 / Math.PI) * Math.atan(Math.sinh(n))
}
