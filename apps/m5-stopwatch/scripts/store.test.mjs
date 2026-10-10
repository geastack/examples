import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import * as animation from '../apps/app_watch_face/view/animation.ts'

function setup(options = {}) {
  let time = new Date(2026, 9, 5, 8, 29, 0).getTime()
  let beeps = 0
  let toneCalls = []
  let badgeEditing = true
  const badgeSteps = []
  let settings = new Map(options.settings ?? [])
  let charging = false
  let brightnessCalls = []
  let volumeCalls = []
  let audioVolume = 80
  let spectrumValues = Array(20).fill(0)
  let randomIndex = 0
  const randomMath = Object.create(Math)

  randomMath.random = () => options.random?.[randomIndex++] ?? 0.5
  let saved = []
  let monotonicTime
  const services = {
    initBadge() {},
    setting: (key, fallback) => settings.get(key) ?? fallback,
    saveSetting: (key, value) => settings.set(key, value),
    tone(frequency, duration) {
      if (frequency > 0 && audioVolume <= 0) {
        return
      }

      toneCalls.push([frequency, duration])
      beeps++
    },
    spectrum: (band) => spectrumValues[band],
    peak: () => 0,
    microphone: () => Promise.resolve(),
    editBadge: () => true,
    closeBadge() {},
    editingBadge: () => badgeEditing,
    badgePath: () => '',
    badgeStep: (direction) => badgeSteps.push(direction),
    apName: () => 'M5StopWatch-0B98',
    loadAlarms: () => [],
    saveAlarms: (alarms) => {
      saved = alarms.map((alarm) => ({ ...alarm }))
    },
    bootSound() {},
  }
  const frames = new Map()
  let nextFrame = 1
  const timers = new Map()
  let nextTimer = 1

  class Component {
    constructor(props = {}) {
      this.props = props
    }
  }

  const core = {
    Component,
    ReactiveComponent: Component,
    Store: class {},
    Audio: {
      setVolume: (value) => {
        audioVolume = value
        volumeCalls.push(value)
      },
    },
    Battery: { level: () => 75, charging: () => charging },
    Clock: {
      epochMs: () => time,
      setEpochMs: (value) => {
        time = value

        return true
      },
    },
    Haptics: { vibrate() {} },
    Profiler: { nowUs: () => (monotonicTime ?? watch.now) * 1000 },
    Display: { setBrightness: (value) => brightnessCalls.push(value) },
    Accelerometer: {
      start() {},
      accelerationX: 0,
      accelerationY: 0,
      accelerationZ: 9.80665,
      gyroscopeX: 0,
      gyroscopeY: 0,
      gyroscopeZ: 0,
    },
  }
  const cache = new Map()
  const root = fileURLToPath(new URL('../', import.meta.url))

  function loadModule(filename) {
    const absolute = path.resolve(root, filename)

    if (/\.(css|png|jpg|jpeg|wav)$/.test(absolute)) {
      return { default: absolute }
    }

    const file = ['', '.ts', '.tsx']
      .map((extension) => absolute + extension)
      .find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile())

    assert.ok(file, 'Missing test module: ' + filename)
    if (cache.has(file)) {
      return cache.get(file).exports
    }

    const module = { exports: {} }

    cache.set(file, module)
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      fileName: file,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React,
        jsxFactory: '__jsx',
      },
    }).outputText

    vm.runInNewContext(
      source,
      {
        exports: module.exports,
        module,
        require: (name) => {
          if (name === '@geastack/core') {
            return core
          }

          const target = path.resolve(path.dirname(file), name)

          if (
            ['audio', 'badge', 'settings'].some(
              (service) => target === path.join(root, 'lib', service),
            )
          ) {
            return services
          }

          return loadModule(target)
        },
        Date,
        Math: randomMath,
        console,
        __jsx: (type, props, ...children) => ({ type, props: props ?? {}, children }),
        requestAnimationFrame: (callback) => {
          const id = nextFrame++

          frames.set(id, callback)

          return id
        },
        cancelAnimationFrame: (id) => frames.delete(id),
        setTimeout: (callback, delay) => {
          const id = nextTimer++

          timers.set(id, { callback, at: (monotonicTime ?? watch.now) + delay })

          return id
        },
        clearTimeout: (id) => timers.delete(id),
      },
      { filename: file },
    )

    return module.exports
  }

  const watch = loadModule('stores/SystemStore').system
  const launcher = loadModule('apps/app_launcher/store').launcher
  const watchFace = loadModule('apps/app_watch_face/store').watchFace
  const stopwatch = loadModule('apps/app_stopwatch/store').stopwatch
  const imuStore = loadModule('apps/app_imu/store').imu
  const fft = loadModule('apps/app_fft/store').fft
  const luckyWheel = loadModule('apps/app_lucky_wheel/store').luckyWheel
  const alarmClock = loadModule('apps/app_alarm_clock/store').alarmClock
  const settingsStore = loadModule('apps/app_setup/store').setup
  const badge = loadModule('apps/app_badge/store').badge
  const battery = loadModule('common/status_bar/store').battery

  watch.init()
  watch.home()

  return {
    watch,
    launcher,
    watchFace,
    stopwatch,
    imuStore,
    fft,
    luckyWheel,
    alarmClock,
    settingsStore,
    badge,
    battery,
    component: (filename, name, props = {}) => {
      const instance = new (loadModule(filename)[name])(props)

      if (instance.created) {
        instance.created(props)
      }

      if (instance.onAfterRender) {
        instance.onAfterRender()
      }

      return instance
    },
    frame: (timestamp) => {
      monotonicTime = timestamp
      watch.tick(timestamp)
      for (const [id, timer] of [...timers]) {
        if (timer.at <= timestamp && timers.has(id)) {
          timers.delete(id)
          timer.callback()
        }
      }

      const callbacks = [...frames.values()]

      frames.clear()
      for (const callback of callbacks) {
        callback(timestamp)
      }
    },
    imu: core.Accelerometer,
    setTime: (value) => (time = value),
    getTime: () => time,
    setCharging: (value) => (charging = value),
    setSpectrum: (values) => (spectrumValues = values),
    getBrightnessCalls: () => brightnessCalls,
    getVolumeCalls: () => volumeCalls,
    setMonotonicTime: (value) => (monotonicTime = value),
    settings,
    getSaved: () => saved,
    badgeSteps,
    getBeeps: () => beeps,
    getToneCalls: () => toneCalls,
    setBadgeEditing: (value) => (badgeEditing = value),
  }
}

