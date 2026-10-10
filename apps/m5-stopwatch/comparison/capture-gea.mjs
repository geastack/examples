import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { geadev } from '../../../../cli/src/device/serial.mjs'
import { writeImage } from '../../../../cli/src/device/image.mjs'
import { captureUploadedFrame } from './capture-upload.mjs'
import { readJourneySnapshot } from './capture-journey.mjs'
import { retainedCaptureIdentity } from './capture-identity.mjs'
import { connectColdCapture } from './connect-capture.mjs'

if (process.env.STOPWATCH_DIAGNOSTIC_MUTED !== '1') {
  throw new Error(
    'Capture requires a verified diagnostic build with hardware audio/vibration mute clamp',
  )
}

const devicePath = process.env.STOPWATCH_PORT || '/dev/cu.usbmodem21101'
const destination = fileURLToPath(
  new URL('../../../reports/m5-stopwatch/captures/gea/', import.meta.url),
)
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const artifactIdentity = retainedCaptureIdentity(
  JSON.parse(readFileSync(new URL('./gea-benchmark-build.json', import.meta.url), 'utf8')),
)
const device = await connectColdCapture(devicePath)
const results =
  process.env.STOPWATCH_CAPTURE_PHASE === 'tail'
    ? JSON.parse(readFileSync(`${destination}results.json`, 'utf8')).filter(
        (entry) => !entry.id.startsWith('stopwatch-'),
      )
    : []
