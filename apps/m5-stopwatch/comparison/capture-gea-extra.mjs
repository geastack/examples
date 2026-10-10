import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { geadev, geadevFragment } from '../../../../cli/src/device/serial.mjs'
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

const destination = fileURLToPath(
  new URL('../../../reports/m5-stopwatch/captures/gea/', import.meta.url),
)
const artifactIdentity = retainedCaptureIdentity(
  JSON.parse(readFileSync(new URL('./gea-benchmark-build.json', import.meta.url), 'utf8')),
)
const device = await connectColdCapture(process.env.STOPWATCH_PORT || '/dev/cu.usbmodem21101')
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const resumeOverflow = process.env.STOPWATCH_CAPTURE_PHASE === 'overflow'
const resumeQueued = resumeOverflow || process.env.STOPWATCH_CAPTURE_PHASE === 'queued'
const results = resumeQueued
  ? JSON.parse(readFileSync(`${destination}results-extra.json`, 'utf8')).filter(
      (entry) => !resumeOverflow || !['alarms-multiple', 'alarms-scrolled'].includes(entry.id),
    )
  : []
const actions = []
const manifest = JSON.parse(
  readFileSync(new URL('./screen-test-manifest.json', import.meta.url), 'utf8'),
)
const captureStates = {
  'alarms-empty': ['alarms.list', 'empty'],
  'alarms-multiple': ['alarms.list', 'multiple'],
  'alarms-scrolled': ['alarms.list', 'long scrolling list'],
  'alarm-hold-cancel': ['alarms.list', 'long scrolling list'],
  'set-date-day-clamp': ['settings.date_day', 'invalid prior day clamps'],
  'set-date-year2099-month12': ['settings.date_year_month', 'year2000..2099'],
  'set-date-year-wrap': ['settings.date_year_month', 'year2000..2099'],
  'set-date-month-wrap': ['settings.date_year_month', 'month1..12'],
  'set-date-day-wrap': ['settings.date_day', '28/29/30/31-day ranges'],
  'alarm-add': ['alarms.add', 'default07:00'],
  'alarm-add-minute-wrap': ['alarms.add', 'time pickers drag'],
  'alarms-enabled': ['alarms.list', 'enabled'],
  'alarms-disabled': ['alarms.list', 'disabled'],
  'alarm-delete-dialog': ['alarms.delete', 'Delete'],
  'alarm-delete-cancel': ['alarms.delete', 'Cancel'],
  'alarm-single-triggered': ['alarms.trigger', 'single alert'],
  'alarm-triggered': ['alarms.trigger', 'simultaneous queue'],
  'alarm-queued-second': ['alarms.trigger', 'simultaneous queue'],
  'alarm-dismissed': ['alarms.trigger', 'OK dismiss'],
  'alarm-deleted': ['alarms.list', 'empty'],
  'settings-device': ['settings.menu', 'Device'],
  'settings-date': ['settings.menu', 'Time & Date'],
  'settings-firmware': ['settings.menu', 'Firmware'],
  'brightness-initial': ['settings.brightness', 'live drag'],
  'brightness-min': ['settings.brightness', '10%'],
  'brightness-max': ['settings.brightness', '100%'],
  'volume-initial': ['settings.volume', 'live preview'],
  'volume-min': ['settings.volume', '0 mute'],
  'volume-max': ['settings.volume', '100%'],
  'volume-step5': ['settings.volume', '5% steps'],
  'volume-reopened': ['settings.volume', 'OK persist'],
  'button-default': ['settings.button', 'SFX on/off'],
  'button-sfx-toggle': ['settings.button', 'SFX on/off'],
  'button-both-toggle': ['settings.button', 'vibration on/off'],
  'button-vibration-only': ['settings.button', 'vibration on/off'],
  'button-reopened-muted': ['settings.button', 'OK persist'],
  'set-time': ['settings.time', 'current RTC values'],
  'set-time-minute-momentum': ['settings.time', 'hour/minute/second drag and fling'],
  'set-date-year-month': ['settings.date_year_month', 'summary'],
  'set-date-day': ['settings.date_day', '28/29/30/31-day ranges'],
  'set-date-2000-feb29': ['settings.date_day', '28/29/30/31-day ranges'],
  'set-date-2001-feb28': ['settings.date_day', '28/29/30/31-day ranges'],
  'set-date-2000-april30': ['settings.date_day', '28/29/30/31-day ranges'],
  'set-date-2000-january31': ['settings.date_day', '28/29/30/31-day ranges'],
  'about-start': ['settings.about', '0% Complete'],
  'about-progress': ['settings.about', 'burst progress'],
  'battery-visible': ['launcher.battery', 'first popup'],
  'battery-hidden': ['launcher.battery', 'tap hide'],
  'badge-empty': ['badge.display', 'no image edit hint'],
  'badge-edit-dialog': ['badge.confirm', 'Edit'],
  'badge-edit-cancel': ['badge.confirm', 'Cancel'],
}

