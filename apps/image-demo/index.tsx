import { Component, mount, type GeaCanvasElement, type CanvasRenderingContext2D } from '@geastack/core'
import { loadRemoteImage, showLoading } from './src/loader'
import { animateImage, drawImageSummary } from './src/viewer'
import { DISPLAY_H, DISPLAY_W } from './src/runtime'

class App extends Component<GeaCanvasElement> {
  canvasEl: GeaCanvasElement | null = null
  started = false

  template() {
    return (
      <canvas
        ref={this.canvasEl}
        width={DISPLAY_W}
        height={DISPLAY_H}
        style={{ width: DISPLAY_W, height: DISPLAY_H }}
      />
    )
  }

  onAfterRender() {
    if (this.started) return
    this.started = true
    const canvas = (this.canvasEl || this.el)!
    const ctx = canvas.getContext('2d')
    void this.load(ctx)
  }

  private async load(ctx: CanvasRenderingContext2D) {
    showLoading(ctx)
    const image = await loadRemoteImage(ctx)
    if (!image) return

    const bounds = drawImageSummary(ctx, image)
    if (bounds.animated) animateImage(ctx, image, bounds)
  }
}

mount(App)
