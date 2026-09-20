import { Store } from '@geastack/core'

export class TickStore extends Store {
  tickText = 'tick 0'
  ticks = 0
  lastMs = 0

  tick(timestampMs: number) {
    if (timestampMs - this.lastMs < 500) return
    this.lastMs = timestampMs
    this.ticks++
    this.tickText = `tick ${this.ticks}`
  }
}

export const ticker = new TickStore()