function pointer(x, y = 233) {
  return {
    clientX: x,
    clientY: y,
    stopped: false,
    stopPropagation() {
      this.stopped = true
    },
  }
}

function launcherView(context) {
  return context.component('apps/app_launcher/view/view', 'Launcher')
}

function sliderView(context) {
  return context.component('apps/app_setup/workers/slider', 'Slider')
}

function appView(context) {
  return context.component('apps/apps', 'App')
}

function watchView(context) {
  return context.component('apps/app_watch_face/view/watch_face_manager', 'WatchFaceManager')
}

function badgeView(context) {
  return context.component('apps/app_badge/view/badge', 'Badge')
}

function rollerView(context, field) {
  return context.component('common/roller/Roller', 'Roller', { field })
}

test('real UI store records unlimited laps and resumes without including paused time', () => {
  const { watch, stopwatch } = setup()

  watch.screen = 'stopwatch'
  watch.tick(100)
  stopwatch.right()
  watch.tick(2100)
  stopwatch.left()
  stopwatch.right()
  assert.equal(stopwatch.elapsed, 'OO:OO:O2.OO')
  watch.tick(10000)
  stopwatch.right()
  watch.tick(10500)
  stopwatch.left()
  stopwatch.right()
  assert.equal(stopwatch.elapsed, 'OO:OO:O2.5O')
  assert.equal(stopwatch.laps.length, 2)
  assert.equal(stopwatch.laps[0].id, 2)
  assert.equal(stopwatch.laps[0].text, 'OO:OO:O2.5O')
  stopwatch.left()
  assert.equal(stopwatch.swState, 0)
  assert.equal(stopwatch.laps.length, 0)
})

test('stopwatch actions measure monotonic time while rendering is stalled', () => {
  const { watch, setMonotonicTime, stopwatch } = setup()

  watch.screen = 'stopwatch'
  watch.tick(100)
  setMonotonicTime(1000)
  stopwatch.right()
  setMonotonicTime(2500)
  stopwatch.left()
  assert.equal(stopwatch.laps[0].text, 'OO:OO:O1.5O')
  setMonotonicTime(3000)
  stopwatch.right()
  assert.equal(stopwatch.swState, 2)
  assert.equal(stopwatch.elapsed, 'OO:OO:O2.OO')
  setMonotonicTime(8000)
  stopwatch.right()
  setMonotonicTime(8500)
  stopwatch.left()
  assert.equal(stopwatch.laps[0].text, 'OO:OO:O2.5O')
  setMonotonicTime(9000)
  stopwatch.right()
  assert.equal(stopwatch.elapsed, 'OO:OO:O3.OO')
  assert.equal(watch.now, 100)
  stopwatch.left()
  assert.equal(stopwatch.elapsed, 'OO:OO:OO.OO')
})

test('daily alarms persist, ring in another tool, dismiss and do not retrigger that day', () => {
  const { watch, setTime, getSaved, getBeeps, alarmClock } = setup()

  alarmClock.adjustHour = 8
  alarmClock.adjustMinute = 30
  alarmClock.confirmAlarm()
  assert.equal(getSaved().length, 1)
  watch.screen = 'watch'
  setTime(new Date(2026, 9, 5, 8, 30).getTime())
  watch.tick(1000)
  assert.equal(alarmClock.ringing, true)
  assert.ok(getBeeps() > 0)
  alarmClock.dismissAlarm()
  watch.tick(2000)
  assert.equal(alarmClock.ringing, false)
  alarmClock.askDelete(alarmClock.alarms[0].id)
  alarmClock.deleteAlarm()
  assert.equal(getSaved().length, 0)
})
test('native home key returns home without triggering either single button action', () => {
  const context = setup()
  const { watch, stopwatch, launcher } = context
  const app = appView(context)

  watch.screen = 'stopwatch'
  watch.tick(0)
  app.handleKey(27)
  assert.equal(watch.screen, 'menu')
  assert.equal(stopwatch.swState, 0)
  assert.equal(launcher.menuIndex, 0)
})

test('native button events, badge editor, theme navigation, date clamping and hidden screen', () => {
  const context = setup()
  const { watch, launcher, watchFace, badge, settingsStore } = context

  launcherView(context)
  const app = appView(context)

  app.handleKey(39)
  context.frame(100)
  assert.equal(launcher.menuIndex, 0)
  context.frame(400)
  assert.equal(launcher.menuIndex, 1)
  launcher.open()
  assert.equal(watch.screen, 'watch')
  watch.go(1)
  watchView(context).tap()
  assert.equal(watchFace.theme, 1)
  watch.screen = 'badge'
  const badgeComponent = badgeView(context)

  badgeComponent.pointerDown(pointer(233, 233))
  context.frame(watch.now + 400)
  badgeComponent.pointerUp(pointer(233, 233))
  watch.confirmDialog()
  assert.equal(watch.screen, 'badge-edit')
  assert.equal(badge.ap, 'M5StopWatch-0B98')
  settingsStore.adjustYear = 2024
  settingsStore.adjustMonth = 2
  settingsStore.adjustDay = 29
  settingsStore.changeValue('year', 1)
  assert.equal(settingsStore.adjustDay, 28)
  for (let n = 0; n < 10; n++) {
    settingsStore.versionTap()
  }

  assert.equal(watch.screen, 'about')
})