function verifyExtraState(id, image, observations) {
  const assertions = []
  const parameters = {}
  const observed = (name) => observations[name]?.nodes || []
  const complete = (name) =>
    observations[name] &&
    observations[name].nodes_dropped === 0 &&
    observed(name).every((node) => ['settings', 'roller'].includes(name) || !node.text_truncated)
  const text = (name) => observed(name).map((node) => node.text?.trim() || '')
  const check = (name, actual, expected, matches) =>
    assertions.push({ name, actual, expected, matches })
  const selectedRows = () =>
    observed('roller')
      .map((roller) => {
        const centerX = roller.x + roller.width / 2
        const centerY = roller.y + roller.height / 2
        const rows = observed('roller-row').filter(
          (row) =>
            Math.abs(row.x + row.width / 2 - centerX) <= 0.5 &&
            Math.abs(row.y + row.height / 2 - centerY) <= 0.5,
        )
        const values = [...new Set(rows.map((row) => row.text?.trim()).filter(Boolean))]

        return { centerX, centerY, values }
      })
      .sort((a, b) => a.centerX - b.centerX)

  if (
    ['alarms-multiple', 'alarms-scrolled', 'alarm-hold-cancel'].includes(id) &&
    complete('alarm-row') &&
    complete('dialog')
  ) {
    const rows = text('alarm-row').map((value) => value.replace(/\s/g, ''))
    const scroll = Number(observations.listNode?.match(/scroll=[\d.-]+,([\d.-]+)/)?.[1])

    check(
      'actual six overflow alarm rows',
      rows,
      ['07:59', '07:59', '07:00', '07:00', '07:00', '07:00'],
      rows.length === 6 && rows.every((row, index) => row === (index < 2 ? '07:59' : '07:00')),
    )
    if (id !== 'alarms-multiple') {
      check('actual list scroll displacement', scroll, '>0', scroll > 0)
    }

    check('actual Delete overlay absent', text('dialog'), [], text('dialog').length === 0)
    if (id === 'alarm-hold-cancel') {
      let trace = null

      try {
        trace = JSON.parse(
          observations.holdCancelTrace.slice(observations.holdCancelTrace.indexOf('{')),
        )
      } catch {
        // Missing or malformed consumption evidence fails closed below.
      }

      const down = trace?.samples?.find((row) => row[1] === 1)
      const move = trace?.samples?.find(
        (row) => row[1] === 2 && down && Math.abs(row[4] - down[4]) >= 16,
      )
      const up = trace?.samples?.find((row) => row[1] === 3)

      check(
        'actual movement consumed before400ms hold and release after threshold',
        { down, move, up, dropped: trace?.dropped },
        'actual normalHAL timed cancellation',
        trace?.dropped === 0 &&
          !!down &&
          !!move &&
          !!up &&
          move[0] - down[0] < 400000 &&
          up[0] - down[0] >= 650000 &&
          scroll !== observations.beforeScroll,
      )
    }
  } else if (
    ['alarms-empty', 'alarm-deleted'].includes(id) &&
    complete('alarm-row') &&
    complete('list-button')
  ) {
    check(
      'actual empty alarm rows and Addcontrol',
      { rows: observed('alarm-row').length, buttons: text('list-button') },
      '0rows;Add',
      observed('alarm-row').length === 0 && text('list-button').includes('Add'),
    )
  } else if (
    ['alarms-enabled', 'alarms-disabled', 'alarm-delete-cancel'].includes(id) &&
    complete('alarm-row') &&
    complete('switch') &&
    complete('dialog')
  ) {
    const rows = text('alarm-row').map((value) => value.replace(/\s/g, ''))
    const enabled = observed('switch').map((node) => node.selected_class)

    check('actual preserved07:59 alarm', rows, ['07:59'], rows.length === 1 && rows[0] === '07:59')
    check(
      'actual enabled switch state',
      enabled,
      id === 'alarms-disabled' ? 0 : 1,
      enabled.length === 1 && enabled[0] === (id === 'alarms-disabled' ? 0 : 1),
    )
    check('confirmation overlay is gone', text('dialog'), [], text('dialog').length === 0)
  } else if (
    ['alarm-add', 'alarm-add-minute-wrap'].includes(id) &&
    complete('roller') &&
    complete('roller-row') &&
    complete('adjust-title')
  ) {
    const rows = selectedRows()
    const wanted = id === 'alarm-add' ? ['7', '0'] : ['7', '59']

    check(
      'actual source selected hour/minute rows',
      rows,
      wanted,
      rows.length === 2 &&
        rows.every(
          (row, index) =>
            row.values.length === 1 && Number(row.values[0]) === Number(wanted[index]),
        ),
    )
    check(
      'actual AddAlarm heading',
      text('adjust-title'),
      ['Add Alarm'],
      text('adjust-title').includes('Add Alarm'),
    )
  } else if (id === 'alarm-delete-dialog' && complete('dialog')) {
    const prompt = text('dialog').join(' ')

    check(
      'actual delete prompt and actions',
      prompt,
      'Delete this alarm?/Delete/Cancel',
      /Delete this alarm\?/.test(prompt) && /Cancel/.test(prompt),
    )
  } else if (
    ['alarm-triggered', 'alarm-single-triggered', 'alarm-queued-second'].includes(id) &&
    complete('ringing')
  ) {
    check(
      'actual alarm overlay time',
      text('ringing'),
      '07:59',
      text('ringing').some((value) => /07:59/.test(value)),
    )
  } else if (id === 'alarm-dismissed' && complete('ringing') && complete('alarm-row')) {
    check(
      'actual queue empty overlay and preserved alarms',
      { overlays: observed('ringing').length, rows: text('alarm-row') },
      'nooverlay;two07:59rows',
      observed('ringing').length === 0 &&
        text('alarm-row').length === 2 &&
        text('alarm-row').every((value) => value.replace(/\s/g, '') === '07:59'),
    )
  } else if (id.startsWith('settings-') && complete('settings') && complete('list-button')) {
    const panel = observed('settings')[0]
    const visible = observed('list-button').filter(
      (node) =>
        node.y - (panel?.scroll_y || 0) < 466 && node.y + node.height - (panel?.scroll_y || 0) > 0,
    )
    const labels = visible.map((node) => node.text?.trim())
    const wanted =
      id === 'settings-device'
        ? /Brightness|Volume/
        : id === 'settings-date'
          ? /Set Time|Set Date/
          : /Version|V0\.5/

    check(
      'actual scrolled section controls intersect viewport',
      labels,
      wanted.source,
      labels.some((label) => wanted.test(label)),
    )
    parameters.scrollY = panel?.scroll_y
  } else if (
    /^(brightness|volume)-(min|max)$/.test(id) &&
    complete('percentage') &&
    complete('slider-fill') &&
    complete('slider-knob')
  ) {
    const expected = id.endsWith('-max') ? 100 : id.startsWith('brightness') ? 10 : 0
    const percent = Number(text('percentage')[0])
    const fill = observed('slider-fill')[0]
    const knob = observed('slider-knob')[0]

    check('actual numeric control value', percent, expected, percent === expected)
    check(
      'actual slider endpoint geometry',
      { fillWidth: fill?.width, knobX: knob?.x },
      expected === 100 ? 374 : 0,
      fill?.width === (expected === 100 ? 374 : 0) && !!knob,
    )
  } else if (
    ['volume-step5', 'volume-reopened'].includes(id) &&
    complete('percentage') &&
    complete('slider-fill')
  ) {
    const value = Number(text('percentage')[0])
    const width = observed('slider-fill')[0]?.width

    check(
      'actual value5 with matching slider geometry',
      { value, width },
      '5;approximately18.7px',
      value === 5 && width >= 17 && width <= 20,
    )
    if (id === 'volume-reopened') {
      check(
        'actual saved5 survives worker reopen',
        observations.beforeSave,
        5,
        observations.beforeSave === 5,
      )
    }
  } else if (id.startsWith('button-') && complete('switch')) {
    const controls = observed('switch')
      .sort((a, b) => a.y - b.y)
      .map((node) => node.selected_class)
    const wanted =
      id === 'button-default' || id === 'button-reopened-muted'
        ? [1, 1]
        : id === 'button-sfx-toggle'
          ? [0, 1]
          : id === 'button-vibration-only'
            ? [1, 0]
            : [0, 0]

    check(
      'actual SFX/vibration switch flags',
      controls,
      wanted,
      controls.length === 2 && controls.every((value, index) => value === wanted[index]),
    )
    parameters.sfx = controls[0] === 1
    parameters.vibration = controls[1] === 1
    if (id === 'button-reopened-muted') {
      const saved = observations.beforeSave

      check(
        'actual saved control values survive worker reopen',
        { beforeSave: saved, reopened: controls },
        [1, 1],
        Array.isArray(saved) &&
          saved.length === 2 &&
          saved.every((value, index) => value === controls[index]),
      )
    }
  } else if (
    id === 'set-date-year-month' &&
    complete('adjust-summary') &&
    complete('roller') &&
    complete('roller-row') &&
    complete('ok')
  ) {
    const rows = selectedRows()

    check(
      'actual year/month ranges and Nextstage control',
      { rows, buttons: text('ok') },
      'year2000..2099,month1..12,Next',
      rows.length === 2 &&
        rows[0].values.length === 1 &&
        Number(rows[0].values[0]) >= 2000 &&
        Number(rows[0].values[0]) <= 2099 &&
        rows[1].values.length === 1 &&
        Number(rows[1].values[0]) >= 1 &&
        Number(rows[1].values[0]) <= 12 &&
        text('ok').includes('Next'),
    )
    parameters.selectedYear = Number(rows[0]?.values[0])
    parameters.selectedMonth = Number(rows[1]?.values[0])
    const expectedSummary = `${parameters.selectedYear}-${String(parameters.selectedMonth).padStart(2, '0')}`

    check(
      'actual date summary agrees withselected controls',
      text('adjust-summary'),
      expectedSummary,
      text('adjust-summary').includes(expectedSummary),
    )
  } else if (
    ['set-date-year2099-month12', 'set-date-year-wrap', 'set-date-month-wrap'].includes(id) &&
    complete('roller') &&
    complete('roller-row') &&
    complete('adjust-summary')
  ) {
    const expected =
      id === 'set-date-year2099-month12'
        ? [2099, 12]
        : id === 'set-date-year-wrap'
          ? [2000, 12]
          : [2000, 1]
    const rows = selectedRows()
    const summary = `${expected[0]}-${String(expected[1]).padStart(2, '0')}`

    check(
      'actual selected source year/month and summary',
      { rows, summary: text('adjust-summary') },
      expected,
      rows.length === 2 &&
        rows.every(
          (row, index) => row.values.length === 1 && Number(row.values[0]) === expected[index],
        ) &&
        text('adjust-summary').includes(summary),
    )
  } else if (
    id === 'set-date-day' &&
    complete('roller') &&
    complete('roller-row') &&
    complete('ok')
  ) {
    const rows = selectedRows()

    check(
      'actual day range and final OKcontrol',
      { rows, buttons: text('ok') },
      'one day1..31 andOK',
      rows.length === 1 &&
        rows[0].values.length === 1 &&
        Number(rows[0].values[0]) >= 1 &&
        Number(rows[0].values[0]) <= 31 &&
        text('ok').includes('OK'),
    )
    parameters.selectedDay = Number(rows[0]?.values[0])
    check(
      'full day-range boundary verification',
      'only currentlyvisible rows observed',
      '28/29/30/31 range endpoints andwrap traces',
      false,
    )
  } else if (
    /^set-date-(2000-feb29|2001-feb28|2000-april30|2000-january31|day-clamp|day-wrap)$/.test(id) &&
    complete('roller') &&
    complete('roller-row') &&
    complete('adjust-summary') &&
    complete('ok')
  ) {
    const expected = {
      'set-date-2000-feb29': [2000, 2, 29],
      'set-date-day-clamp': [2000, 2, 29],
      'set-date-day-wrap': [2000, 1, 1],
      'set-date-2001-feb28': [2001, 2, 28],
      'set-date-2000-april30': [2000, 4, 30],
      'set-date-2000-january31': [2000, 1, 31],
    }[id]
    const rows = selectedRows()
    const summary = `${expected[0]}-${String(expected[1]).padStart(2, '0')}-${String(expected[2]).padStart(2, '0')}`
    const roller = observed('roller')[0]
    const nextRows = observed('roller-row').filter(
      (row) =>
        roller &&
        Math.abs(row.x + row.width / 2 - roller.x - roller.width / 2) <= 0.5 &&
        Math.abs(row.y + row.height / 2 - roller.y - roller.height / 2 - 46) <= 0.5,
    )

    check(
      'actual last selected date and summary',
      { rows, summary: text('adjust-summary') },
      summary,
      rows.length === 1 &&
        rows[0].values.length === 1 &&
        Number(rows[0].values[0]) === expected[2] &&
        text('adjust-summary').includes(summary) &&
        text('ok').includes('OK'),
    )
    check(
      'actual visible next row matches source calendar sequence',
      nextRows.map((row) => row.text),
      [id === 'set-date-day-wrap' ? '2' : '1'],
      nextRows.length > 0 &&
        nextRows.every((row) => Number(row.text) === (id === 'set-date-day-wrap' ? 2 : 1)),
    )
    parameters.calendarFixture = expected
    if (id === 'set-date-day-clamp') {
      check(
        'actual prior month controls readback',
        observations.beforeNext?.['adjust-summary']?.nodes?.map((node) => node.text),
        '2000-02',
        observations.beforeNext?.['adjust-summary']?.nodes?.some(
          (node) => node.text === '2000-02',
        ) === true,
      )
    }
  } else if (id.startsWith('about-') && complete('crash-progress')) {
    const progress = Number(text('crash-progress')[0]?.match(/^(\d+)% Complete$/)?.[1])

    parameters.actualProgress = progress
    if (id === 'about-start') {
      check('actual zero progress', progress, 0, progress === 0)
    }
  } else if (
    ['badge-empty', 'badge-edit-cancel'].includes(id) &&
    complete('badge-hint') &&
    complete('dialog')
  ) {
    check(
      'actual empty badge hint',
      text('badge-hint'),
      'Tap and hold to change image',
      text('badge-hint').includes('Tap and hold to change image'),
    )
    check('actual edit overlay absent', text('dialog'), [], text('dialog').length === 0)
  } else if (id === 'badge-edit-dialog' && complete('dialog')) {
    check(
      'actual badge edit prompt/actions',
      text('dialog'),
      'Enter badge edit?/Edit/Cancel',
      text('dialog').some(
        (value) => /Enter badge edit\?/.test(value) && /Edit/.test(value) && /Cancel/.test(value),
      ),
    )
  }

  const comparisonParameters = {}

  if (id.startsWith('button-') && complete('switch') && observed('switch').length === 2) {
    const flags = observed('switch').sort((a, b) => a.y - b.y)

    comparisonParameters.sfx = flags[0].selected_class === 1
    comparisonParameters.vibration = flags[1].selected_class === 1
  }

  if (/^(brightness|volume)-/.test(id) && complete('percentage')) {
    comparisonParameters.value = Number(text('percentage')[0])
  }

  if (id.startsWith('set-date-') && complete('adjust-summary')) {
    const date = text('adjust-summary')[0]?.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/)

    if (date) {
      comparisonParameters.year = Number(date[1])
      comparisonParameters.month = Number(date[2])
      if (date[3]) {
        comparisonParameters.day = Number(date[3])
      }
    }
  }

  if (
    (id.startsWith('alarms-') ||
      ['alarm-deleted', 'alarm-delete-cancel', 'alarm-hold-cancel'].includes(id)) &&
    complete('alarm-row')
  ) {
    comparisonParameters.alarmTimes = text('alarm-row').map((value) => value.replace(/\s/g, ''))
  }

  if (id.startsWith('alarm-add') && complete('roller') && complete('roller-row')) {
    const values = selectedRows()

    if (values.length === 2 && values.every((row) => row.values.length === 1)) {
      comparisonParameters.time = values
        .map((row) => String(Number(row.values[0])).padStart(2, '0'))
        .join(':')
    }
  }

  if (
    ['alarm-triggered', 'alarm-single-triggered', 'alarm-queued-second'].includes(id) &&
    complete('ringing')
  ) {
    comparisonParameters.time = text('ringing')
      .join(' ')
      .match(/\d{2}:\d{2}/)?.[0]
  }

  return {
    stateVerified: assertions.length > 0 && assertions.every((entry) => entry.matches),
    assertions,
    parameters,
    comparisonParameters,
  }
}

