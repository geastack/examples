import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

import { SerialDevice } from '../../../../cli/src/device/serial.mjs'
import { readJourneySnapshot } from './capture-journey.mjs'
import { executeGesturePlan, normalizePointerTrace } from './execute-gesture-plan.mjs'

const plan = JSON.parse(readFileSync(new URL('./gesture-plan.json', import.meta.url)))

test('gesture receipts require physical mute and actual timing evidence', async () => {
  const recipe = plan.cases[0]

  await assert.rejects(
    executeGesturePlan({ hardwareMuteVerified: false }, plan, recipe.id),
    /muted/,
  )
  const adapter = {
    hardwareMuteVerified: true,
    prepare: async (entry) => ({ route: entry.requiredRoute, stateEvidence: 'selected0;offset0' }),
    runScheduled: async (entry) => ({
      normalHalVerified: true,
      pointerReadTimes: [0, 33, 66],
      samples: entry.observeAtMs.map((time) => ({ requestedAtMs: time, actualAtMs: time + 1 })),
    }),
  }

  assert.equal((await executeGesturePlan(adapter, plan, recipe.id)).comparable, true)
  adapter.runScheduled = async () => ({ normalHalVerified: true, samples: [] })
  assert.equal((await executeGesturePlan(adapter, plan, recipe.id)).comparable, false)
})

test('compact traces retain input sampling authority and dispatched release coordinates', () => {
  const factory = normalizePointerTrace(
    'factory',
    [
      [100, 1, 233, 220],
      [133, 1, 233, 174],
      [166, 0, 233, 174],
    ],
    100,
  )
  const gea = normalizePointerTrace('gea', [[166, 3, 0, 233, 174, 1, 232, 175]], 100)

  assert.equal(factory[2].phase, 'up')
  assert.equal(gea[0].handlerY, 175)
  assert.equal(gea[0].relativeUs, 66)
  assert.notEqual(factory[0].samplingAuthority, gea[0].samplingAuthority)
  assert.throws(() => normalizePointerTrace('gea', [[100, 0, 1, 2, 3, 1]], 100), /phase/)
})