test('IMU uses gyro magnitude for size and integrates yaw independently of gravity', () => {
  const { watch, imu, imuStore } = setup()

  watch.screen = 'imu'
  watch.tick(0)
  watch.tick(100)
  assert.equal(imuStore.ballSize, 80)
  assert.equal(imuStore.yaw, 0)
  imu.gyroscopeZ = 180
  watch.tick(200)
  watch.tick(300)
  assert.ok(imuStore.ballSize > 80)
  assert.ok(Math.abs(imuStore.yaw - 36) < 0.0001)
})

test('Simple long press toggles the dot without cycling the color theme', () => {
  const context = setup()
  const { watch, watchFace } = context
  const view = watchView(context)

  watch.screen = 'watch'
  watchFace.face = 3
  view.pointerDown(pointer(233, 233))
  context.frame(600)
  view.pointerUp(pointer(233, 233))
  view.tap()
  assert.equal(watchFace.secondDot, false)
  assert.equal(watchFace.theme, 0)
  view.pointerDown(pointer(233, 233))
  view.pointerUp(pointer(233, 233))
  view.tap()
  assert.equal(watchFace.theme, 1)
})

test('classic hand angles match the factory clock including hour seconds', () => {
  const { watch, setTime, watchFace, luckyWheel } = setup()

  setTime(new Date(2026, 9, 5, 19, 34, 12).getTime())
  watch.screen = 'watch'
  watchFace.face = 2
  watch.tick(1000)
  watch.tick(1016)
  assert.ok(Math.abs(Number(watchFace.hourRotation.slice(7, -4)) - 137.1) < 0.0001)
  assert.ok(Math.abs(Number(watchFace.minuteRotation.slice(7, -4)) - 115.2) < 0.0001)

  luckyWheel.options = 2
  luckyWheel.selectOptions()
  assert.equal(luckyWheel.wheelLabels[0].rotation, 'rotate(270deg)')
  assert.equal(luckyWheel.wheelLabels[1].rotation, 'rotate(450deg)')
})

test('FFT preserves hidden presentation strings while time progresses and active screens refresh immediately', () => {
  const context = setup()
  const { watch, setTime, watchFace, luckyWheel, settingsStore } = context
  const slider = sliderView(context)

  watch.screen = 'watch'
  watch.tick(1000)
  watch.tick(1016)
  const secondRotation = watchFace.secondRotation
  const minuteRotation = watchFace.minuteRotation
  const hourRotation = watchFace.hourRotation
  const pointerRotation = luckyWheel.pointerRotation
  const themeBg = watchFace.themeBg
  const secondsAngle = watchFace.secondsAngle

  watch.screen = 'fft'
  watchFace.theme = 1
  settingsStore.brightness = 42
  settingsStore.speakerVolume = 13
  luckyWheel.angle = 120
  setTime(new Date(2026, 9, 5, 19, 34, 12).getTime())
  watch.tick(2000)
  watch.tick(2016)
  assert.equal(watchFace.secondRotation, secondRotation)
  assert.equal(watchFace.minuteRotation, minuteRotation)
  assert.equal(watchFace.hourRotation, hourRotation)
  assert.equal(luckyWheel.pointerRotation, pointerRotation)
  assert.equal(watchFace.themeBg, themeBg)
  assert.equal(watchFace.secondsAngle, secondsAngle)

  watch.screen = 'watch'
  watch.tick(2032)
  assert.ok(Math.abs(Number(watchFace.hourRotation.slice(7, -4)) - 137.1) < 0.0001)
  assert.ok(Math.abs(Number(watchFace.minuteRotation.slice(7, -4)) - 115.2) < 0.0001)
  assert.notEqual(watchFace.secondRotation, secondRotation)
  assert.notEqual(watchFace.themeBg, themeBg)
  watch.screen = 'wheel'
  watch.tick(2048)
  assert.equal(luckyWheel.pointerRotation, 'rotate(120deg)')
  watch.screen = 'brightness'
  watch.tick(2064)
  assert.equal(slider.width, ((42 - 10) * 374) / 90)
  watch.screen = 'volume'
  watch.tick(2080)
  assert.equal(slider.width, (13 * 374) / 100)
})

test('factory settings clamp loaded values, normalize workers and map the brightness range', () => {
  const context = setup({
    settings: [
      ['brightness', -4],
      ['volume', 150],
    ],
  })

  const { watch, getBrightnessCalls, getVolumeCalls, settingsStore } = context
  const slider = sliderView(context)

  assert.equal(settingsStore.brightness, 10)
  assert.equal(settingsStore.speakerVolume, 100)
  assert.equal(getBrightnessCalls()[0], 10)
  assert.equal(getVolumeCalls()[0], 100)
  settingsStore.settingScreen('brightness')
  slider.pointerDown(pointer(46))
  watch.tick(16)
  assert.equal(settingsStore.brightness, 10)
  assert.equal(slider.width, 0)
  slider.pointerMove(pointer(233))
  watch.tick(32)
  assert.equal(settingsStore.brightness, 55)
  assert.equal(slider.width, 187)
  slider.pointerMove(pointer(420))
  assert.equal(settingsStore.brightness, 100)
  slider.pointerUp(pointer(420))
  settingsStore.speakerVolume = 13
  settingsStore.settingScreen('volume')
  assert.equal(settingsStore.speakerVolume, 15)
  slider.pointerDown(pointer(46))
  assert.equal(settingsStore.speakerVolume, 0)
  slider.pointerMove(pointer(420))
  assert.equal(settingsStore.speakerVolume, 100)
})