const actions = []
const manifest = JSON.parse(
  readFileSync(new URL('./screen-test-manifest.json', import.meta.url), 'utf8'),
)
const storeSource = readFileSync(
  new URL('../apps/app_watch_face/store.ts', import.meta.url),
  'utf8',
)
const backgrounds = storeSource
  .match(/const backgrounds = \[([\s\S]*?)\]/)[1]
  .match(/#[0-9a-f]{6}/g)
const panels = storeSource.match(/const panels = \[([\s\S]*?)\]/)[1].match(/#[0-9a-f]{6}/g)

function rgb565(color) {
  const r = parseInt(color.slice(1, 3), 16) >> 3
  const g = parseInt(color.slice(3, 5), 16) >> 2
  const b = parseInt(color.slice(5, 7), 16) >> 3

  return [(r << 3) | (r >> 2), (g << 2) | (g >> 4), (b << 3) | (b >> 2)]
}

function captureState(id, image, observations = {}) {
  let screen = ''
  let state = ''
  let parameters = {}
  const proofs = []
  let verified = false
  const theme = id.match(/^(number-flow|simple)-(\d+)$/)

  if (theme) {
    const index = Number(theme[2])

    screen = theme[1] === 'simple' ? 'watch.simple' : 'watch.number_flow'
    state = 'theme0..9'
    parameters = { theme: index }
    const probes = [{ x: 233, y: 60, color: backgrounds[index] }]

    if (theme[1] === 'number-flow') {
      probes.push({ x: 115, y: 160, color: panels[index] })
    }

    for (const probe of probes) {
      const offset = (probe.y * image.width + probe.x) * 3
      const actual = Array.from(image.rgb.slice(offset, offset + 3))
      const expected = rgb565(probe.color)

      proofs.push({
        ...probe,
        actual,
        expected,
        matches: actual.every((value, i) => value === expected[i]),
      })
    }

    verified = proofs.every((proof) => proof.matches)
  } else if (id.startsWith('launcher-')) {
    screen = 'launcher'
    state = [
      'AlarmClock',
      'WatchFace',
      'Stopwatch',
      'Badge',
      'IMU',
      'Audio.FFT',
      'LuckyWheel',
      'Settings',
    ][Number(id.split('-').pop())]
  } else if (id.startsWith('classic-')) {
    screen = 'watch.classic'
    state = [
      'mode0: information and ticks',
      'mode1: ticks without information',
      'mode2: hands only',
    ][Number(id.split('-').pop())]
  } else if (id.startsWith('big-number-')) {
    screen = 'watch.big_number'
    state = `palette${id.split('-').pop()}`
  } else {
    const states = {
      'simple-dot-disabled': ['watch.simple', 'dot off'],
      'stopwatch-idle': ['stopwatch', 'stopped empty'],
      'stopwatch-running': ['stopwatch', 'running'],
      'stopwatch-laps': ['stopwatch', 'running with laps'],
      'stopwatch-laps-scrolled': ['stopwatch', 'long scrolling lap history'],
      'stopwatch-stopped': ['stopwatch', 'paused'],
      'stopwatch-resumed': ['stopwatch', 'resumed'],
      'stopwatch-reset': ['stopwatch', 'reset'],
      'imu-labels': ['imu', 'labels on'],
      'imu-no-labels': ['imu', 'labels off'],
      'fft-labels': ['fft', 'peak labels shown'],
      'fft-no-labels': ['fft', 'peak labels hidden'],
      'wheel-selector-min': ['wheel.selection', '2 options'],
      'wheel-selector-max': ['wheel.selection', '18 options'],
      'wheel-clockwise-active': ['wheel.spin', 'clockwise'],
      'wheel-clockwise-result': ['wheel.spin', 'settled outcome'],
      'wheel-counterclockwise-active': ['wheel.spin', 'counterclockwise'],
      'wheel-counterclockwise-result': ['wheel.spin', 'settled outcome'],
    }

    if (/^wheel-(?:ready-)?\d+$/.test(id)) {
      screen = 'wheel.spin'
      state = 'ready'
      parameters = { options: Number(id.split('-').pop()) }
    } else {
      ;[screen, state] = states[id] || ['', '']
    }
  }

  const assertions = []
  const observed = (className) => observations[className]?.nodes || []
  const complete = (className) =>
    observations[className] &&
    observations[className].nodes_dropped === 0 &&
    observed(className).every(
      (node) => className === 'laps' || className === 'roller' || !node.text_truncated,
    )
  const check = (name, actual, expected, matches) =>
    assertions.push({ name, actual, expected, matches })
  const text = (className) => observed(className).map((node) => node.text?.trim() || '')

  if (screen === 'launcher' && complete('menu-title') && complete('dot')) {
    check('actual selected title', text('menu-title'), state, text('menu-title').includes(state))
    const selected = observed('dot').filter((node) => node.selected_class === 1)

    check(
      'one actual selected page dot',
      selected,
      Number(id.split('-').pop()),
      selected.length === 1 && selected[0].x === 170 + Number(id.split('-').pop()) * 16,
    )
  } else if (screen === 'watch.classic' && complete('classic-time')) {
    const mode = Number(id.split('-').pop())
    const tickColor = rgb565('#6e6e6e')
    let tickPixels = 0

    for (let y = 228; y < 239; y++) {
      for (let x = 8; x < 40; x++) {
        const offset = (y * image.width + x) * 3

        if (tickColor.every((value, index) => image.rgb[offset + index] === value)) {
          tickPixels++
        }
      }
    }

    check(
      'classic information conditional nodes',
      text('classic-time'),
      mode === 0 ? 'present' : 'absent',
      mode === 0 ? text('classic-time').length === 1 : text('classic-time').length === 0,
    )
    check(
      'static left major tick pixel region',
      tickPixels,
      mode === 2 ? 0 : '>0',
      mode === 2 ? tickPixels === 0 : tickPixels > 0,
    )
  } else if (screen === 'watch.big_number') {
    const palettes = [
      [0xcbdb8c, 0xd3ea71, 0xe9f5b8, 0x94a350],
      [0xd1f3bf, 0xcdfcb9, 0xf8fee9, 0x84d86d],
      [0xdb9d7d, 0xe8d780, 0xf4ebc0, 0xf2b050],
      [0xb49edb, 0x9bc1ff, 0xc4c9fa, 0xaf94e7],
    ]
    const expected = palettes[Number(id.split('-').pop())].map((color) =>
      rgb565('#' + color.toString(16).padStart(6, '0')),
    )
    const counts = expected.map(() => 0)

    for (let offset = 0; offset < image.rgb.length; offset += 3) {
      expected.forEach((color, index) => {
        if (color.every((value, channel) => image.rgb[offset + channel] === value)) {
          counts[index]++
        }
      })
    }

    check(
      'four source BigNumber tint colors',
      counts,
      'at least20 fullyopaque pixels percolor',
      counts.every((count) => count >= 20),
    )
  } else if (id === 'simple-dot-disabled' && complete('simple-time')) {
    const bg = [image.rgb[0], image.rgb[1], image.rgb[2]]
    let changed = 0

    for (let y = 10; y < 456; y++) {
      for (let x = 10; x < 456; x++) {
        const radius2 = (x - 233) ** 2 + (y - 233) ** 2

        if (radius2 < 206 ** 2 || radius2 > 222 ** 2) {
          continue
        }

        const offset = (y * image.width + x) * 3

        if (bg.some((value, index) => image.rgb[offset + index] !== value)) {
          changed++
        }
      }
    }

    check('entire source secondsdot annulus contains onlybackground', changed, 0, changed === 0)
    check(
      'actual Simple clock digits',
      text('simple-time'),
      '11:26',
      text('simple-time').includes('11:26'),
    )
  } else if (
    screen === 'stopwatch' &&
    complete('sw-left') &&
    complete('sw-right') &&
    complete('lap') &&
    complete('elapsed') &&
    complete('laps')
  ) {
    const left = text('sw-left')[0]
    const right = text('sw-right')[0]
    const lapCount = observed('lap').length
    const value = text('elapsed')[0]?.replaceAll('O', '0')

    if (['running', 'running with laps', 'resumed', 'long scrolling lap history'].includes(state)) {
      check(
        'actual running control labels',
        [left, right],
        ['LAP', 'STOP'],
        left === 'LAP' && right === 'STOP',
      )
    } else if (state === 'paused') {
      check(
        'actual paused control labels',
        [left, right],
        ['RESET', 'START'],
        left === 'RESET' && right === 'START',
      )
    } else {
      check(
        'actual zero elapsed and emptyhistory',
        { value, lapCount },
        '00:00:00.00 and0laps',
        value === '00:00:00.00' && lapCount === 0,
      )
      check('actual idle start control', right, 'START', right === 'START')
    }

    if (state.includes('laps') || state === 'long scrolling lap history') {
      check('actual cumulative laprows', lapCount, 8, lapCount === 8)
    }

    if (state === 'long scrolling lap history') {
      check(
        'actual lap container scrolloffset',
        observed('laps').map((node) => node.scroll_y),
        '>0',
        observed('laps').some((node) => node.scroll_y > 0),
      )
    }
  } else if (screen === 'imu' && complete('accel')) {
    const labels = text('accel')
    const visible = state === 'labels on'

    check(
      'actual IMUconditional label set',
      labels,
      visible ? 'X,Y,Z' : 'empty',
      visible
        ? ['X:', 'Y:', 'Z:'].every((prefix) => labels.some((label) => label.startsWith(prefix)))
        : labels.length === 0,
    )
  } else if (screen === 'fft' && complete('frequency')) {
    const values = text('frequency').map((value) => value.replace(/\s/g, ''))

    check(
      'actual conditional frequencylabel',
      values,
      state === 'peak labels shown' ? 'numericHz' : 'empty',
      state === 'peak labels shown'
        ? values.length === 1 && /^\d+Hz$/.test(values[0])
        : values.length === 0,
    )
  } else if (screen === 'wheel.selection' && complete('roller') && complete('roller-row')) {
    const roller = observed('roller')[0]
    const center = roller && roller.y + roller.height / 2
    const rows = observed('roller-row').filter(
      (row) => Math.abs(row.y + row.height / 2 - center) <= 0.5,
    )
    const wanted = state === '2 options' ? '2' : '18'

    check(
      'actual centered selected row',
      rows.map((row) => row.text?.trim()),
      wanted,
      rows.length > 0 && rows.every((row) => row.text?.trim() === wanted),
    )
  } else if (screen === 'wheel.spin' && state === 'ready' && complete('wheel-label')) {
    const numbers = text('wheel-label')
      .map(Number)
      .sort((a, b) => a - b)

    check(
      'actual sectorlabel count and values',
      numbers,
      parameters.options,
      numbers.length === parameters.options &&
        numbers.every((number, index) => number === index + 1),
    )
  }

  if (assertions.length) {
    verified = assertions.every((assertion) => assertion.matches)
  }

  if (!manifest.screens.some((entry) => entry.id === screen && entry.states.includes(state))) {
    throw new Error(`${id}: missing manifest state mapping`)
  }

  const comparisonParameters = {}

  for (const key of ['theme', 'options']) {
    if (key in parameters) {
      comparisonParameters[key] = parameters[key]
    }
  }

  if (screen === 'launcher') {
    const selected = observed('dot').find((node) => node.selected_class === 1)

    if (selected) {
      comparisonParameters.page = Math.round((selected.x - 170) / 16)
    }
  }

  if (screen === 'watch.classic') {
    comparisonParameters.mode = Number(id.split('-').pop())
  }

  if (screen === 'watch.big_number') {
    comparisonParameters.palette = Number(id.split('-').pop())
  }

  return {
    manifestScreenId: screen,
    manifestState: state,
    parameters,
    comparisonParameters,
    stateVerified: verified,
    stateEvidence: {
      paletteProbes: proofs,
      controlAssertions: assertions,
      observations,
      assertion: verified
        ? 'Actual source palette or public rendered control assertions match manifest state'
        : 'UI action recipe and route evidence only; value/state awaits independent image or node verification',
    },
    dynamicFrameStateVerified: false,
  }
}

async function drag(...args) {
  actions.push({ action: 'drag', arguments: args })
  await geadev.drag(device, ...args)
}

let menuIndex = null

async function read(command, prefix) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await wait(100)

      return await device.command(command, [prefix], 15000)
    } catch (error) {
      if (attempt === 2) {
        throw error
      }

      console.log(`retrying read ${command}: ${error.message}`)
      await device.writeRaw('\n')
      await device.drainInput()
    }
  }
}

