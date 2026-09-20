import type { CanvasRenderingContext2D } from '@geastack/core'
import { LoadedImage } from './loader'
import { DISPLAY_H, DISPLAY_W } from './runtime'

export type ImageBounds = {
  dx: number
  dy: number
  iw: number
  ih: number
  animated: boolean
}

export function drawImageSummary(ctx: CanvasRenderingContext2D, image: LoadedImage): ImageBounds {
  const iw = image.width
  const ih = image.height
  const frames = image.frameCount
  const dx = Math.floor((DISPLAY_W - iw) / 2)
  const dy = Math.floor((DISPLAY_H - ih) / 2)

  ctx.clearRect(0, 0, DISPLAY_W, DISPLAY_H)
  ctx.fillStyle = 'rgb(255,255,255)'
  ctx.font = '16px monospace'
  ctx.fillText(String(iw) + 'x' + String(ih) + ' ' + String(frames) + 'f', 10, 22)
  ctx.drawImage(image, dx, dy)

  return { dx, dy, iw, ih, animated: image.isAnimated }
}

export function animateImage(ctx: CanvasRenderingContext2D, image: LoadedImage, bounds: ImageBounds) {
  image.play()
  requestAnimationFrame(function loop(_timestampMs: number) {
    ctx.fillStyle = 'rgb(17,24,39)'
    ctx.fillRect(bounds.dx, bounds.dy, bounds.iw, bounds.ih)
    ctx.drawImage(image, bounds.dx, bounds.dy)
    requestAnimationFrame(loop)
  })
}