test('accepting one factory settings worker does not persist canceled live changes from another', () => {
  const { watch, settings, getTime, setTime, settingsStore } = setup()

  settingsStore.settingScreen('brightness')
  settingsStore.setPercentage(35)
  watch.home()
  settingsStore.settingScreen('volume')
  settingsStore.setPercentage(40)
  settingsStore.saveSettings()
  assert.equal(settings.get('volume'), 40)
  assert.equal(settings.has('brightness'), false)
  assert.equal(settings.has('sfx'), false)
  settingsStore.settingScreen('button')
  settingsStore.toggleSfx()
  settingsStore.saveSettings()
  assert.equal(settings.get('sfx'), 0)
  assert.equal(settings.get('vibration'), 1)
  assert.equal(settings.has('brightness'), false)
  setTime(new Date(2026, 9, 5, 8, 29, 0).getTime())
  settingsStore.settingScreen('set-time')
  settingsStore.adjustHour = 23
  settingsStore.adjustMinute = 7
  settingsStore.adjustSecond = 9
  assert.equal(settingsStore.adjustTimeSummary, '23:07:09')
  const before = new Map(settings)

  settingsStore.saveSettings()
  assert.deepEqual(settings, before)
  assert.equal(new Date(getTime()).getDate(), 5)
  assert.equal(new Date(getTime()).getHours(), 23)
  settingsStore.settingScreen('set-date')
  settingsStore.adjustYear = 2024
  settingsStore.adjustMonth = 2
  settingsStore.adjustDay = 29
  assert.equal(settingsStore.adjustDateSummary, '2024-02')
  settingsStore.saveSettings()
  assert.equal(watch.screen, 'set-date')
  assert.equal(settingsStore.adjustDateSummary, '2024-02-29')
  settingsStore.saveSettings()
  assert.deepEqual(settings, before)
  assert.equal(new Date(getTime()).getDate(), 29)
  assert.equal(new Date(getTime()).getHours(), 23)
})

test('factory watch dates, face defaults and exact60px last-pressed-point swipe', () => {
  const context = setup()
  const { watch, setTime, launcher, watchFace } = context
  const view = watchView(context)

  setTime(new Date(2026, 9, 5, 8, 29, 0).getTime())
  launcher.menuIndex = 1
  launcher.open()
  assert.equal(watchFace.faceHour + ':' + watchFace.faceMinute, '08:29')
  assert.equal(watchFace.faceDate, '2026/10/5 MON')
  assert.equal(watchFace.faceWeekday, 'MON')
  watchFace.classicMode = 2
  view.pointerDown(pointer(200, 200))
  view.pointerMove(pointer(140, 200))
  view.pointerUp(pointer(200, 200))
  assert.equal(watchFace.face, 1)
  assert.equal(watchFace.theme, 0)
  assert.equal(watchFace.classicMode, 0)
  watchFace.theme = 8
  watch.go(1)
  assert.equal(watchFace.theme, 0)
  watch.go(1)
  watchFace.secondDot = false
  watch.go(1)
  watch.go(-1)
  assert.equal(watchFace.secondDot, true)
})

test('Simple hold fires while pressed once, never renews its entry hint, and scrolling cancels it', () => {
  const context = setup()
  const { watch, launcher, watchFace } = context
  const view = watchView(context)

  launcher.menuIndex = 1
  launcher.open()
  watch.go(-1)
  assert.equal(watchFace.face, 3)
  const hideAt = watchFace.simpleHintUntil

  view.pointerDown(pointer(233, 233))
  context.frame(399)
  assert.equal(watchFace.secondDot, true)
  context.frame(400)
  assert.equal(watchFace.secondDot, false)
  context.frame(900)
  assert.equal(watchFace.secondDot, false)
  assert.equal(watchFace.simpleHintUntil, hideAt)
  view.pointerUp(pointer(233, 233))
  view.tap()
  assert.equal(watchFace.theme, 0)
  view.pointerDown(pointer(233, 233))
  view.pointerMove(pointer(245, 233))
  context.frame(1500)
  assert.equal(watchFace.secondDot, false)
})

test('native navigation acts on short release, stopwatch on press, and Home suppresses combination releases', () => {
  const context = setup()
  const { watch, setMonotonicTime, launcher, stopwatch, alarmClock } = context

  launcherView(context)
  const app = appView(context)

  setMonotonicTime(1000)
  app.keyDown(39)
  assert.equal(launcher.menuIndex, 0)
  setMonotonicTime(1200)
  app.keyUp(39)
  assert.equal(launcher.menuIndex, 0)
  context.frame(1200)
  context.frame(1600)
  assert.equal(launcher.menuIndex, 1)
  setMonotonicTime(1800)
  app.keyDown(37)
  setMonotonicTime(2400)
  app.keyUp(37)
  assert.equal(launcher.menuIndex, 1)
  watch.screen = 'stopwatch'
  setMonotonicTime(2600)
  app.keyDown(39)
  assert.equal(stopwatch.swState, 1)
  app.keyDown(37)
  app.keyDown(27)
  app.keyUp(37)
  app.keyUp(39)
  assert.equal(watch.screen, 'menu')
  assert.equal(launcher.menuIndex, 1)
  alarmClock.ringing = true
  app.keyDown(27)
  app.handleKey(39)
  watch.go(1)
  launcher.open()
  assert.equal(watch.screen, 'menu')
  assert.equal(launcher.menuIndex, 1)
})

