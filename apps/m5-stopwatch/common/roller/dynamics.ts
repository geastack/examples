// LVGL 9.5 roller/input semantics: integer pointer samples, predicted throw,
// cubic-bezier ease-out snapping, and post-animation infinite-page recentering.
// https://github.com/lvgl/lvgl/blob/v9.5.0/src/widgets/roller/lv_roller.c
// https://github.com/lvgl/lvgl/blob/v9.5.0/src/indev/lv_indev.c

import { FactoryPointerHistory, factoryScrollEase, factoryThrowPredict } from '../../lib/scroll'

export interface RollerGeometry {
  count: number
  fontHeight: number
  optionsFontHeight: number
  lineSpace: number
  letterSpace: number
  height: number
  padding: number
  animationMs: number
  infinite: boolean
  glide?: boolean
}

export function rollerEaseOut(elapsed: number, duration: number): number {
  if (duration <= 0) {
    return 1024
  }

  return factoryScrollEase(Math.trunc(elapsed), duration)
}

export function rollerThrowDistance(velocity: number, slowdown = 10): number {
  if (slowdown === 10) {
    return factoryThrowPredict(Math.trunc(velocity))
  }

  let value = Math.trunc(velocity)
  let sum = 0
  const decay = Math.max(1, Math.min(100, Math.trunc(slowdown)))

  while (value !== 0) {
    sum += value
    value = Math.trunc((value * (100 - decay)) / 100)
  }

  return sum
}

export class RollerDynamics {
  selected = 0
  position = 0
  moved = false
  pressed = false
  animating = false
  pitch: number
  pageCount: number
  expandedCount: number
  private geometry: RollerGeometry
  private internalSelected = 0
  private pointerY = 0
  private visualY = 0
  private history: FactoryPointerHistory
  private animationStart = 0
  private animationFrom = 0
  private animationTo = 0
  private animationDuration = 200
  private coasting = false
  private coastVelocity = 0
  private coastDuration = 0
  private coastEnd = 0

  constructor(geometry: RollerGeometry, selected: number, history = new FactoryPointerHistory()) {
    this.history = history
    this.geometry = {
      count: geometry.count,
      fontHeight: geometry.fontHeight,
      optionsFontHeight: geometry.optionsFontHeight,
      lineSpace: geometry.lineSpace,
      letterSpace: geometry.letterSpace,
      height: geometry.height,
      padding: geometry.padding,
      animationMs: geometry.animationMs,
      infinite: geometry.infinite,
      glide: geometry.glide,
    }
    this.pitch = 0
    this.pageCount = 0
    this.expandedCount = 0
    this.reset(geometry.count, selected, 0)
  }

  reset(count: number, selected: number, now: number): void {
    this.geometry.count = Math.max(1, Math.trunc(count))
    const geometry = this.geometry

    this.pitch = geometry.fontHeight + geometry.lineSpace
    const pages = Math.max(
      3,
      Math.min(
        15,
        Math.trunc(1000 / (geometry.count * (geometry.optionsFontHeight + geometry.letterSpace))),
      ),
    )

    this.pageCount = geometry.infinite ? pages + (pages % 2 === 0 ? 1 : 0) : 1
    this.expandedCount = geometry.count * this.pageCount
    this.pressed = false
    this.moved = false
    this.selectInternal(
      Math.max(0, Math.min(geometry.count - 1, Math.trunc(selected))) +
        Math.trunc(this.pageCount / 2) * geometry.count,
      now,
      false,
    )
  }

  // Translation relative to the currently selected row's centered position.
  get offset(): number {
    return this.visualPosition - this.rowPosition(this.internalSelected)
  }

  get visualPosition(): number {
    return this.position + (this.pressed ? this.visualY - this.pointerY : 0)
  }

  preview(pointerY: number): void {
    if (this.pressed && this.geometry.count > 1) {
      this.visualY = Math.trunc(pointerY)
      if (this.visualY !== this.pointerY) this.moved = true
    }
  }

  get anchor(): number {
    return this.visibleInternal() % this.geometry.count
  }

  get residual(): number {
    return this.visualPosition - this.rowPosition(this.visibleInternal())
  }

  hasRow(offset: number): boolean {
    const row = this.visibleInternal() + Math.trunc(offset)

    return row >= 0 && row < this.expandedCount
  }

  private visibleInternal(): number {
    return Math.max(
      0,
      Math.min(
        this.expandedCount - 1,
        this.internalSelected + Math.floor((-this.offset + this.pitch / 2) / this.pitch),
      ),
    )
  }

  private rowPosition(index: number): number {
    const contentHeight = this.geometry.height - 2 * this.geometry.padding

    return (
      this.geometry.padding +
      Math.trunc(contentHeight / 2) -
      Math.trunc(this.geometry.fontHeight / 2) -
      index * this.pitch
    )
  }

  private normalize(): void {
    this.internalSelected = this.selected + Math.trunc(this.pageCount / 2) * this.geometry.count
    this.position = this.rowPosition(this.internalSelected)
  }