async function collectExtraControls(id) {
  let classes = []

  if (/^(alarms-|alarm-deleted|alarm-delete-cancel|alarm-hold-cancel)/.test(id)) {
    classes = ['alarm-row', 'switch', 'dialog', 'list-button']
  } else if (id.startsWith('alarm-add')) {
    classes = ['roller', 'roller-row', 'adjust-title']
  } else if (id === 'alarm-delete-dialog' || id === 'badge-edit-dialog') {
    classes = ['dialog']
  } else if (
    [
      'alarm-triggered',
      'alarm-single-triggered',
      'alarm-queued-second',
      'alarm-dismissed',
    ].includes(id)
  ) {
    classes = ['ringing', 'alarm-row']
  } else if (id.startsWith('settings-')) {
    classes = ['settings', 'list-button']
  } else if (/^(brightness|volume)-/.test(id)) {
    classes = ['percentage', 'slider-fill', 'slider-knob']
  } else if (id.startsWith('button-')) {
    classes = ['switch']
  } else if (id.startsWith('set-')) {
    classes = ['roller', 'roller-row', 'ok', 'adjust-summary']
  } else if (id.startsWith('about-')) {
    classes = ['crash-progress']
  } else if (id.startsWith('badge-')) {
    classes = ['badge-hint', 'dialog']
  }

  const observations = {}

  for (const name of classes) {
    const line = await device.command(`GEADEV SCROLLSTATE ${name}`, ['SWSCROLL '], 15000)
    const value = JSON.parse(line.slice(line.indexOf('{')))

    if (
      value.nodes_dropped !== 0 ||
      value.nodes.some((node) => !['settings', 'roller'].includes(name) && node.text_truncated)
    ) {
      throw new Error(`${id}: incomplete control readback ${name}`)
    }

    observations[name] = value
  }

  if (['alarms-multiple', 'alarms-scrolled', 'alarm-hold-cancel'].includes(id)) {
    observations.listNode = await geadev.node(device, 'list')
  }

  return observations
}