test('stationary alarm hold opens its dialog while pressed and scrolling cancels the hold', () => {
  const context = setup()
  const { watch } = context
  const list = context.component('apps/app_alarm_clock/view/alarm_list', 'AlarmList')

  watch.screen = 'alarms'
  list.beginHold(pointer(100, 100), 1)
  context.frame(399)
  assert.equal(watch.dialog, '')
  context.frame(400)
  assert.equal(watch.dialog, 'delete')
  watch.cancelDialog()
  list.pointerUp(pointer(100, 100))
  list.beginHold(pointer(100, 100), 2)
  list.moveHold(pointer(100, 112))
  context.frame(900)
  assert.equal(watch.dialog, '')
})

test('NumberFlow rolls only changed digits, reverses at clock wrap, and recreates its defaults', () => {
  const { watch, setTime, launcher, watchFace } = setup()

  setTime(new Date(2026, 9, 5, 8, 29, 3).getTime())
  launcher.menuIndex = 1
  launcher.open()
  watch.go(1)
  watch.tick(2000)
  const tens = watchFace.numberFlowDigits[4].y
  const ones = watchFace.numberFlowDigits[5].y

  setTime(new Date(2026, 9, 5, 8, 29, 4).getTime())
  watch.tick(3001)
  watch.tick(3200)
  assert.equal(watchFace.numberFlowDigits[4].y, tens)
  assert.ok(watchFace.numberFlowDigits[5].y > ones)
  setTime(new Date(2026, 9, 5, 8, 29, 59).getTime())
  watch.tick(4002)
  watch.tick(4900)
  const beforeWrap = watchFace.numberFlowDigits[5].y

  setTime(new Date(2026, 9, 5, 8, 30, 0).getTime())
  watch.tick(5003)
  watch.tick(5200)
  assert.ok(watchFace.numberFlowDigits[5].y < beforeWrap)
  watchFace.theme = 7
  watch.go(1)
  watch.go(-1)
  assert.equal(watchFace.theme, 0)
  assert.equal(watchFace.numberFlowDigits[5].opacity, 0)
})

test('factory springs are time-based, retain retarget velocity and unwrap both angle directions', () => {
  const { FactorySpring, FactoryLinear, unwrapAngle } = animation
  const first = new FactorySpring(0.3, 0.4)
  const second = new FactorySpring(0.3, 0.4)

  first.move(6, 0)
  second.move(6, 0)
  for (let tick = 0; tick <= 225; tick += 15) {
    first.update(tick)
  }

  assert.equal(first.value, second.update(225))
  assert.ok(first.value > 6)
  const velocity = first.velocity

  first.move(12, 225)
  assert.equal(first.velocity, velocity)
  assert.equal(unwrapAngle(354, 0), 360)
  assert.equal(unwrapAngle(6, 354), -6)
  assert.equal(unwrapAngle(-350, -10), -370)
  const linear = new FactoryLinear(0.1)

  linear.move(1, 0)
  assert.ok(Math.abs(linear.update(50) - 0.5) < 0.00001)
  linear.move(1, 50)
  assert.equal(linear.update(100), 1)
  linear.move(-1, 100)
  assert.ok(Math.abs(linear.update(150)) < 0.00001)
})

test('launcher predicts a quick short throw, preserves drag position and settles with factory easing', () => {
  const context = setup()
  const { watch, setMonotonicTime, launcher } = context
  const menu = launcherView(context)

  setMonotonicTime(0)
  menu.pointerDown(pointer(300, 250))
  setMonotonicTime(33)
  menu.pointerMove(pointer(200, 250))
  assert.equal(menu.menuX, -100)
  assert.equal(menu.menuSelectedIndex, 0)
  assert.equal(menu.menuTitleAlpha, 159 / 255)
  menu.pointerUp(pointer(200, 250))
  assert.equal(menu.menuX, -100)
  assert.equal(menu.scroll.animating, true)
  context.frame(433)
  assert.equal(launcher.menuIndex, 1)
  assert.equal(menu.menuX, 0)
  menu.open()
  assert.equal(watch.screen, 'menu')
})

test('launcher keeps icon sources stable across the midpoint and recenters only after settling', () => {
  const context = setup()
  const menu = launcherView(context)
  const sources = () =>
    menu
      .template()
      .children.filter((node) => node?.props?.class === 'menu-icon')
      .map((node) => node.children[0].props.src)
  const before = sources()

  context.launcher.go(1)
  context.frame(0)
  context.frame(200)
  assert.equal(context.launcher.menuIndex, 1)
  assert.equal(menu.menuSelectedIndex, 1)
  assert.equal(menu.iconIndex, 0)
  for (let index = 0; index < 3; index++) {
    assert.equal(sources()[index], before[index])
  }

  assert.ok(menu.menuX < -233)
  context.frame(400)
  assert.equal(menu.menuX, 0)
  assert.equal(menu.iconIndex, 1)
  assert.equal(sources()[0], before[2])
})

test('launcher opens the touched physical icon during a snap and can interrupt it with a reverse drag', () => {
  const context = setup()
  const menu = launcherView(context)

  context.launcher.go(1)
  context.frame(0)
  context.frame(200)
  menu.open(1)
  assert.equal(context.watch.screen, 'watch')

  menu.dispose()
  context.watch.home()
  const nextMenu = launcherView(context)
  context.launcher.go(1)
  context.frame(500)
  context.frame(700)
  context.setMonotonicTime(700)
  nextMenu.pointerDown(pointer(300, 250))
  assert.equal(nextMenu.iconIndex, 2)
  context.setMonotonicTime(733)
  nextMenu.pointerMove(pointer(450, 250))
  nextMenu.pointerUp(pointer(450, 250))
  context.frame(1133)
  assert.equal(context.launcher.menuIndex, 1)
  assert.equal(nextMenu.menuX, 0)
})