async function collectControls(id) {
  let classes = []

  if (id.startsWith('launcher-')) {
    classes = ['menu-title', 'dot']
  } else if (id.startsWith('classic-')) {
    classes = ['classic-time']
  } else if (id === 'simple-dot-disabled') {
    classes = ['simple-time']
  } else if (id.startsWith('stopwatch-')) {
    classes = ['sw-left', 'sw-right', 'lap', 'elapsed', 'laps']
  } else if (id.startsWith('imu-')) {
    classes = ['accel']
  } else if (id.startsWith('fft-')) {
    classes = ['frequency']
  } else if (id.startsWith('wheel-selector-')) {
    classes = ['roller', 'roller-row']
  } else if (/^wheel-(?:ready-)?\d+$/.test(id)) {
    classes = ['wheel-label']
  }

  const observations = {}

  for (const className of classes) {
    const receipt = await read(`GEADEV SCROLLSTATE ${className}`, 'SWSCROLL ')
    const parsed = JSON.parse(receipt.slice(receipt.indexOf('{')))

    if (
      parsed.nodes_dropped !== 0 ||
      parsed.nodes.some((node) => !['laps', 'roller'].includes(className) && node.text_truncated)
    ) {
      throw new Error(`${id}: incomplete public control observation ${className}`)
    }

    observations[className] = parsed
  }

  return observations
}

