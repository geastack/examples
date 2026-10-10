import test from 'node:test'
import assert from 'node:assert/strict'
import {
  FactoryScrollDynamics,
  FactoryPointerHistory,
  factoryScrollEase,
  factoryThrowDecay,
  factoryThrowPredict,
} from '../lib/scroll.ts'

test('smooth launcher starts dragging immediately without waiting for a momentum sample', () => {
  const scroll = new FactoryScrollDynamics(466, 466, 33, new FactoryPointerHistory(), true)

  scroll.begin(300, 0)
  scroll.move(289, 1)
  assert.equal(scroll.dragging, true)
  assert.equal(scroll.visualPosition(), 11)
  assert.equal(scroll.historyIndex, 1)
  scroll.move(275, 2)
  assert.equal(scroll.visualPosition(), 25)
  scroll.release(3)
  assert.equal(scroll.animationStart, 25)
})

test('smooth launcher tracks sub-33ms input without changing factory momentum samples', () => {
  const smooth = new FactoryScrollDynamics(466, 466, 33, new FactoryPointerHistory(), true)
  const factory = new FactoryScrollDynamics(466)

  for (const scroll of [smooth, factory]) {
    scroll.begin(300, 0)
    scroll.move(250, 33)
    scroll.move(235, 49)
  }

  assert.equal(smooth.visualPosition(), 65)
  assert.equal(factory.visualPosition(), 50)
  assert.equal(smooth.position, factory.position)
  assert.equal(smooth.velocity, factory.velocity)
  assert.equal(smooth.historyIndex, factory.historyIndex)
  smooth.update(50)
  assert.equal(smooth.visualPosition(), 65)
  assert.equal(smooth.historyIndex, factory.historyIndex)
  for (const scroll of [smooth, factory]) {
    scroll.move(220, 66)
  }

  assert.equal(smooth.visualPosition(), 80)
  assert.equal(smooth.position, factory.position)
  assert.equal(smooth.velocity, factory.velocity)
  smooth.move(210, 80)
  const historyIndex = smooth.historyIndex

  assert.equal(smooth.release(81), 466)
  assert.equal(smooth.animationStart, 90)
  assert.equal(smooth.historyIndex, historyIndex)
  assert.equal(smooth.visualPosition(), 90)
})

test('smooth drag respects single-page bounds and does not capture vertical gestures', () => {
  const scroll = new FactoryScrollDynamics(466, 466, 33, new FactoryPointerHistory(), true)

  scroll.begin(300, 0)
  scroll.move(250, 33, false)
  scroll.move(220, 49, false)
  assert.equal(scroll.visualPosition(), 0)
  scroll.move(200, 66, true)
  scroll.move(-1000, 82)
  assert.equal(scroll.visualPosition(), 466)
  scroll.move(500, 90)
  assert.equal(scroll.visualPosition(), -250)
})

test('LVGL integer throw decay expires at99ms and prediction preserves signed truncation', () => {
  assert.equal(factoryThrowDecay(30, 0), 30)
  assert.equal(factoryThrowDecay(30, 33), 20)
  assert.equal(factoryThrowDecay(-30, 66), -10)
  assert.equal(factoryThrowDecay(30, 99), 0)
  assert.equal(factoryThrowPredict(1), 1)
  assert.equal(factoryThrowPredict(5), 15)
  assert.equal(factoryThrowPredict(30), 217)
  assert.equal(factoryThrowPredict(-30), -217)
})

test('LVGL fixed-point ease-out retains its source quarter-step values and signed pixel rounding', () => {
  assert.deepEqual(
    [0, 25, 50, 75, 100].map((t) => factoryScrollEase(t, 100)),
    [0, 389, 702, 928, 1024],
  )
  const scroll = new FactoryScrollDynamics(466)

  scroll.animateTo(-466, 0)
  assert.equal(scroll.duration, 400)
  assert.equal(scroll.update(100), -178)
  assert.equal(scroll.update(400), -466)
  assert.equal(scroll.animating, false)
})

test('input reads coalesce moves and preserve the10px drag threshold without double history writes', () => {
  const scroll = new FactoryScrollDynamics(466)

  scroll.begin(233, 0)
  scroll.move(229, 10)
  scroll.move(224, 20)
  assert.equal(scroll.update(33), 0)
  assert.equal(scroll.dragging, false)
  scroll.move(223, 66)
  assert.equal(scroll.dragging, true)
  assert.equal(scroll.position, 1)
  assert.equal(scroll.historyIndex, 3)
  scroll.update(66)
  assert.equal(scroll.historyIndex, 3)
})