test('launcher stationary hold removes fling and leaves fixed dot centers while returning to the same page', () => {
  const context = setup()
  const { setMonotonicTime, launcher } = context
  const menu = launcherView(context)

  setMonotonicTime(0)
  menu.pointerDown(pointer(300, 250))
  setMonotonicTime(33)
  menu.pointerMove(pointer(200, 250))
  context.frame(166)
  setMonotonicTime(166)
  menu.pointerUp(pointer(200, 250))
  context.frame(566)
  assert.equal(launcher.menuIndex, 0)
  assert.equal(menu.menuX, 0)
})

test('picker drags continuously, commits at release and settles without discrete row jumps', () => {
  const context = setup()
  const { setMonotonicTime, alarmClock } = context

  alarmClock.addAlarm()
  const hour = rollerView(context, 'hour')

  setMonotonicTime(0)
  hour.pointerDown(pointer(143, 220))
  setMonotonicTime(33)
  hour.pointerMove(pointer(143, 205))
  assert.equal(alarmClock.adjustHour, 7)
  assert.equal(hour.offset, -15)
  context.frame(166)
  setMonotonicTime(166)
  hour.pointerUp(pointer(143, 205))
  assert.equal(alarmClock.adjustHour, 7)
  context.frame(1166)
  assert.equal(hour.offset, 0)
  assert.equal(hour.anchor, 7)
})

test('finite picker predicts momentum and clamps while time pickers wrap', () => {
  const context = setup()
  const { setMonotonicTime, launcher, luckyWheel, alarmClock } = context

  launcher.menuIndex = 6
  launcher.open()
  const options = rollerView(context, 'options')

  setMonotonicTime(0)
  options.pointerDown(pointer(143, 240))
  setMonotonicTime(33)
  options.pointerMove(pointer(143, 160))
  options.pointerUp(pointer(143, 160))
  assert.ok(luckyWheel.options > 3)
  assert.ok(luckyWheel.options <= 18)
  context.frame(233)
  assert.notEqual(options.offset, 0)
  context.frame(1033)
  assert.equal(options.offset, 0)
  alarmClock.addAlarm()
  const minute = rollerView(context, 'minute')

  setMonotonicTime(1200)
  minute.pointerDown(pointer(143, 220))
  setMonotonicTime(1233)
  minute.pointerMove(pointer(143, 266))
  context.frame(1366)
  setMonotonicTime(1366)
  minute.pointerUp(pointer(143, 266))
  assert.equal(alarmClock.adjustMinute, 59)
  context.frame(2366)
  assert.equal(minute.anchor, 59)
})

test('picker stops bubbling and independent columns predict their own recent momentum', () => {
  const context = setup()
  const { setMonotonicTime, alarmClock } = context
  const app = appView(context)

  alarmClock.addAlarm()
  const hour = rollerView(context, 'hour')
  const minute = rollerView(context, 'minute')

  setMonotonicTime(0)
  const down = pointer(143, 220)

  hour.pointerDown(down)
  assert.equal(down.stopped, true)
  if (!down.stopped) {
    app.pointerDown(down)
  }

  assert.equal(context.battery.batteryVisible, false)
  setMonotonicTime(33)
  hour.pointerMove(pointer(143, 205))
  context.frame(33)
  assert.equal(hour.offset, -15)
  hour.pointerUp(pointer(143, 205))
  setMonotonicTime(66)
  minute.pointerDown(pointer(143, 220))
  setMonotonicTime(99)
  minute.pointerMove(pointer(143, 210))
  minute.pointerUp(pointer(143, 210))
  assert.equal(alarmClock.adjustMinute, 3)
})

test('a captured small drag suppresses arrow clicks even below the native click slop', () => {
  const context = setup()
  const { setMonotonicTime, launcher } = context
  const menu = launcherView(context)

  setMonotonicTime(0)
  menu.pointerDown(pointer(30, 233))
  setMonotonicTime(33)
  menu.pointerMove(pointer(42, 233))
  menu.pointerUp(pointer(42, 233))
  menu.arrow(1)
  context.frame(433)
  assert.equal(launcher.menuIndex, 0)
})

test('neighboring launcher icons open their own apps and pickers use source placement', () => {
  const context = setup()
  const { watch, alarmClock, settingsStore } = context
  const menu = launcherView(context)

  menu.open(1)
  assert.equal(watch.screen, 'watch')
  watch.home()
  menu.open(-1)
  assert.equal(watch.screen, 'alarms')
  alarmClock.addAlarm()
  assert.ok(
    fs
      .readFileSync(
        path.join(fileURLToPath(new URL('../', import.meta.url)), 'common/adjust/Adjust.css'),
        'utf8',
      )
      .includes('138px'),
  )
  settingsStore.settingScreen('set-date')
  assert.ok(
    fs
      .readFileSync(
        path.join(
          fileURLToPath(new URL('../', import.meta.url)),
          'apps/app_setup/workers/set_date.css',
        ),
        'utf8',
      )
      .includes('143px'),
  )
})

test('launcher battery shows once after800ms, uses1800ms first duration, spring-hides and samples charge only there', () => {
  const { watch, setCharging, battery } = setup()

  watch.tick(799)
  assert.equal(battery.batteryVisible, false)
  watch.tick(800)
  assert.equal(battery.batteryVisible, true)
  assert.equal(battery.batteryUntil, 2600)
  watch.tick(1100)
  assert.ok(Math.abs(battery.batteryY + 17) < 1)
  watch.tick(2601)
  assert.equal(battery.batteryVisible, true)
  assert.equal(battery.batteryShowing, false)
  watch.tick(3600)
  assert.equal(battery.batteryVisible, false)
  watch.screen = 'watch'
  setCharging(true)
  watch.tick(5000)
  assert.equal(battery.batteryVisible, false)
  watch.home()
  setCharging(false)
  watch.tick(6000)
  setCharging(true)
  watch.tick(6999)
  assert.equal(battery.batteryVisible, false)
  watch.tick(7000)
  assert.equal(battery.batteryShowing, true)
  assert.equal(battery.batteryUntil, 13000)
})