async function capture(id, description, expectedClass) {
  await wait(650)
  const state = await read('GEADEV STATE', 'GEADEV:STATE')
  const memory = await read('GEADEV MEM', 'GEADEV:MEM')
  const node = expectedClass ? await read(`GEADEV NODE ${expectedClass}`, 'GEADEV:NODE') : ''

  if (expectedClass && /ERR|count=0|none=1/.test(node)) {
    throw new Error(`${id}: expected ${expectedClass}, received ${node}`)
  }

  const requestedTime = Date.UTC(2000, 0, 28, 11, 26, 0) / 1000

  const staticClock = /^(launcher-|classic-|number-flow-|big-number-|simple-)/.test(id)

  actions.push({ action: 'comparisonClockFreeze', seconds: staticClock ? requestedTime : 0 })
  const clockReadback = await device.command(
    `GEADEV CLOCKFREEZE ${staticClock ? requestedTime : 0}`,
    ['GEADEV:OK CLOCKFREEZE'],
    15000,
  )

  await wait(500)
  const observations = await collectControls(id)
  let image

  try {
    image = await captureUploadedFrame(device)
  } catch (error) {
    await device.command('GEADEV UPLOADSHOT DISARM', ['GEADEV:OK UPLOADSHOT'], 15000)
    throw error
  }

  if (image.width !== 466 || image.height !== 466) {
    throw new Error(`${id}: incorrect frame dimensions`)
  }

  writeImage(`${destination}${id}.png`, image.width, image.height, image.rgb)
  results.push({
    ...artifactIdentity,
    id,
    description,
    expectedClass,
    node,
    state,
    memory,
    ...captureState(id, image, observations),
    requestedWallClockSeconds: requestedTime,
    wallClockReadbackVerified: false,
    frozenFixtureClock: staticClock
      ? { seconds: requestedTime, acknowledgement: clockReadback }
      : null,
    captureTransport: image.captureTransport,
    actionHistory: actions.slice(),
    pixelGeometry: {
      rawSize: [image.width, image.height],
      crop: [0, 0, 466, 466],
      evidence: 'GEADEV screenshot reports native 466x466 logical display',
    },
    diagnosticHardwareMuteAsserted: true,
    capturedAt: new Date().toISOString(),
  })
  writeFileSync(`${destination}results.json`, `${JSON.stringify(results, null, 2)}\n`)
  console.log(`captured ${id}`)
}

