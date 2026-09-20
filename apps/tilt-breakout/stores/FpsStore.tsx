import { Store } from '@geastack/core'

export class FpsStore extends Store {
  fpsText = 'FPS --'
  windowStartMs = 0
  windowFrames = 0

  tick(timestampMs: number) {
    if (this.windowStartMs === 0) {
      this.windowStartMs = timestampMs
    }
    this.windowFrames++

    const elapsedMs = timestampMs - this.windowStartMs
    if (elapsedMs >= 500) {
      const next = `FPS ${Math.round((this.windowFrames * 1000) / elapsedMs)}`
      if (next !== this.fpsText) {
        this.fpsText = next
      }
      this.windowStartMs = timestampMs
      this.windowFrames = 0
    }
  }
}

export const fps = new FpsStore()
