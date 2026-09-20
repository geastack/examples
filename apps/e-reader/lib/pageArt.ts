import { loadImageWithOpaque, type GeaCanvasElement } from '@geastack/core'
import { epubImageBytes } from './epub'

// Fixed art box; matches IMAGE_BLOCK_PX in lib/pagination.ts (height) and the
// wide-margin content width so the canvas fits both margin settings.
// ReaderScreen's #page-art canvas uses the same numbers.
export const PAGE_ART_W = 404
export const PAGE_ART_H = 320

// Draw the visible page's illustration onto the reader's art canvas: paper
// background, contain-fit, centered. A module function on purpose — template
// image sources only support literal/bundled assets, and host-object bindings
// (the decoded image handle) stay concretely typed in module code. Nothing
// image-sized is retained: extract, decode, draw, dispose.
export function drawPageArt(bookPath: string, href: string, opaque: boolean): void {
  const canvas = document.getElementById('page-art') as unknown as GeaCanvasElement | null
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fffdf6'
  ctx.fillRect(0, 0, PAGE_ART_W, PAGE_ART_H)
  if (bookPath.length == 0 || href.length == 0) return
  const bytes = epubImageBytes(bookPath, href)
  if (bytes.length == 0) return
  // The cover is a solid photo — decode it opaque so the per-pixel alpha plane
  // is skipped, one less full-resolution buffer during the decode. Cover decodes
  // have a large transient footprint on the 4 MB-PSRAM device; trimming the alpha
  // plane (and deferring the decode until the background walk is done — see
  // ReaderStore.paintPageArt) keeps peak memory below the OOM-abort threshold.
  const image = loadImageWithOpaque(bytes, opaque)
  if (image.width > 0 && image.height > 0) {
    let drawWidth = PAGE_ART_W
    let drawHeight = Math.floor((image.height * PAGE_ART_W) / image.width)
    if (drawHeight > PAGE_ART_H) {
      drawHeight = PAGE_ART_H
      drawWidth = Math.floor((image.width * PAGE_ART_H) / image.height)
    }
    ctx.drawImage(image, Math.floor((PAGE_ART_W - drawWidth) / 2), Math.floor((PAGE_ART_H - drawHeight) / 2), drawWidth, drawHeight)
  }
  image.dispose()
}