async function drag(...args) {
  actions.push({ action: 'drag', arguments: args })
  await geadev.drag(device, ...args)
}

let menuIndex = null

async function key(code) {
  actions.push({ action: 'key', code })
  await geadev.key(device, code)
  await wait(650)
}

async function tap(x = 233, y = 233, hold = 80) {
  x = Math.round(x)
  y = Math.round(y)
  actions.push({ action: 'tap', x, y, hold })
  await geadev.tap(device, x, y, hold)
  await wait(400)
}

async function open(index) {
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

  await tap(233, 220)
}

async function capture(
  id,
  description,
  expectedClass,
  normalizeClock = true,
  sequenceEvidence = {},
) {
  await wait(700)
  let node = ''

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      node = await device.command(`GEADEV NODE ${expectedClass}`, ['GEADEV:NODE'], 8000)
      break
    } catch (error) {
      if (attempt === 2) {
        throw error
      }

      await device.writeRaw('\n')
      await wait(300)
    }
  }

  if (!node.includes(`class=${expectedClass} `) || node.includes('none=1')) {
    throw new Error(`${id}: incorrect route: ${node}`)
  }

  if (normalizeClock) {
    actions.push({ action: 'setTime', seconds: Date.UTC(2000, 0, 28, 11, 26, 0) / 1000 })
    await geadev.setTime(device, Date.UTC(2000, 0, 28, 11, 26, 0) / 1000)
    await wait(500)
  }

  const observations = { ...(await collectExtraControls(id)), ...sequenceEvidence }
  let image

  try {
    image = await captureUploadedFrame(device)
  } catch (error) {
    await device.command('GEADEV UPLOADSHOT DISARM', ['GEADEV:OK UPLOADSHOT'], 15000)
    throw error
  }

  const verified = verifyExtraState(id, image, observations)

  writeImage(`${destination}${id}.png`, image.width, image.height, image.rgb)
  const [manifestScreenId, manifestState] = captureStates[id] || []

  if (
    !manifest.screens.some(
      (entry) => entry.id === manifestScreenId && entry.states.includes(manifestState),
    )
  ) {
    throw new Error(`${id}: missing manifest state mapping`)
  }

  if (image.width !== 466 || image.height !== 466) {
    throw new Error(`${id}: invalid dimensions`)
  }

  results.push({
    ...artifactIdentity,
    id,
    description,
    expectedClass,
    node,
    manifestScreenId,
    manifestState,
    stateVerified: verified.stateVerified,
    parameters: verified.parameters,
    comparisonParameters: verified.comparisonParameters,
    captureTransport: image.captureTransport,
    stateEvidence: {
      assertion:
        'Actual public control observations are asserted where sufficient; unsupported dynamic classes remain unverified',
      assertions: verified.assertions,
      observations,
      actionHistory: actions.slice(),
    },
    wallClockReadbackVerified: false,
    diagnosticHardwareMuteAsserted: true,
    pixelGeometry: {
      rawSize: [466, 466],
      crop: [0, 0, 466, 466],
      evidence: 'GEADEV native logical display dimensions',
    },
    capturedAt: new Date().toISOString(),
  })
  writeFileSync(`${destination}results-extra.json`, `${JSON.stringify(results, null, 2)}\n`)
  console.log(`captured ${id}`)
}

