import { Store } from '@geastack/core'

// Counter whose value PERSISTS across reboots / power cycles via the global
// `localStorage` — the DOM-compatible key/value store (backed by NVS on device).
// It is a global, so there is nothing to import, and it is safe to read/write
// from anywhere — including init() — because reads/writes hit an in-RAM mirror
// and the flash write is deferred to the frame task by the runtime.
export class CounterStore extends Store {
  count = 0
  status = ''

  init() {
    const saved = localStorage.getItem('counter_count')
    if (saved) {
      this.count = Number(saved)
      this.updateStatus()
    } else {
      this.count = 0
      this.status = 'Ready'
    }
  }

  increment() {
    this.count = this.count + 1
    this.updateStatus()
    this.save()
  }

  decrement() {
    this.count = this.count - 1
    this.updateStatus()
    this.save()
  }

  reset() {
    this.count = 0
    this.status = 'Reset to zero'
    this.save()
  }

  save() {
    localStorage.setItem('counter_count', '' + this.count)
  }

  updateStatus() {
    if (this.count > 0) this.status = 'Counting up'
    else if (this.count < 0) this.status = 'Below zero'
    else this.status = 'Back at zero'
  }
}

export const counter = new CounterStore()