test('About progresses in bounded bursts without capping100 or restarting', () => {
  const { watch, settingsStore } = setup({ random: [0.3, 0, 0, 0, 0] })

  for (let tap = 0; tap < 10; tap++) {
    settingsStore.versionTap()
  }

  watch.tick(0)
  assert.equal(settingsStore.progress, 1)
  assert.equal(settingsStore.progressAt, 60)
  watch.tick(59)
  assert.equal(settingsStore.progress, 1)
  watch.tick(60)
  assert.equal(settingsStore.progress, 2)
  assert.equal(settingsStore.progressAt, 760)
  settingsStore.progress = 99
  watch.tick(760)
  assert.ok(settingsStore.progress > 100)
  assert.equal(watch.screen, 'about')
})

test('simultaneous factory alarms queue until each OK, block underlying navigation and never retrigger that date', () => {
  const context = setup()
  const { watch, setTime, alarmClock, watchFace } = context

  alarmClock.addAlarm()
  assert.equal(alarmClock.adjustHour, 7)
  assert.equal(alarmClock.adjustMinute, 0)
  alarmClock.alarms = [
    { id: 1, hour: 8, minute: 30, enabled: true, lastDate: -1 },
    { id: 2, hour: 8, minute: 30, enabled: true, lastDate: -1 },
  ]
  watch.screen = 'watch'
  setTime(new Date(2026, 9, 5, 8, 30).getTime())
  watch.tick(1000)
  assert.equal(alarmClock.ringing, true)
  assert.equal(alarmClock.alarmQueue.length, 1)
  watch.home()
  watch.go(1)
  watchView(context).tap()
  assert.equal(watch.screen, 'watch')
  assert.equal(watchFace.face, 0)
  assert.equal(watchFace.classicMode, 0)
  alarmClock.dismissAlarm()
  assert.equal(alarmClock.ringing, true)
  assert.equal(alarmClock.alarmQueue.length, 0)
  assert.equal(alarmClock.beepIndex, 0)
  alarmClock.dismissAlarm()
  assert.equal(alarmClock.ringing, false)
  watch.tick(2000)
  assert.equal(alarmClock.ringing, false)
})

test('factory AP edit session gates keys and navigation until its Exit completes', () => {
  const context = setup()
  const { watch, setBadgeEditing } = context
  const app = appView(context)

  watch.screen = 'badge'
  const badgeComponent = badgeView(context)

  badgeComponent.pointerDown(pointer(233, 233))
  context.frame(watch.now + 400)
  badgeComponent.pointerUp(pointer(233, 233))
  watch.confirmDialog()
  assert.equal(watch.screen, 'badge-edit')
  watch.home()
  app.handleKey(27)
  app.handleKey(39)
  watch.go(1)
  assert.equal(watch.screen, 'badge-edit')
  setBadgeEditing(false)
  watch.tick(1000)
  assert.equal(watch.screen, 'badge')
  app.handleKey(27)
  assert.equal(watch.screen, 'menu')
})

test('physical stopwatch buttons spring inward and release, while muted feedback never starts positive PCM', () => {
  const context = setup()
  const { watch, setMonotonicTime, getToneCalls, settingsStore, launcher, stopwatch, alarmClock } =
    context
  const app = appView(context)

  settingsStore.settingScreen('volume')
  settingsStore.setPercentage(0)
  settingsStore.saveSettings()
  launcher.menuIndex = 2
  launcher.open()
  setMonotonicTime(1000)
  app.keyDown(37)
  app.keyDown(39)
  watch.tick(150)
  assert.ok(stopwatch.swLeftX > 0 && stopwatch.swLeftY > 0)
  assert.ok(stopwatch.swRightX < 0 && stopwatch.swRightY > 0)
  assert.equal(getToneCalls().length, 0)
  app.keyUp(37)
  app.keyUp(39)
  watch.tick(1150)
  watch.tick(1166)
  assert.equal(stopwatch.swLeftX, 0)
  assert.equal(Math.abs(stopwatch.swRightX), 0)
  alarmClock.startAlarm('07:00')
  watch.tick(1500)
  assert.equal(getToneCalls().length, 0)
  alarmClock.dismissAlarm()
  assert.deepEqual(getToneCalls(), [[0, 0]])
})

test('factory negative half-angle rounding matches C++ instead of JavaScript ties', () => {
  const { setTime, launcher, watchFace } = setup()

  assert.equal(animation.factoryRound(-899.5), -900)
  assert.equal(animation.factoryRound(899.5), 900)
  setTime(new Date(2026, 9, 5, 0, 0, 6).getTime())
  launcher.menuIndex = 1
  launcher.open()
  assert.equal(watchFace.hourRotation, 'rotate(-90deg)')
})

test('each factory application owns independent state and alarm edits do not overwrite settings edits', () => {
  const {
    watch,
    launcher,
    watchFace,
    stopwatch,
    imuStore,
    fft,
    luckyWheel,
    alarmClock,
    settingsStore,
    badge,
  } = setup()
  const applications = [
    launcher,
    watchFace,
    stopwatch,
    imuStore,
    fft,
    luckyWheel,
    alarmClock,
    settingsStore,
    badge,
  ]

  assert.equal(new Set(applications).size, applications.length)
  for (const field of ['swState', 'bands', 'alarms', 'options', 'theme', 'brightness']) {
    assert.equal(Object.hasOwn(watch, field), false, field + ' must not live on SystemStore')
  }

  settingsStore.settingScreen('set-time')
  settingsStore.adjustHour = 23
  settingsStore.adjustMinute = 17
  alarmClock.addAlarm()
  assert.equal(alarmClock.adjustHour, 7)
  assert.equal(alarmClock.adjustMinute, 0)
  assert.equal(settingsStore.adjustHour, 23)
  assert.equal(settingsStore.adjustMinute, 17)
})

