import { Component } from '@geastack/core'
import type { GeaCanvasElement } from '@geastack/core'

declare const nativeBench: {
  ttfSpecimenWidth(): number
  ttfSpecimenHeight(): number
  ttfSpecimenReady(): number
  ttfSpecimenColumnBits(x: number): number
}

const SCALE = 2
const CANVAS_W = 360
const CANVAS_H = 56
const COLOR_BG = 0x0022
const COLOR_TEXT = 0xffff
const COLOR_ERROR = 0xf800

export class TtfSpecimen extends Component<GeaCanvasElement> {
  drawn = false

  template() {
    return (
      <canvas
        class="ttf-specimen-canvas"
        width={CANVAS_W}
        height={CANVAS_H}
        style={{ width: CANVAS_W, height: CANVAS_H }}
      />
    )
  }

  onAfterRender() {
    if (this.drawn || !this.el) return
    this.drawn = true

    const ctx = this.el.getContext('2d')
    ctx.beginBatch()
    ctx.fillStyle = COLOR_BG
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    if (nativeBench.ttfSpecimenReady() === 1) {
      const width = nativeBench.ttfSpecimenWidth()
      const height = nativeBench.ttfSpecimenHeight()
      ctx.fillStyle = COLOR_TEXT
      for (let x = 0; x < width; x += 1) {
        const bits = nativeBench.ttfSpecimenColumnBits(x)
        for (let y = 0; y < height; y += 1) {
          if ((bits & (1 << y)) !== 0) ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE)
        }
      }
    } else {
      ctx.fillStyle = COLOR_ERROR
      ctx.fillRect(8, 8, CANVAS_W - 16, 8)
      ctx.fillRect(8, 24, CANVAS_W - 88, 8)
    }

    ctx.endBatch()
  }
}