test('actual capture state classification verifies palette probes and rejects unknown states', () => {
  const source = readFileSync(new URL('./capture-gea.mjs', import.meta.url), 'utf8')
  const store = readFileSync(new URL('../apps/app_watch_face/store.ts', import.meta.url), 'utf8')
  const colors = (name) =>
    store.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\]`))[1].match(/#[0-9a-f]{6}/g)
  const context = vm.createContext({
    manifest: JSON.parse(readFileSync(new URL('./screen-test-manifest.json', import.meta.url))),
    backgrounds: colors('backgrounds'),
    panels: colors('panels'),
  })

  vm.runInContext(
    source.slice(source.indexOf('function rgb565('), source.indexOf('async function drag(')),
    context,
  )
  const image = { width: 466, rgb: new Uint8Array(466 * 466 * 3) }

  assert.equal(context.captureState('simple-0', image).stateVerified, true)
  assert.equal(context.captureState('simple-1', image).stateVerified, false)
  assert.equal(context.captureState('wheel-17', image).parameters.options, 17)
  assert.equal(context.captureState('wheel-ready-18', image).parameters.options, 18)
  assert.equal(context.captureState('wheel-clockwise-active', image).manifestState, 'clockwise')
  assert.throws(() => context.captureState('bad-id', image), /manifest/)
  assert.match(source, /await key\(39\)\s+await capture\('wheel-clockwise-active'/)
})

test('actual public control evidence verifies launcher selection and rejects route-only or wrong values', () => {
  const source = readFileSync(new URL('./capture-gea.mjs', import.meta.url), 'utf8')
  const context = vm.createContext({
    manifest: JSON.parse(readFileSync(new URL('./screen-test-manifest.json', import.meta.url))),
    backgrounds: [],
    panels: [],
  })

  vm.runInContext(
    source.slice(source.indexOf('function rgb565('), source.indexOf('async function drag(')),
    context,
  )
  const image = { width: 466, rgb: new Uint8Array(466 * 466 * 3) }
  const observations = {
    'menu-title': { nodes_dropped: 0, nodes: [{ text: 'AlarmClock' }] },
    dot: { nodes_dropped: 0, nodes: [{ selected_class: 1, x: 170 }] },
  }

  assert.equal(context.captureState('launcher-0', image, observations).stateVerified, true)
  assert.equal(context.captureState('launcher-0', image).stateVerified, false)
  observations['menu-title'].nodes[0].text = 'Audio.FFT'
  assert.equal(context.captureState('launcher-0', image, observations).stateVerified, false)
  observations['menu-title'].nodes[0].text = 'AlarmClock'
  observations.dot.nodes[0].x = 186
  assert.equal(context.captureState('launcher-0', image, observations).stateVerified, false)
})

test('extra control assertions verify actual endpoints and alarm flags without treating visible day as full range proof', () => {
  const source = readFileSync(new URL('./capture-gea-extra.mjs', import.meta.url), 'utf8')
  const context = vm.createContext({})

  vm.runInContext(
    source.slice(
      source.indexOf('function verifyExtraState('),
      source.indexOf('async function collectExtraControls('),
    ),
    context,
  )
  const sample = (nodes) => ({ nodes_dropped: 0, nodes })
  const controls = {
    percentage: sample([{ text: '100' }]),
    'slider-fill': sample([{ width: 374 }]),
    'slider-knob': sample([{ x: 404 }]),
  }

  assert.equal(context.verifyExtraState('brightness-max', {}, controls).stateVerified, true)
  controls.percentage.nodes[0].text = '99'
  assert.equal(context.verifyExtraState('brightness-max', {}, controls).stateVerified, false)
  const alarm = {
    'alarm-row': sample([{ text: '07:59' }]),
    switch: sample([{ selected_class: 0 }]),
    dialog: sample([]),
  }

  assert.equal(context.verifyExtraState('alarms-disabled', {}, alarm).stateVerified, true)
  assert.equal(context.verifyExtraState('alarms-enabled', {}, alarm).stateVerified, false)
  const day = {
    roller: sample([{ x: 163, y: 143, width: 140, height: 164 }]),
    'roller-row': sample([{ x: 179, y: 210, width: 108, height: 30, text: '28' }]),
    ok: sample([{ text: 'OK' }]),
  }

  assert.equal(context.verifyExtraState('set-date-day', {}, day).stateVerified, false)
  assert.equal(context.verifyExtraState('set-date-day', {}, day).parameters.selectedDay, 28)
})

test('all four button combinations require actual flags and persistence requires a saved before-state', () => {
  const source = readFileSync(new URL('./capture-gea-extra.mjs', import.meta.url), 'utf8')
  const context = vm.createContext({})

  vm.runInContext(
    source.slice(
      source.indexOf('function verifyExtraState('),
      source.indexOf('async function collectExtraControls('),
    ),
    context,
  )
  const observations = {
    switch: {
      nodes_dropped: 0,
      nodes: [
        { y: 145, selected_class: 1 },
        { y: 250, selected_class: 0 },
      ],
    },
  }

  assert.equal(
    context.verifyExtraState('button-vibration-only', {}, observations).stateVerified,
    true,
  )
  assert.equal(context.verifyExtraState('button-default', {}, observations).stateVerified, false)
  assert.equal(
    context.verifyExtraState('button-vibration-only', {}, observations).comparisonParameters.sfx,
    true,
  )
  assert.equal(
    context.verifyExtraState('button-vibration-only', {}, observations).comparisonParameters
      .vibration,
    false,
  )
  observations.switch.nodes[1].selected_class = 1
  assert.equal(
    context.verifyExtraState('button-reopened-muted', {}, observations).stateVerified,
    false,
  )
  observations.beforeSave = [1, 1]
  assert.equal(
    context.verifyExtraState('button-reopened-muted', {}, observations).stateVerified,
    true,
  )
  observations.beforeSave = [0, 1]
  assert.equal(
    context.verifyExtraState('button-reopened-muted', {}, observations).stateVerified,
    false,
  )
})

test('calendar endpoint requires actual full summary and visible wrap to1', () => {
  const source = readFileSync(new URL('./capture-gea-extra.mjs', import.meta.url), 'utf8')
  const context = vm.createContext({})

  vm.runInContext(
    source.slice(
      source.indexOf('function verifyExtraState('),
      source.indexOf('async function collectExtraControls('),
    ),
    context,
  )
  const sample = (nodes) => ({ nodes_dropped: 0, nodes })
  const observations = {
    roller: sample([{ x: 163, y: 143, width: 140, height: 164 }]),
    'roller-row': sample([
      { x: 179, y: 210, width: 108, height: 30, text: '29' },
      { x: 179, y: 256, width: 108, height: 30, text: '1' },
    ]),
    'adjust-summary': sample([{ text: '2000-02-29' }]),
    ok: sample([{ text: 'OK' }]),
  }

  assert.equal(
    context.verifyExtraState('set-date-2000-feb29', {}, observations).stateVerified,
    true,
  )
  observations['roller-row'].nodes[1].text = '30'
  assert.equal(
    context.verifyExtraState('set-date-2000-feb29', {}, observations).stateVerified,
    false,
  )
  observations['roller-row'].nodes[1].text = '1'
  observations['adjust-summary'].nodes[0].text = '2001-02-29'
  assert.equal(
    context.verifyExtraState('set-date-2000-feb29', {}, observations).stateVerified,
    false,
  )
})

test('held alarm cancellation needs actual consumed timing and list displacement', () => {
  const source = readFileSync(new URL('./capture-gea-extra.mjs', import.meta.url), 'utf8')
  const context = vm.createContext({})

  vm.runInContext(
    source.slice(
      source.indexOf('function verifyExtraState('),
      source.indexOf('async function collectExtraControls('),
    ),
    context,
  )
  const observations = {
    'alarm-row': {
      nodes_dropped: 0,
      nodes: ['07:59', '07:59', '07:00', '07:00', '07:00', '07:00'].map((text) => ({ text })),
    },
    dialog: { nodes_dropped: 0, nodes: [] },
    listNode: 'scroll=0,120',
    beforeScroll: 100,
    holdCancelTrace:
      'SWINPUT ' +
      JSON.stringify({
        dropped: 0,
        samples: [
          [1000, 1, 1, 144, 117],
          [350000, 2, 1, 144, 57],
          [900000, 3, 0, 144, 57],
        ],
      }),
  }

  assert.equal(context.verifyExtraState('alarm-hold-cancel', {}, observations).stateVerified, true)
  observations.holdCancelTrace =
    'SWINPUT ' +
    JSON.stringify({
      dropped: 0,
      samples: [
        [1000, 1, 1, 144, 117],
        [450000, 2, 1, 144, 57],
        [900000, 3, 0, 144, 57],
      ],
    })
  assert.equal(context.verifyExtraState('alarm-hold-cancel', {}, observations).stateVerified, false)
  observations.holdCancelTrace = 'SWINPUT missing actual samples'
  assert.equal(context.verifyExtraState('alarm-hold-cancel', {}, observations).stateVerified, false)
})

test('journey cleanup uses actual SerialDevice error semantics and only tolerates inactive trace', async () => {
  let traceReply = 'GEADEV:ERR INPUTTRACE inactive'
  let response
  const transport = {
    command: SerialDevice.prototype.command,
    async writeLine(line) {
      response = line.includes('UPLOADSHOT')
        ? 'GEADEV:OK UPLOADSHOT DISARM'
        : line.includes('GESTURE')
          ? 'GEADEV:OK GESTURE CLEAR'
          : line.includes('INPUTTRACE')
            ? traceReply
            : line.includes('STATE')
              ? 'GEADEV:STATE nodes=12 reachable=12'
              : 'GEADEV:MEM internal_free=200000'
    },
    async readLine() {
      return response
    },
  }

  await assert.rejects(
    transport.command('GEADEV INPUTTRACE END', ['GEADEV:ERR INPUTTRACE inactive']),
    /INPUTTRACE inactive/,
  )
  const actual = await readJourneySnapshot(transport)

  assert(actual.releasedDiagnosticBuffers.includes(traceReply))
  assert.match(actual.memory, /internal_free=200000/)
  traceReply = 'GEADEV:ERR INPUTTRACE benchmark-active'
  await assert.rejects(readJourneySnapshot(transport), /benchmark-active/)
})
