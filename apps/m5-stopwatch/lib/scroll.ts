// SPDX-License-Identifier: MIT
// LVGL v9.5.0: indev/lv_indev.c, indev/lv_indev_scroll.c,
// core/lv_obj_scroll.c and misc/lv_math.c. Factory launcher uses
// center snapping + SCROLL_ONE; pointer reads default to33ms.
export function factoryThrowDecay(vector: number, age: number): number {
  age = Math.trunc(age)

  if (age <= 0) {
    return vector
  }

  if (age >= 99) {
    return 0
  }

  return Math.trunc((vector * (512 - Math.trunc((512 * age) / 99))) / 512)
}

export function factoryThrowPredict(vector: number): number {
  let distance = 0

  while (vector !== 0) {
    distance += vector
    vector = Math.trunc((vector * 90) / 100)
  }

  return distance
}

function cubic(t: number, a: number, b: number, c: number): number {
  let result = (a * t) >> 10

  result = ((result + b) * t) >> 10

  return ((result + c) * t) >> 10
}

// Exact fixed-point LVGL cubicBezier(0,0,.58,1), including Newton fallback.
export function factoryScrollEase(time: number, duration: number): number {
  const x = Math.max(0, Math.min(1024, Math.trunc((time * 1024) / duration)))

  if (x === 0 || x === 1024) {
    return x
  }

  const bx = 3 * 593
  const ax = 1024 - bx
  let t = x
  let found = false

  for (let i = 0; i < 8; i++) {
    const difference = cubic(t, ax, bx, 0) - x

    if (Math.abs(difference) <= 1) {
      found = true
      break
    }

    let slope = (3 * ax * t) >> 10

    slope = ((slope + 2 * bx) * t) >> 10
    if (Math.abs(slope) <= 1) {
      break
    }

    const correction = Math.trunc((difference * 1024) / slope)

    if (correction === 0) {
      break
    }

    t -= correction
  }

  if (!found) {
    let left = 0
    let right = 1024

    t = x
    while (left < right) {
      const sampled = cubic(t, ax, bx, 0)

      if (Math.abs(sampled - x) <= 1) {
        break
      }

      if (x > sampled) {
        left = t
      } else {
        right = t
      }

      t = Math.trunc((right - left) / 2) + left
      if (t === left) {
        break
      }
    }
  }

  return cubic(t, -2048, 3072, 0)
}

export class FactoryPointerHistory {
  velocity = 0
  index = 0
  vectors = new Int32Array(8)
  timestamps = new Float64Array(8)
  private recentIndex = 0
  private recentVectors = new Int32Array(128)
  private recentTimes = new Float64Array(128)

  private continuous: boolean

  constructor(continuous = false) {
    this.continuous = continuous
  }

  sample(vector: number, now: number): number {
    const timestamp = Math.trunc(now)

    if (this.continuous) {
      // Keep displacement history, as the factory does. Stationary frame polls
      // age momentum without evicting movement samples, and no input is gated.
      if (vector !== 0) {
        this.recentVectors[this.recentIndex] = Math.trunc(vector)
        this.recentTimes[this.recentIndex] = timestamp
        this.recentIndex = (this.recentIndex + 1) & 127
      }
      this.velocity = 0
      for (let i = 0; i < 128; i++) {
        const age = timestamp - this.recentTimes[i]
        if (age >= 0 && age < 99) {
          this.velocity += this.recentVectors[i] * (1 - age / 99)
        }
      }
      this.velocity = Math.trunc(this.velocity)
      return this.velocity
    }

    this.vectors[this.index] = Math.trunc(vector)
    this.timestamps[this.index] = timestamp
    this.index = (this.index + 1) & 7
    this.velocity = 0
    for (let i = 0; i < 8; i++) {
      this.velocity += factoryThrowDecay(this.vectors[i], timestamp - this.timestamps[i])
    }

    return this.velocity
  }

  // Explicit input-device reset only. UI selection/recentering leaves these
  // global samples intact, as LVGL indev_proc_press does.
  clear(): void {
    this.index = 0
    this.velocity = 0
    this.vectors.fill(0)
    this.timestamps.fill(0)
    this.recentIndex = 0
    this.recentVectors.fill(0)
    this.recentTimes.fill(0)
  }
}

export class FactoryScrollDynamics {
  position = 0
  target = 0
  held = false
  dragging = false
  canStart = true
  animating = false
  opacity = 255
  duration = 0
  point = 0
  lastPoint = 0
  pressPoint = 0
  readAt = 0
  animationAt = 0
  animationStart = 0
  minimum = 0
  maximum = 0
  private history: FactoryPointerHistory

  pitch: number
  displaySize: number
  readPeriod: number
  smoothDrag: boolean

