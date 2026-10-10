// Port of smooth_ui_toolkit v2.12.1's Spring/AnimateValue and DigitFlow.
// Factory refs: repos.json, src/core/animation/generators/spring/spring.cpp,
// src/lvgl/number_flow/digit_flow.hpp. Keep float intermediates and retarget
// velocity: replacing these with frame-dependent interpolation changes motion.
export class FactorySpring {
  value = 0
  velocity = 0
  target = 0
  start = 0
  at = 0
  done = true
  c1 = 0
  c2 = 0
  frequency = 0
  dampedFrequency = 0
  dampingRatio = 0

  constructor(duration: number, bounce: number) {
    const f = Math.fround
    const period = f((2 * Math.PI) / f(f(duration) * f(1.2)))
    const stiffness = f(period * period)
    const damping = f(f(2 * f(1 - f(bounce))) * period)

    this.frequency = f(Math.sqrt(stiffness))
    this.dampingRatio = f(damping / f(2 * this.frequency))
    this.dampedFrequency = f(
      this.frequency * f(Math.sqrt(f(1 - f(this.dampingRatio * this.dampingRatio)))),
    )
  }

  teleport(value: number, now: number) {
    this.value = Math.fround(value)
    this.target = this.value
    this.start = this.value
    this.velocity = 0
    this.at = now
    this.done = true
  }

  move(target: number, now: number) {
    if (Math.fround(target) !== this.target) {
      this.update(now)
      this.retarget(this.value, target, now)
    }
  }

  retarget(start: number, target: number, now: number) {
    const f = Math.fround
    const delta = f(f(target) - f(start))

    this.start = f(start)
    this.value = this.start
    this.target = f(target)
    this.at = now
    this.done = false
    this.c1 = f(
      f(-this.velocity + f(f(this.dampingRatio * this.frequency) * delta)) / this.dampedFrequency,
    )
    this.c2 = delta
  }

  update(now: number) {
    if (this.done) {
      this.value = this.target

      return this.value
    }

    const f = Math.fround
    const t = f(Math.max(0, now - this.at) / 1000)
    const ratioFrequency = f(this.dampingRatio * this.frequency)
    const envelope = f(Math.exp(f(-ratioFrequency * t)))
    const sine = f(Math.sin(f(this.dampedFrequency * t)))
    const cosine = f(Math.cos(f(this.dampedFrequency * t)))
    const displacement = f(f(this.c1 * sine) + f(this.c2 * cosine))

    this.value = f(this.target - f(envelope * displacement))
    this.velocity = f(
      envelope *
        f(
          f(ratioFrequency * displacement) -
            f(this.dampedFrequency * f(f(this.c1 * cosine) - f(this.c2 * sine))),
        ),
    )
    this.done =
      Math.abs(this.velocity) <= Math.fround(0.1) &&
      Math.abs(this.target - this.value) <= Math.fround(0.1)

    return this.value
  }
}

export class DigitFlowState {
  index = 1
  digit = 0
  offset = new FactorySpring(0.6, 0.05)
  position = new FactorySpring(0.6, 0.05)
  opacity = new FactorySpring(0.6, 0.05)

  reset(column: number, now: number) {
    this.index = 1
    this.digit = 0
    this.offset.teleport(0, now)
    this.offset.move(60, now)
    this.position.teleport(0, now)
    this.position.move(column * 42, now)
    this.opacity.teleport(0, now)
    this.opacity.move(255, now)
  }

  setDigit(digit: number, increase: boolean, now: number) {
    while (this.digit !== digit) {
      if (increase) {
        if (this.index >= 10) {
          this.index = 1
          this.offset.retarget(0, 60, now)
        } else {
          this.index++
          this.offset.move(this.index * 60, now)
        }
      } else if (this.index <= 1) {
        this.index = 10
        this.offset.retarget(660, 600, now)
      } else {
        this.index--
        this.offset.move(this.index * 60, now)
      }

      this.digit = (this.index - 1) % 10
    }
  }
}

export function unwrapAngle(previous: number, next: number): number {
  const f = Math.fround
  let angle = f(previous % 360)

  if (angle < 0) {
    angle = f(angle + 360)
  }

  let delta = f(f(next - angle) % 360)

  if (delta < -180) {
    delta = f(delta + 360)
  } else if (delta > 180) {
    delta = f(delta - 360)
  }

  return f(previous + delta)
}

// AnimateValue with EasingType::Linear: unchanged targets retain their timer,
// changed targets start from the currently interpolated value.
export class FactoryLinear {
  value = 0
  target = 0
  start = 0
  at = 0
  duration: number

  constructor(duration: number) {
    this.duration = Math.fround(duration)
  }

  teleport(value: number, now: number) {
    this.value = Math.fround(value)
    this.start = this.value
    this.target = this.value
    this.at = now
  }

  move(target: number, now: number) {
    if (Math.fround(target) !== this.target) {
      this.update(now)
      this.start = this.value
      this.target = Math.fround(target)
      this.at = now
    }
  }

  update(now: number): number {
    const f = Math.fround
    const progress = f(f(Math.max(0, now - this.at) / 1000) * f(1 / this.duration))

    this.value =
      progress >= 1 ? this.target : f(this.start + f(f(this.target - this.start) * progress))

    return this.value
  }
}

// C++ std::round/std::lround round half values away from zero.
export function factoryRound(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value)
}
