import { Store } from '@geastack/core'

export class LauncherStore extends Store {
  page = 0

  init() {
    this.page = 0
  }

  nextPage() {
    this.page = 1
  }

  prevPage() {
    this.page = 0
  }

  tick(timestampMs: number) {}
}

export const launcher = new LauncherStore()