async function nodes(className, count) {
  await device.drainInput()
  await device.writeLine(`GEADEV NODE ${className}`)
  const found = []
  const deadline = Date.now() + 10000

  while (Date.now() < deadline && found.length < count) {
    const line = await device.readLine(1000)
    const frame = line ? geadevFragment(line) : ''

    if (frame.includes(`class=${className} `)) {
      found.push(frame)
    }
  }

  if (found.length !== count) {
    throw new Error(`Expected ${count} ${className} nodes; received ${found.length}`)
  }

  return found
}

async function setting(index) {
  await open(7)
  for (let attempt = 0; attempt < 8; attempt++) {
    const rows = await nodes('list-button', 6)
    const match = rows[index].match(
      /corners=([\d.-]+),([\d.-]+);([\d.-]+),([\d.-]+);([\d.-]+),([\d.-]+)/,
    )

    if (!match) {
      throw new Error(`No projected bounds: ${rows[index]}`)
    }

    const y = (Number(match[2]) + Number(match[6])) / 2

    if (y > 90 && y < 400) {
      await tap(233, y)

      return y
    }

    await drag(233, 360, 233, 150, 10, 70)
    await wait(700)
  }

  throw new Error(`Could not reach settings row ${index}`)
}

async function openAlarmAddFromList() {
  for (let attempt = 0; attempt < 12; attempt++) {
    const [button] = await nodes('list-button', 1)
    const match = button.match(
      /corners=([\d.-]+),([\d.-]+);([\d.-]+),([\d.-]+);([\d.-]+),([\d.-]+)/,
    )

    if (!match) {
      throw new Error('AlarmAdd control lacks actual geometry')
    }

    const y = (Number(match[2]) + Number(match[6])) / 2

    if (y > 90 && y < 400) {
      await tap(233, y)

      return
    }

    await drag(233, 370, 233, 140, 10, 70)
    await wait(700)
  }

  throw new Error('Could not reach Add control in overflowing alarm list')
}

