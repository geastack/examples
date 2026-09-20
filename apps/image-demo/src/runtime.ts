import { fetchBytes } from '@geastack/core'

export const DISPLAY_W = 410
export const DISPLAY_H = 502

export type FetchResponse = {
  ok: boolean
  status: number
  body: Uint8Array
}

// The engine's own synchronous byte fetch (`gea::host::image.fetchBytes`), not a
// `globalThis` cast. The cast this replaced typed the runtime as
// `typeof globalThis & { fetch?: ...; requestAnimationFrame?: ... }`, which
// intersects the ambient `requestAnimationFrame` with a second, structurally
// identical declaration of it -- an intersection of two call signatures, which
// is not a callable type any single calling convention can carry.
export function fetch(url: string): FetchResponse {
  const body = fetchBytes(url)
  const ok = body.length > 0
  return { ok, status: ok ? 200 : 0, body }
}
