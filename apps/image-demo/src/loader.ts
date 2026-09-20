import { loadImage, type GeaEmbeddedImage, type CanvasRenderingContext2D } from '@geastack/core'
import { fetch } from './runtime'

export const TEST_URL = 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Rotating_earth_%28large%29.gif'

export type LoadedImage = GeaEmbeddedImage

export function showLoading(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgb(17,24,39)'
  ctx.fillRect(0, 0, 410, 502)
  ctx.fillStyle = 'rgb(255,255,255)'
  ctx.font = '32px monospace'
  ctx.fillText('Loading image...', 10, 42)
}

export async function loadRemoteImage(ctx: CanvasRenderingContext2D): Promise<LoadedImage | null> {
  const response = fetch(TEST_URL)
  if (!response.ok) {
    ctx.fillStyle = 'rgb(255,0,0)'
    ctx.font = '32px monospace'
    ctx.fillText('HTTP ' + String(response.status), 10, 82)
    return null
  }

  // `loadImage` always answers with a handle -- a failed decode is `width === 0`
  // (see its own declaration), not a null -- so this is the decode-failure test,
  // and `if (!image)` was a check TypeScript itself types as never taken.
  const image = await loadImage(response.body)
  if (image.width === 0) {
    ctx.fillStyle = 'rgb(255,0,0)'
    ctx.font = '32px monospace'
    ctx.fillText('Decode failed', 10, 82)
    return null
  }
  return image
}