const journey = { ...artifactIdentity, tour: 'extra', before: null, after: null, completed: false }

try {
  journey.before = await readJourneySnapshot(device)
  await device.command('GEADEV CLOCKFREEZE 0', ['GEADEV:OK CLOCKFREEZE'], 15000)
  await open(0)
  if (!resumeQueued) {
    await capture('alarms-empty', 'Empty persistent alarm list', 'list')
    await tap(233, 140)
    await capture('alarm-add', 'Add alarm initializes 07:00', 'adjust')
    await drag(323, 220, 323, 266, 6, 150)
    await capture(
      'alarm-add-minute-wrap',
      'Minute 00 wraps to 59 after slow downward drag',
      'adjust',
    )
    await tap(233, 390)
    await capture('alarms-enabled', 'Saved 07:59 alarm enabled', 'alarm-row')
    await tap(345, 140)
    await capture('alarms-disabled', 'Alarm disabled by switch', 'alarm-row')
    await tap(345, 140)
    await tap(160, 140, 650)
    await capture('alarm-delete-dialog', 'Long press opens deletion confirmation', 'dialog')
    await tap(320, 275)
    await capture('alarm-delete-cancel', 'Cancel preserves the alarm', 'alarm-row')
    await geadev.setTime(device, Date.UTC(2000, 0, 28, 7, 59, 1) / 1000)
    await capture(
      'alarm-single-triggered',
      'Matching daily alarm enters alert overlay',
      'ringing',
      false,
    )
    await tap(233, 330)
    await tap(160, 140, 650)
    await tap(140, 275)
    await capture('alarm-deleted', 'Delete removes the alarm and persists the list', 'list')
  }

  if (!resumeOverflow) {
    for (let row = 0; row < 2; row++) {
      await openAlarmAddFromList()
      await drag(323, 220, 323, 266, 6, 150)
      await tap(233, 390)
    }

    await geadev.setTime(device, Date.UTC(2000, 0, 28, 7, 59, 1) / 1000)
    await capture('alarm-triggered', 'First of two simultaneous07:59 alarms', 'ringing', false)
    await tap(233, 330)
    await capture(
      'alarm-queued-second',
      'Second actual overlay after dismissing first',
      'ringing',
      false,
    )
    await tap(233, 330)
    await capture('alarm-dismissed', 'Second dismissal returns to actual two-row list', 'list')
  }

  for (let row = 0; row < 4; row++) {
    await openAlarmAddFromList()
    await tap(233, 390)
  }

  await capture('alarms-multiple', 'Six actual alarm rows exceed display height', 'list')
  await drag(233, 370, 233, 170, 5, 70)
  await capture('alarms-scrolled', 'Overflow alarm list after normal vertical drag', 'list')
  const holdControls = await collectExtraControls('alarm-hold-cancel')
  const scrollY = Number(holdControls.listNode.match(/scroll=[\d.-]+,([\d.-]+)/)?.[1] || 0)
  const heldRow = holdControls['alarm-row'].nodes.find((row) => {
    const center = row.y + row.height / 2

    return center > 100 && center < 330
  })

  if (!heldRow) {
    throw new Error('No actual alarm row available for hold-cancel recipe')
  }

  const heldY = Math.round(heldRow.y + heldRow.height / 2)

  await device.command('GEADEV INPUTTRACE BEGIN', ['GEADEV:OK INPUTTRACE'], 15000)
  await device.command(`GEADEV TOUCH down 144 ${heldY}`, ['GEADEV:OK TOUCH'], 15000)
  await wait(250)
  await device.command(`GEADEV TOUCH move 144 ${heldY - 60}`, ['GEADEV:OK TOUCH'], 15000)
  await wait(650)
  await device.command(`GEADEV TOUCH up 144 ${heldY - 60}`, ['GEADEV:OK TOUCH'], 15000)
  const holdCancelTrace = await device.command('GEADEV INPUTTRACE END', ['SWINPUT '], 15000)

  actions.push({
    action: 'alarmHoldCanceledByScroll',
    heldY,
    requestedHoldBeforeMoveMs: 250,
    requestedHoldAfterMoveMs: 650,
    holdCancelTrace,
  })
  await capture(
    'alarm-hold-cancel',
    'Normal held-row movement before long-press threshold; no Delete modal',
    'list',
    true,
    { holdCancelTrace, beforeScroll: scrollY },
  )
  await open(7)
  await capture('settings-device', 'Settings: Device section', 'settings')
  await drag(233, 360, 233, 150, 10, 70)
  await capture('settings-date', 'Settings: Time and Date section after scrolling', 'settings')
  await drag(233, 360, 233, 150, 10, 70)
  await capture('settings-firmware', 'Settings: Firmware section after scrolling', 'settings')
  await setting(0)
  await capture('brightness-initial', 'Brightness control', 'percentage')
  await tap(46, 225)
  await capture('brightness-min', 'Brightness lower limit 10', 'percentage')
  await drag(46, 225, 420, 225, 8, 40)
  await capture('brightness-max', 'Brightness drag upper limit 100', 'percentage')
  await tap(233, 390)
  await setting(1)
  await capture('volume-initial', 'Volume control', 'percentage')
  await tap(46, 225)
  await capture('volume-min', 'Volume lower limit 0', 'percentage')
  await drag(46, 225, 420, 225, 8, 40)
  await capture('volume-max', 'Volume drag upper limit 100', 'percentage')
  await tap(65, 225)
  await capture('volume-step5', 'Actual slider value5 before save', 'percentage')
  const savedVolume = Number((await collectExtraControls('volume-step5')).percentage.nodes[0]?.text)

  if (savedVolume !== 5) {
    throw new Error('Volume5 boundary preparation failed; actual public readback is not5')
  }

  await tap(233, 390)
  await setting(1)
  await capture(
    'volume-reopened',
    'Saved value5 survives worker reopen; reboot persistence not inferred',
    'percentage',
    true,
    { beforeSave: savedVolume },
  )
  // Preserve the sleeping user's saved mute preference after boundary capture.
  await tap(46, 225)
  await tap(233, 390)
  await setting(2)
  const initialButtons = (await collectExtraControls('button-default')).switch.nodes.sort(
    (a, b) => a.y - b.y,
  )

  for (let index = 0; index < initialButtons.length; index++) {
    if (initialButtons[index].selected_class !== 1) {
      await tap(345, index === 0 ? 145 : 250)
    }
  }

  await capture('button-default', 'Button sound and vibration switches', 'button-setting')
  await tap(345, 145)
  await capture('button-sfx-toggle', 'Button sound switch toggled', 'button-setting')
  await tap(345, 250)
  await capture('button-both-toggle', 'Vibration switch toggled', 'button-setting')
  await tap(345, 145)
  await capture(
    'button-vibration-only',
    'Source filename retained: actual SFXonly10 fourth finite switch combination',
    'button-setting',
  )
  await tap(345, 250)
  const beforeSave = (await collectExtraControls('button-default')).switch.nodes
    .sort((a, b) => a.y - b.y)
    .map((node) => node.selected_class)

  if (beforeSave.length !== 2 || beforeSave.some((value) => value !== 1)) {
    throw new Error('Factory11 save/reopen preparation failed; actual controls are not bothon')
  }

  await tap(233, 390)
  await setting(2)
  await capture(
    'button-reopened-muted',
    'Source filename retained: actual saved11 survives workerreopen; reboot persistence untested',
    'button-setting',
    true,
    { beforeSave },
  )
  await tap(345, 145)
  await tap(345, 250)
  const restoredQuiet = (await collectExtraControls('button-default')).switch.nodes

  if (restoredQuiet.length !== 2 || restoredQuiet.some((node) => node.selected_class !== 0)) {
    throw new Error('Quiet preference restoration failed; refusing to save nonzero flags')
  }

  await tap(233, 390)
  await setting(3)
  await capture('set-time', 'Hour, minute and second rollers', 'time-adjust')
  await drag(233, 260, 233, 200, 4, 20)
  await capture('set-time-minute-momentum', 'Minute roller momentum', 'time-adjust')
  await setting(4)
  await capture('set-date-year-month', 'Date stage one: year and month rollers', 'date-adjust')
  await tap(233, 390)
  await capture('set-date-day', 'Date stage two: day roller and summary', 'date-adjust')
  for (const [id, year, month, day] of [
    ['set-date-2000-feb29', 2000, 2, 29],
    ['set-date-2001-feb28', 2001, 2, 28],
    ['set-date-2000-april30', 2000, 4, 30],
    ['set-date-2000-january31', 2000, 1, 31],
  ]) {
    const seconds = Date.UTC(year, month - 1, day, 11, 26, 0) / 1000

    actions.push({ action: 'calendarFixtureBeforeWorkerOpen', seconds, year, month, day })
    await geadev.setTime(device, seconds)
    await setting(4)
    await tap(233, 390)
    await capture(
      id,
      'Actual calendar endpoint and visible following row wrap',
      'date-adjust',
      false,
    )
    await key(27)
  }

  await geadev.setTime(device, Date.UTC(2000, 0, 31, 11, 26, 0) / 1000)
  await setting(4)
  await tap(328, 271)
  const beforeNext = await collectExtraControls('set-date-year-month')

  if (!beforeNext['adjust-summary'].nodes.some((node) => node.text === '2000-02')) {
    throw new Error('Day-clamp preparation failed: actual month summary is not2000-02')
  }

  await tap(233, 390)
  await capture(
    'set-date-day-clamp',
    'Jan31 changed to Feb; actual displayed day clamps to29',
    'date-adjust',
    false,
    { beforeNext },
  )
  await key(27)
  await geadev.setTime(device, Date.UTC(2099, 11, 31, 11, 26, 0) / 1000)
  await setting(4)
  await capture(
    'set-date-year2099-month12',
    'Actual2099-12 boundary controls',
    'date-adjust',
    false,
  )
  await tap(138, 271)
  await capture('set-date-year-wrap', 'Normal next-year row wraps2099 to2000', 'date-adjust', false)
  await tap(328, 271)
  await capture('set-date-month-wrap', 'Normal next-month row wraps12 to1', 'date-adjust', false)
  await tap(233, 390)
  await tap(233, 271)
  await capture('set-date-day-wrap', 'Normal next-day row wraps31 to1', 'date-adjust', false)
  await key(27)
  const versionY = await setting(5)

  for (let i = 1; i < 10; i++) {
    await tap(233, versionY)
  }

  await capture('about-start', 'Ten version taps open blue-screen joke', 'about')
  await wait(4000)
  await capture('about-progress', 'Blue-screen progress bursts', 'about')
  await open(0)
  await key(27)
  await drag(233, 5, 233, 90, 6, 30)
  await capture(
    'battery-visible',
    'Pull down from top shows battery and charging indication',
    'battery',
  )
  await tap(233, 20)
  await capture('battery-hidden', 'Battery tap hides overlay', 'menu-title')
  await open(3)
  await capture('badge-empty', 'Empty badge image hint', 'badge')
  await tap(233, 233, 650)
  await capture('badge-edit-dialog', 'Badge long press confirmation', 'dialog')
  await tap(320, 275)
  await capture('badge-edit-cancel', 'Badge edit cancellation', 'badge')
  await key(27)
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

  writeFileSync(`${destination}journey-extra.json`, JSON.stringify(journey, null, 2) + '\n')
  try {
    await device.command('GEADEV CLOCKFREEZE 0', ['GEADEV:OK CLOCKFREEZE'], 15000)
    await device.command('GEADEV UPLOADSHOT DISARM', ['GEADEV:OK UPLOADSHOT'], 15000)
  } finally {
    await device.close()
  }
}