  private selectInternal(index: number, now: number, animate: boolean): void {
    this.internalSelected = Math.max(0, Math.min(this.expandedCount - 1, Math.trunc(index)))
    this.selected = this.internalSelected % this.geometry.count
    this.coasting = false
    this.coastVelocity = 0
    this.animationFrom = this.position
    this.animationTo = this.rowPosition(this.internalSelected)
    this.animationStart = Math.trunc(now)
    this.animationDuration = this.geometry.animationMs
    this.animating = animate && this.geometry.animationMs > 0

    if (!this.animating) {
      this.normalize()
    }
  }

  setSelected(index: number, now: number, animate = true): void {
    this.update(now)
    const count = this.geometry.count
    let target = Math.max(0, Math.min(count - 1, Math.trunc(index)))

    if (this.geometry.infinite) {
      const page = Math.trunc(this.internalSelected / count)
      const current = this.internalSelected - page * count

      if (Math.abs(current - target) > Math.trunc(count / 2)) {
        target += current > target ? count : -count
      }

      target += page * count
    }

    this.selectInternal(target, now, animate)
  }

  press(pointerY: number, now: number): void {
    this.update(now)
    this.animating = false
    this.coasting = false
    this.coastVelocity = 0
    if (this.geometry.glide) this.history.clear()
    this.moved = false
    this.pressed = true
    this.pointerY = Math.trunc(pointerY)
    this.visualY = this.pointerY
    this.move(pointerY, now)
  }

  // Call once per input poll, including unchanged positions. LVGL uses eight
  // input samples rather than px/ms; omitting stationary polls retains a fling.
  move(pointerY: number, now: number): void {
    if (!this.pressed || this.geometry.count <= 1) {
      return
    }

    const point = Math.trunc(pointerY)
    const delta = point - this.pointerY

    this.pointerY = point
    this.visualY = point
    this.history.sample(delta, now)

    if (delta !== 0) {
      this.position += delta
      this.moved = true
    }
  }

  release(pointerY: number, now: number): void {
    if (!this.pressed) {
      return
    }

    this.position = this.visualPosition
    this.pressed = false
    if (this.geometry.count <= 1) {
      return
    }

    let index: number

    if (this.moved) {
      const projected =
        this.position +
        (this.geometry.glide
          ? (this.history.velocity / 49.5) * 1.25 * 550
          : rollerThrowDistance(this.history.velocity))

      index = Math.trunc((Math.trunc((this.geometry.height - 1) / 2) - projected) / this.pitch)
    } else {
      // lv_label_get_letter_on assigns inter-line spacing to the next line.
      index = Math.max(
        0,
        Math.ceil((Math.trunc(pointerY) - this.position - this.geometry.fontHeight) / this.pitch),
      )
    }

    this.selectInternal(index, now, true)
    if (this.moved && this.geometry.glide) {
      this.coasting = true
      // Continuous history integrates the last 99 ms with triangular weights,
      // hence its velocity carries 49.5 ms of displacement. Coast with native
      // velocity continuity; snap only once the remaining velocity is low.
      this.coastVelocity = (this.history.velocity / 49.5) * 1.25
      const speed = Math.abs(this.coastVelocity)
      this.coastDuration = speed > 0.035 ? 550 * Math.log(speed / 0.035) : 0
      const boundary =
        this.coastVelocity < 0 ? this.rowPosition(this.expandedCount - 1) : this.rowPosition(0)
      const fraction = (boundary - this.animationFrom) / (this.coastVelocity * 550)
      if (speed > 0.035 && fraction >= 0 && fraction < 1) {
        this.coastDuration = Math.min(this.coastDuration, -550 * Math.log(1 - fraction))
      }
      this.coastEnd =
        this.animationFrom + this.coastVelocity * 550 * (1 - Math.exp(-this.coastDuration / 550))
      this.coastEnd = Math.max(
        this.rowPosition(this.expandedCount - 1),
        Math.min(this.rowPosition(0), this.coastEnd),
      )
      this.animationDuration = this.coastDuration + 140
    }
  }

  update(now: number): boolean {
    if (!this.animating) {
      return false
    }

    const elapsed = Math.trunc(now) - this.animationStart
    if (this.coasting) {
      if (elapsed < this.coastDuration) {
        const coastPosition =
          this.animationFrom +
          this.coastVelocity * 550 * (1 - Math.exp(-Math.max(0, elapsed) / 550))
        this.position = Math.max(
          this.rowPosition(this.expandedCount - 1),
          Math.min(this.rowPosition(0), coastPosition),
        )
      } else {
        const progress = Math.max(0, Math.min(1, (elapsed - this.coastDuration) / 140))
        const step = 1 - Math.pow(1 - progress, 3)
        this.position = this.coastEnd + step * (this.animationTo - this.coastEnd)
      }
    } else {
      const step = rollerEaseOut(elapsed, this.animationDuration)
      this.position = this.animationFrom + ((step * (this.animationTo - this.animationFrom)) >> 10)
    }

    if (elapsed >= this.animationDuration) {
      this.animating = false
      this.normalize()
    }

    return true
  }
}
