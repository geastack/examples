import { Store } from '@geastack/core'

// Every button drives one of the cases the ProgressBar has to handle, so the
// app doubles as the fixture for core's progress-bar pipeline test.
export class DemoStore extends Store {
  value = 40
  min = 0
  max = 100
  busy = false
  still = false
  wide = true

  // ProgressBar clamps what it draws, not the app's value, so the app keeps its
  // own value in range. Over and Under bypass this on purpose to exercise the
  // bar's clamping.
  step(delta: number) {
    let next = this.value + delta
    if (next > this.max) next = this.max
    if (next < this.min) next = this.min
    this.value = next
  }

  setValue(next: number) {
    this.value = next
  }

  // min == max leaves the bar nothing to divide by; it must draw empty, not NaN.
  zeroRange() {
    this.min = 50
    this.max = 50
  }

  reset() {
    this.value = 40
    this.min = 0
    this.max = 100
    this.busy = false
    this.still = false
    this.wide = true
  }

  toggleBusy() {
    this.busy = !this.busy
  }

  toggleStill() {
    this.still = !this.still
  }

  toggleWide() {
    this.wide = !this.wide
  }

  get label(): string {
    if (this.busy) return 'Working'
    const range = 'value ' + this.value + ' of ' + this.min + '-' + this.max
    return this.max > this.min ? range : range + ' (zero range)'
  }
}

export const demo = new DemoStore()
