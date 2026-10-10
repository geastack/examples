import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import * as scroll from '../lib/scroll.ts'

const exports = {}
const source = readFileSync(new URL('../common/roller/dynamics.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText

vm.runInNewContext(compiled, {
  exports,
  require: (name) => {
    assert.equal(name, '../../lib/scroll')

    return scroll
  },
})
const { RollerDynamics, rollerEaseOut, rollerThrowDistance } = exports

const geometry = (count = 24, infinite = true) => ({
  count,
  fontHeight: 30,
  optionsFontHeight: 16,
  lineSpace: 16,
  letterSpace: 0,
  height: 164,
  padding: 24,
  animationMs: 200,
  infinite,
})
const roller = (selected = 10, infinite = true, count = 24) =>
  new RollerDynamics(geometry(count, infinite), selected)

test('gliding picker travels farther, coasts past 200ms, settles and can be interrupted', () => {
  const free = new RollerDynamics({ ...geometry(17, false), glide: true }, 4)
  const factory = roller(4, false, 17)
  for (const value of [free, factory]) {
    value.press(220, 0)
    value.move(200, 16)
    value.move(180, 32)
    value.release(42, 32)
  }
  assert.ok(free.selected > factory.selected)
  free.update(232)
  assert.equal(free.animating, true)
  const position = free.position
  free.press(180, 232)
  assert.equal(free.position, position)
  assert.equal(free.animating, false)
  free.move(190, 248)
  free.release(52, 248)
  free.update(3248)
  assert.equal(free.offset, 0)
  assert.ok(free.selected >= 0 && free.selected < 17)
})

test('glide preserves release velocity and decays by elapsed time before snapping', () => {
  const make = () => {
    const history = new scroll.FactoryPointerHistory(true)
    const value = new RollerDynamics({ ...geometry(60, false), glide: true }, 20, history)
    value.press(220, 0)
    value.move(204, 16)
    value.move(188, 32)
    value.move(172, 48)
    const launch = (history.velocity / 49.5) * 1.25
    value.release(34, 48)
    return { value, launch }
  }
  const { value, launch } = make()
  const released = value.position
  value.update(64)
  assert.ok(Math.abs((value.position - released) / 16 - launch) < Math.abs(launch) * 0.03)
  value.update(448)
  const other = make().value
  for (let time = 56; time <= 448; time += 8) other.update(time)
  assert.ok(Math.abs(value.position - other.position) < 0.001)
  value.update(4048)
  assert.equal(value.offset, 0)
  assert.equal(value.animating, false)
})

test('continuous momentum retains short flicks and stationary polls only age movement', () => {
  const sample = (interval) => {
    const history = new scroll.FactoryPointerHistory(true)
    history.sample(0, 0)
    for (let time = interval; time <= 96; time += interval) history.sample(-interval, time)
    return history
  }
  const fast = sample(8)
  const slow = sample(16)
  assert.ok(Math.abs(fast.velocity - slow.velocity) <= 4)
  const early = new scroll.FactoryPointerHistory(true)
  early.sample(0, 0)
  assert.ok(early.sample(-8, 8) < 0)
  const flick = new scroll.FactoryPointerHistory(true)
  flick.sample(0, 0)
  flick.sample(-20, 16)
  assert.equal(flick.sample(-20, 32), -36)
  for (let i = 0; i < 20; i++) flick.sample(0, 32)
  assert.equal(flick.velocity, -36)
  assert.equal(flick.sample(0, 132), 0)
  fast.sample(0, 400)
  assert.equal(Math.abs(fast.velocity), 0)
})

test('finite selector follows intermediate pointer updates and releases without jumping', () => {
  const value = roller(8, false, 17)
  const sampled = roller(8, false, 17)
  value.press(220, 0)
  sampled.press(220, 0)
  const initial = value.position
  value.preview(210)
  assert.equal(value.visualPosition, initial - 10)
  value.preview(200)
  assert.equal(value.visualPosition, initial - 20)
  value.move(190, 33)
  sampled.move(190, 33)
  assert.equal(value.visualPosition, sampled.position)
  value.preview(180)
  const visible = value.visualPosition
  value.release(42, 49)
  assert.equal(value.position, visible)
  value.update(49)
  assert.equal(value.position, visible)
  value.update(249)
  assert.equal(value.offset, 0)
  assert.ok(value.selected >= 0 && value.selected < 17)
})

test('factory roller geometry and initial selected page', () => {
  const value = roller(23)

  assert.equal(value.selected, 23)
  assert.equal(value.pitch, 46)
  assert.equal(value.pageCount, 3)
  assert.equal(value.expandedCount, 72)
  assert.equal(value.position, 67 - 47 * 46)
  assert.equal(value.offset, 0)
  assert.equal(value.anchor, 23)
})

test('slow short drag snaps back but fast short fling selects multiple rows immediately', () => {
  const slow = roller()

  slow.press(100, 0)
  slow.move(95, 150)
  slow.move(95, 300)
  slow.release(95, 300)
  assert.equal(slow.selected, 10)
  assert.equal(slow.offset, -5)
  assert.equal(slow.animating, true)
  slow.update(500)
  assert.equal(slow.offset, 0)

  const fast = roller()

  fast.press(100, 0)
  fast.move(80, 16)
  fast.move(60, 32)
  // Last8 history: -20 + trunc(-20*(512-trunc(512*16/99))/512) = -36.
  // Integer .9 throw trace: 36,32,28,25,22,19,17,15,13,11,9,8,7,6,5,4,3,2,1.
  assert.equal(rollerThrowDistance(-36), -263)
  fast.release(60, 32)
  assert.equal(fast.selected, 16)
  assert.equal(fast.anchor, 11)
  assert.equal(fast.residual, 6)
  assert.equal(fast.offset, 236)
  fast.update(232)
  assert.equal(fast.selected, 16)
  assert.equal(fast.offset, 0)
})

test('stationary input polls erase momentum and drag does not commit selection', () => {
  const value = roller()

  value.press(100, 0)
  value.move(80, 16)
  value.move(60, 32)
  assert.equal(value.selected, 10)
  assert.equal(value.anchor, 11)
  assert.equal(value.residual, 6)
  for (let now = 48; now <= 160; now += 16) {
    value.move(60, now)
  }

  value.release(60, 160)
  assert.equal(value.selected, 11)
  value.update(360)
  assert.equal(value.offset, 0)
})

test('finite roller drags freely but release clamps first and last options', () => {
  for (const [start, end, selected] of [
    [100, 1000, 0],
    [100, -1000, 16],
  ]) {
    const value = roller(8, false, 17)

    value.press(start, 0)
    value.move(end, 16)
    assert.equal(value.position, 67 - 8 * 46 + end - start)
    value.release(end, 16)
    assert.equal(value.selected, selected)
    value.update(216)
    assert.equal(value.offset, 0)
  }
})

test('infinite wrap preserves animation direction and recenters only at completion', () => {
  const value = roller(23)
  const original = value.position

  value.setSelected(0, 0, true)
  assert.equal(value.selected, 0)
  assert.equal(value.position, original)
  value.update(199)
  assert.equal(value.animating, true)
  assert.ok(value.position < original)
  value.update(200)
  assert.equal(value.position, 67 - 24 * 46)
  assert.equal(value.offset, 0)
  assert.equal(value.animating, false)
})

test('tap selects its row and any nonzero pointer move is a drag', () => {
  const value = roller()

  value.press(130, 0)
  value.release(130, 0)
  assert.equal(value.selected, 11)
  const spacing = roller()

  spacing.press(98, 0)
  spacing.release(98, 0)
  assert.equal(spacing.selected, 11)
  const dragged = roller()

  dragged.press(130, 0)
  dragged.move(131, 100)
  dragged.move(131, 220)
  dragged.release(131, 220)
  assert.equal(dragged.moved, true)
  assert.equal(dragged.selected, 10)
})

test('press interrupts snap at its current position; single option does not move', () => {
  const value = roller()

  value.setSelected(12, 0)
  value.update(80)
  const interrupted = value.position

  value.press(100, 80)
  assert.equal(value.position, interrupted)
  assert.equal(value.animating, false)
  assert.equal(value.update(200), false)
  value.move(110, 96)
  assert.equal(value.position, interrupted + 10)
  const single = roller(0, false, 1)

  single.press(100, 0)
  single.move(0, 16)
  single.release(0, 16)
  assert.equal(single.position, 67)
  assert.equal(single.selected, 0)
})

test('integer throw loses subpixel tails and ease-out follows the LVGL fixed-point path', () => {
  assert.equal(rollerThrowDistance(0), 0)
  assert.equal(rollerThrowDistance(1), 1)
  assert.equal(rollerThrowDistance(-1), -1)
  assert.equal(rollerThrowDistance(10), 55)
  assert.equal(rollerThrowDistance(-10), -55)
  assert.equal(rollerEaseOut(0, 200), 0)
  assert.equal(rollerEaseOut(200, 200), 1024)
  let previous = 0

  for (let time = 1; time <= 200; time++) {
    const value = rollerEaseOut(time, 200)

    assert.ok(value >= previous)
    assert.ok(value <= 1024)
    previous = value
  }

  assert.equal(rollerEaseOut(100, 200), 702)
  assert.ok(Math.abs(rollerEaseOut(100, 200) / 1024 - 0.6846) < 0.003)
})

test('reset changes a date range and cancels motion without erasing global input history', () => {
  const configuration = geometry(31)
  const history = new scroll.FactoryPointerHistory()
  const value = new RollerDynamics(configuration, 30, history)

  value.press(100, 0)
  value.move(60, 16)
  value.release(60, 16)
  value.reset(28, 27, 20)
  assert.equal(history.velocity, -40)
  assert.equal(configuration.count, 31)
  assert.equal(value.expandedCount, 84)
  assert.equal(value.selected, 27)
  assert.equal(value.position, 67 - 55 * 46)
  assert.equal(value.animating, false)
  assert.equal(value.pressed, false)
  assert.equal(value.moved, false)
  value.press(100, 21)
  value.move(99, 37)
  assert.equal(history.velocity, -32)
  value.release(99, 37)
  assert.equal(value.selected, 4)
})

test('infinite page count uses the font when options were installed, not final text size', () => {
  const month = new RollerDynamics(geometry(12), 11)

  assert.equal(month.pageCount, 5)
  assert.equal(month.expandedCount, 60)
  assert.equal(month.position, 67 - 35 * 46)
  const dayGeometry = geometry(31)

  dayGeometry.optionsFontHeight = 30
  const day = new RollerDynamics(dayGeometry, 30)

  assert.equal(day.pageCount, 3)
  assert.equal(day.pitch, 46)
})

test('expanded infinite endpoints leave absent rows blank until snap recenters', () => {
  const value = roller(0, true, 12)

  value.press(100, 0)
  value.move(10000, 33)
  assert.equal(value.anchor, 0)
  assert.equal(value.hasRow(-1), false)
  assert.equal(value.hasRow(0), true)
  value.release(10000, 33)
  assert.equal(value.selected, 0)
  value.update(233)
  assert.equal(value.hasRow(-1), true)
  assert.equal(value.offset, 0)
  value.press(100, 300)
  value.move(-10000, 333)
  assert.equal(value.anchor, 11)
  assert.equal(value.hasRow(1), false)
  value.release(-10000, 333)
  assert.equal(value.selected, 11)
  value.update(533)
  assert.equal(value.hasRow(1), true)
  const finite = roller(0, false, 17)

  assert.equal(finite.hasRow(-1), false)
  finite.setSelected(16, 0, false)
  assert.equal(finite.hasRow(1), false)
})

test('animation samples truncate absolute millisecond ticks before elapsed subtraction', () => {
  const value = roller()

  value.setSelected(12, 0.9)
  const start = value.position

  value.update(100)
  assert.equal(value.position, start + ((702 * -92) >> 10))
  value.update(200)
  assert.equal(value.animating, false)
  assert.equal(value.offset, 0)
})

test('rapid gestures on different rollers share the input-device momentum trace', () => {
  const history = new scroll.FactoryPointerHistory()
  const first = new RollerDynamics(geometry(), 10, history)
  const second = new RollerDynamics(geometry(), 10, history)

  first.press(100, 0)
  first.move(50, 33)
  first.release(50, 33)
  second.press(100, 66)
  // Previous -50 sample aged33ms: trunc(-50*(512-trunc(512*33/99))/512)=-33.
  assert.equal(history.velocity, -33)
  second.move(90, 99)
  // Previous sample aged66ms contributes -16; current -10 yields -26.
  assert.equal(history.velocity, -26)
  second.release(90, 99)
  assert.equal(second.selected, 14)
  const isolated = roller()

  isolated.press(100, 66)
  isolated.move(90, 99)
  isolated.release(90, 99)
  assert.equal(isolated.selected, 11)
})

test('global history expires after99ms and the same carrier supports launcher samples', () => {
  const history = new scroll.FactoryPointerHistory()
  const first = new RollerDynamics(geometry(), 10, history)
  const second = new RollerDynamics(geometry(), 10, history)

  first.press(100, 0)
  first.move(50, 33)
  first.release(50, 33)
  second.press(100, 132)
  assert.equal(history.velocity, 0)
  second.move(90, 165)
  second.release(90, 165)
  assert.equal(second.selected, 11)
  const launcher = new scroll.FactoryScrollDynamics(466, 466, 33, history)

  launcher.begin(300, 198)
  assert.equal(launcher.velocity, -6)
  assert.equal(launcher.historyIndex, history.index)
  launcher.teleport(0)
  assert.equal(history.velocity, -6)
  launcher.resetHistory()
  assert.equal(history.velocity, 0)
})