test('gesture state belongs to component instances and disposal stops pending frames', () => {
  const context = setup()
  const first = launcherView(context)
  const second = launcherView(context)

  first.pointerDown(pointer(300, 250))
  context.setMonotonicTime(33)
  first.pointerMove(pointer(200, 250))
  assert.equal(first.menuX, -100)
  assert.equal(second.menuX, 0)
  assert.equal(second.held, false)
  first.dispose()
  context.frame(433)
  assert.equal(first.running, false)
  assert.equal(first.menuX, -100)
  assert.equal(second.menuX, 0)

  context.alarmClock.addAlarm()
  const roller = rollerView(context, 'hour')

  roller.pointerDown(pointer(143, 220))
  context.setMonotonicTime(466)
  roller.pointerMove(pointer(143, 205))
  const offset = roller.offset

  roller.dispose()
  context.frame(866)
  assert.equal(roller.offset, offset)
  assert.equal(context.alarmClock.adjustHour, 7)
  const replacement = rollerView(context, 'hour')

  assert.equal(replacement.offset, 0)
  assert.equal(replacement.anchor, 7)
})

test('business stores contain no pointer handlers or transient gesture state', () => {
  const { watch, launcher, alarmClock, settingsStore } = setup()
  const forbidden =
    /^(pointer(?:Down|Move|Up)|touch.*|ignorePointer.*|suppressClick|sliderDragging|roller.*|alarmHold.*|menuScroll)$/

  for (const store of [watch, launcher, alarmClock, settingsStore]) {
    const members = new Set([
      ...Object.keys(store),
      ...Object.getOwnPropertyNames(Object.getPrototypeOf(store)),
    ])

    assert.deepEqual(
      [...members].filter((name) => forbidden.test(name)),
      [],
    )
  }
})

test('disposing or leaving a view cancels pending holds without leaking into another instance', () => {
  const context = setup()
  const { watch, watchFace } = context

  watch.screen = 'watch'
  watchFace.face = 3
  const first = watchView(context)

  first.pointerDown(pointer(233, 233))
  first.dispose()
  context.frame(400)
  assert.equal(watchFace.secondDot, true)
  const second = watchView(context)

  second.pointerDown(pointer(233, 233))
  context.frame(800)
  assert.equal(watchFace.secondDot, false)
  second.pointerUp(pointer(233, 233))
  watch.screen = 'badge'
  const badge = badgeView(context)

  badge.pointerDown(pointer(233, 233))
  watch.screen = 'imu'
  context.frame(1200)
  assert.equal(watch.dialog, '')
  badge.dispose()
  watch.screen = 'alarms'
  const list = context.component('apps/app_alarm_clock/view/alarm_list', 'AlarmList')

  list.beginHold(pointer(100, 100), 1)
  list.dispose()
  context.frame(1600)
  assert.equal(watch.dialog, '')
})

test('battery edge pull uses last pressed coordinates and ignores a new gesture during dialogs', () => {
  const context = setup()
  const app = appView(context)

  context.watch.screen = 'watch'
  app.pointerDown(pointer(200, 20))
  app.pointerMove(pointer(200, 70))
  app.pointerUp(pointer(200, 200))
  assert.equal(context.battery.batteryShowing, false)
  app.pointerDown(pointer(200, 20))
  app.pointerMove(pointer(205, 71))
  app.pointerUp(pointer(200, 20))
  assert.equal(context.battery.batteryShowing, true)
  assert.equal(context.battery.batteryUntil, 6000)
  context.frame(1000)
  context.watch.dialog = 'badge'
  app.pointerDown(pointer(200, 20))
  app.pointerMove(pointer(200, 100))
  app.pointerUp(pointer(200, 100))
  assert.equal(context.battery.batteryUntil, 6000)
})

test('badge and wheel views use the exact swipe threshold and suppress duplicate click actions', () => {
  const context = setup()
  const badge = badgeView(context)

  context.watch.screen = 'badge'
  badge.pointerDown(pointer(200, 200))
  badge.pointerMove(pointer(141, 200))
  badge.pointerUp(pointer(141, 200))
  assert.deepEqual(context.badgeSteps, [])
  badge.pointerDown(pointer(200, 200))
  badge.pointerMove(pointer(140, 200))
  badge.pointerUp(pointer(200, 200))
  assert.deepEqual(context.badgeSteps, [1])
  const wheel = context.component('apps/app_lucky_wheel/view/wheel', 'LuckyWheel')

  context.watch.screen = 'wheel'
  context.luckyWheel.selectOptions()
  wheel.pointerDown(pointer(200, 200))
  wheel.pointerMove(pointer(140, 200))
  wheel.pointerUp(pointer(200, 200))
  assert.equal(context.luckyWheel.spinning, true)
  assert.ok(context.luckyWheel.spinTo > 0)
  const target = context.luckyWheel.spinTo

  wheel.tap()
  assert.equal(context.luckyWheel.spinTo, target)
  context.frame(4000)
  wheel.tap()
  assert.equal(context.luckyWheel.spinning, false)
  wheel.pointerDown(pointer(233, 233))
  wheel.pointerUp(pointer(233, 233))
  wheel.tap()
  assert.equal(context.luckyWheel.spinning, true)
})