async function tap(x = 233, y = 233, hold = 80) {
  actions.push({ action: 'tap', x, y, hold })
  await geadev.tap(device, x, y, hold)
  await wait(350)
}

async function key(code) {
  actions.push({ action: 'key', code })
  await geadev.key(device, code)
  await wait(650)
}

async function home(index) {
  await key(27)
  if (menuIndex === null) {
    const receipt = await device.command('GEADEV SCROLLSTATE menu-title', ['SWSCROLL '], 15000)
    const actual = JSON.parse(receipt.slice(receipt.indexOf('{')))
    const titles = [
      'AlarmClock',
      'WatchFace',
      'Stopwatch',
      'Badge',
      'IMU',
      'Audio.FFT',
      'LuckyWheel',
      'Settings',
    ]

    if (actual.nodes_dropped !== 0 || actual.nodes.length !== 1 || actual.nodes[0].text_truncated) {
      throw new Error('Initial actual launcher title is ambiguous')
    }

    menuIndex = titles.indexOf(actual.nodes[0].text)
    if (menuIndex < 0) {
      throw new Error(`Unknown actual launcher title: ${actual.nodes[0].text}`)
    }
  }

  while (menuIndex !== index) {
    await key(39)
    menuIndex = (menuIndex + 1) % 8
  }
}

async function open(index) {
  await home(index)
  await tap(233, 220)
}

const journey = { ...artifactIdentity, tour: 'main', before: null, after: null, completed: false }