  constructor(
    pitch: number,
    displaySize = 466,
    readPeriod = 33,
    history = new FactoryPointerHistory(),
    smoothDrag = false,
  ) {
    this.pitch = pitch
    this.displaySize = displaySize
    this.readPeriod = readPeriod
    this.history = history
    this.smoothDrag = smoothDrag
  }

  get velocity(): number {
    return this.history.velocity
  }

  get historyIndex(): number {
    return this.history.index
  }

  get vectors(): Int32Array {
    return this.history.vectors
  }

  get timestamps(): Float64Array {
    return this.history.timestamps
  }

  teleport(position: number) {
    this.position = Math.trunc(position)
    this.target = this.position
    this.held = false
    this.dragging = false
    this.animating = false
  }

  begin(point: number, now: number, position?: number) {
    now = Math.trunc(now)

    this.update(now)
    this.teleport(position === undefined ? this.position : position)
    this.held = true
    this.point = Math.trunc(point)
    this.lastPoint = this.point
    this.pressPoint = this.point
    this.readAt = now
    this.canStart = true
    // Input-device history persists across presses. First press records a zero.
    this.recordVector(0, now)
  }

  resetHistory() {
    this.history.clear()
  }

  recordVector(vector: number, now: number) {
    this.history.sample(vector, now)
  }

  move(point: number, now: number, canStart = true): number {
    now = Math.trunc(now)

    this.point = Math.trunc(point)
    this.canStart = canStart

    return this.update(now)
  }

  update(now: number): number {
    now = Math.trunc(now)

    if (
      this.smoothDrag &&
      this.held &&
      !this.dragging &&
      this.canStart &&
      Math.abs(this.point - this.pressPoint) >= 10
    ) {
      this.dragging = true
      this.minimum = Math.ceil(this.position / this.pitch - 1) * this.pitch
      this.maximum = Math.floor(this.position / this.pitch + 1) * this.pitch
    }

    if (this.held && now - this.readAt >= this.readPeriod) {
      const vector = this.point - this.lastPoint

      this.lastPoint = this.point
      this.readAt = now
      this.recordVector(vector, now)

      if (!this.dragging && this.canStart && Math.abs(this.point - this.pressPoint) >= 10) {
        this.dragging = true
        // Limits are captured when scrolling begins, including interrupted snaps.
        this.minimum = Math.ceil(this.position / this.pitch - 1) * this.pitch
        this.maximum = Math.floor(this.position / this.pitch + 1) * this.pitch
      }

      if (this.dragging) {
        this.position = Math.max(this.minimum, Math.min(this.maximum, this.position - vector))
      }
    }

    if (this.animating) {
      const elapsed = Math.max(0, now - this.animationAt)

      if (elapsed >= this.duration) {
        this.position = this.target
        this.animating = false
      } else {
        this.position =
          this.animationStart +
          ((factoryScrollEase(elapsed, this.duration) * (this.target - this.animationStart)) >> 10)
      }
    }

    return this.position
  }

  release(now: number): number {
    now = Math.trunc(now)

    // Commit the final visible displacement without adding a second momentum
    // sample. Throw history still follows the factory input-device cadence.
    this.position = this.visualPosition()
    this.held = false
    if (!this.dragging) {
      return this.position
    }

    const predicted = Math.max(
      this.minimum,
      Math.min(this.maximum, this.position - factoryThrowPredict(this.velocity)),
    )
    const lower = Math.floor(predicted / this.pitch) * this.pitch
    const upper = lower + this.pitch
    // Strict comparison in find_snap_point_x chooses the earlier child on ties.
    const target = predicted - lower <= upper - predicted ? lower : upper

    this.animateTo(target, now)

    return this.target
  }

  animateTo(target: number, now: number) {
    now = Math.trunc(now)

    this.update(now)
    this.held = false
    this.dragging = false
    this.target = Math.trunc(target)
    this.animationStart = this.position
    this.animationAt = now
    this.duration = Math.max(
      200,
      Math.min(
        400,
        Math.trunc(
          (Math.abs(this.target - this.position) * 100) /
            Math.trunc(((this.displaySize >> 1) + 5) / 10),
        ),
      ),
    )
    this.animating = this.target !== this.position
  }

  visualPosition(): number {
    if (!this.smoothDrag || !this.held || !this.dragging) {
      return this.position
    }

    return Math.max(
      this.minimum,
      Math.min(this.maximum, this.position - (this.point - this.lastPoint)),
    )
  }

  titleOpacity(): number {
    const position = this.visualPosition()
    const nearest = Math.floor((position + this.pitch / 2) / this.pitch)
    const distance = Math.abs(position - nearest * this.pitch)

    if (distance <= 70) {
      this.opacity = 255
    } else if (distance <= 150) {
      const fade = Math.fround(1 - Math.fround((distance - 70) / 80))

      this.opacity = Math.trunc(Math.fround(255 * fade))
    }

    return this.opacity / 255
  }
}