test('fast release projects momentum while stationary input reads remove throw velocity', () => {
  const fast = new FactoryScrollDynamics(466)

  fast.begin(300, 0)
  fast.move(250, 33)
  fast.move(220, 66)
  assert.equal(fast.position, 80)
  assert.equal(fast.release(70), 466)
  const held = new FactoryScrollDynamics(466)

  held.begin(300, 0)
  held.move(250, 33)
  held.move(220, 66)
  for (let t = 99; t <= 198; t += 33) {
    held.update(t)
  }

  assert.equal(held.velocity, 0)
  assert.equal(held.release(200), 0)
})

test('SCROLL_ONE clamps drag and throw to the next center and interrupted snap resumes without jumping', () => {
  const scroll = new FactoryScrollDynamics(466)

  scroll.teleport(16 * 466)
  scroll.begin(400, 0)
  scroll.move(-1400, 33)
  assert.equal(scroll.position, 17 * 466)
  assert.equal(scroll.release(40), 17 * 466)
  scroll.animateTo(18 * 466, 50)
  scroll.begin(200, 150)
  const interrupted = scroll.position

  assert.equal(scroll.animating, false)
  assert.ok(interrupted > 17 * 466 && interrupted < 18 * 466)
  scroll.move(180, 183)
  assert.equal(scroll.position, interrupted + 20)
  assert.equal(scroll.minimum, 17 * 466)
  assert.equal(scroll.maximum, 18 * 466)
})

test('factory DynamicIconLabel retains its previous alpha beyond the150px transition range', () => {
  const scroll = new FactoryScrollDynamics(466)

  scroll.teleport(70)
  assert.equal(scroll.titleOpacity(), 1)
  scroll.teleport(110)
  assert.equal(scroll.titleOpacity(), 127 / 255)
  scroll.teleport(200)
  assert.equal(scroll.titleOpacity(), 127 / 255)
  scroll.teleport(150)
  assert.equal(scroll.titleOpacity(), 0)
  scroll.teleport(466)
  assert.equal(scroll.titleOpacity(), 1)
})

test('press and recenter preserve unexpired input history while a later press decays it naturally', () => {
  const scroll = new FactoryScrollDynamics(466)

  scroll.begin(300, 0)
  scroll.move(250, 33)
  scroll.release(40)
  scroll.teleport(50)
  scroll.begin(300, 66)
  assert.equal(scroll.velocity, -33)
  scroll.move(290, 99)
  assert.equal(scroll.velocity, -26)
  assert.equal(scroll.release(100), 466)
  scroll.begin(300, 250)
  assert.equal(scroll.velocity, 0)
  assert.ok(scroll.vectors.some((vector) => vector !== 0))
  scroll.resetHistory()
  assert.ok(scroll.vectors.every((vector) => vector === 0))
})

test('dominant vertical movement cannot capture horizontal scroll, but an existing capture stays locked', () => {
  const scroll = new FactoryScrollDynamics(466)

  scroll.begin(300, 0)
  scroll.move(270, 33, false)
  assert.equal(scroll.dragging, false)
  assert.equal(scroll.position, 0)
  assert.equal(scroll.velocity, -30)
  scroll.move(250, 66, true)
  assert.equal(scroll.dragging, true)
  assert.equal(scroll.position, 20)
  scroll.move(240, 99, false)
  assert.equal(scroll.position, 30)
})

test('LVGL capture consumes the accumulated threshold and applies only the current input vector', () => {
  const scroll = new FactoryScrollDynamics(466)

  scroll.begin(100, 0)
  scroll.move(98, 33)
  scroll.move(96, 66)
  assert.equal(scroll.position, 0)
  scroll.move(90, 99)
  // find_scroll_obj resets scroll_sum; scroll_handler still uses vect.x=-6.
  assert.equal(scroll.dragging, true)
  assert.equal(scroll.position, 6)
  scroll.move(85, 132)
  assert.equal(scroll.position, 11)
})

test('Profiler fractions truncate each timestamp before computing integer LVGL elapsed time', () => {
  const fractional = new FactoryScrollDynamics(466)
  const integer = new FactoryScrollDynamics(466)

  fractional.begin(300, 0.9)
  integer.begin(300, 0)
  fractional.move(250, 33.1)
  integer.move(250, 33)
  assert.equal(fractional.position, integer.position)
  assert.equal(fractional.historyIndex, integer.historyIndex)
  assert.equal(fractional.readAt, 33)
  fractional.move(220, 66.8)
  integer.move(220, 66)
  assert.equal(fractional.velocity, integer.velocity)
  assert.equal(fractional.release(70.9), integer.release(70))
  assert.equal(fractional.animationAt, 70)
  for (const time of [71.1, 170.9, 200.4, 470.7]) {
    assert.equal(fractional.update(time), integer.update(Math.trunc(time)))
  }

  assert.equal(factoryThrowDecay(512, 98.9), factoryThrowDecay(512, 98))
  fractional.animateTo(932, 500.9)
  integer.animateTo(932, 500)
  assert.equal(fractional.update(550.1), integer.update(550))
})