try {
  journey.before = await readJourneySnapshot(device)
  if ((await geadev.app(device)) !== 'm5-stopwatch') {
    throw new Error('The connected device is not running m5-stopwatch')
  }

  if (process.env.STOPWATCH_CAPTURE_PHASE !== 'tail') {
    for (let index = 0; index < 8; index++) {
      await home(index)
      await capture(
        `launcher-${index}`,
        [
          'AlarmClock',
          'WatchFace',
          'Stopwatch',
          'Badge',
          'IMU',
          'Audio.FFT',
          'LuckyWheel',
          'Settings',
        ][index],
        'menu-title',
      )
    }

    await open(1)
    for (let mode = 0; mode < 3; mode++) {
      await capture(`classic-${mode}`, `Classic display mode ${mode}`, 'hour-hand')
      await tap()
    }

    await key(39)
    for (let theme = 0; theme < 10; theme++) {
      await capture(`number-flow-${theme}`, `NumberFlow theme ${theme}`, 'number-face')
      await tap()
    }

    await key(39)
    for (let theme = 0; theme < 4; theme++) {
      await capture(`big-number-${theme}`, `BigNumber palette ${theme}`, 'big-face')
      await tap()
    }

    await key(39)
    for (let theme = 0; theme < 10; theme++) {
      await capture(`simple-${theme}`, `Simple theme ${theme}`, 'simple-face')
      await tap()
    }

    await tap(233, 233, 600)
    await capture('simple-dot-disabled', 'Long press hides seconds dot', 'simple-face')
    await tap(233, 233, 600)
  } else {
    for (const index of [0, 1, 3, 7]) {
      await open(index)
    }
  }

  await open(2)
  await capture('stopwatch-idle', 'Initial stopwatch and empty laps', 'stopwatch')
  await tap(315, 85)
  await wait(1100)
  await capture('stopwatch-running', 'Running stopwatch', 'stopwatch')
  for (let lap = 0; lap < 8; lap++) {
    await tap(160, 85)
  }

  await capture('stopwatch-laps', 'Eight cumulative laps, newest first', 'stopwatch')
  await drag(233, 390, 233, 235, 8, 30)
  await capture('stopwatch-laps-scrolled', 'Lap history scrolling', 'stopwatch')
  await tap(315, 85)
  await capture('stopwatch-stopped', 'Stopped stopwatch with RESET action', 'stopwatch')
  await tap(315, 85)
  await capture('stopwatch-resumed', 'Resumed stopwatch excludes paused interval', 'stopwatch')
  await tap(315, 85)
  await tap(160, 85)
  await capture('stopwatch-reset', 'Reset clears laps and elapsed time', 'stopwatch')
  await open(4)
  await capture('imu-labels', 'Live IMU with labels', 'imu')
  await tap()
  await capture('imu-no-labels', 'IMU labels toggle', 'imu')
  await open(5)
  await wait(2000)
  await capture('fft-labels', 'Live microphone spectrum with peak frequency', 'fft')
  await tap()
  await capture('fft-no-labels', 'FFT frequency label toggle', 'fft')
  await open(6)
  await capture('wheel-selector-min', 'Wheel selector lower limit: 2 options', 'wheel-selection')
  await drag(233, 260, 233, 50, 4, 20)
  await capture('wheel-selector-max', 'Wheel selector upper limit: 18 options', 'wheel-selection')
  await tap(233, 390)
  await capture('wheel-18', '18 sector wheel', 'wheel')
  await key(39)
  await capture('wheel-clockwise-active', 'Clockwise spin animation', 'wheel')
  await wait(4000)
  await capture('wheel-clockwise-result', 'Clockwise spin outcome', 'wheel')
  await key(37)
  await capture('wheel-counterclockwise-active', 'Counterclockwise spin animation', 'wheel')
  await wait(4000)
  await capture('wheel-counterclockwise-result', 'Counterclockwise spin outcome', 'wheel')
  for (let options = 2; options <= 18; options++) {
    await open(6)
    for (let step = 2; step < options; step++) {
      await tap(233, 266)
      await wait(350)
    }

    await tap(233, 390)
    await capture(
      `wheel-ready-${options}`,
      `${options} sector wheel after finite picker recipe`,
      'wheel',
    )
  }

  await home(0)
  journey.completed = true
} catch (error) {
  journey.error = { message: error.message, stack: error.stack }
  throw error
} finally {
  try {
    journey.after = await readJourneySnapshot(device)
  } catch (error) {
    journey.afterError = { message: error.message }
  }

  writeFileSync(`${destination}journey-main.json`, JSON.stringify(journey, null, 2) + '\n')
  try {
    await device.command('GEADEV CLOCKFREEZE 0', ['GEADEV:OK CLOCKFREEZE'], 15000)
    await device.command('GEADEV UPLOADSHOT DISARM', ['GEADEV:OK UPLOADSHOT'], 15000)
  } finally {
    await device.close()
  }
}
