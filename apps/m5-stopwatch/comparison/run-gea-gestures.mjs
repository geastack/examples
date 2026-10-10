// Run shared staged gestures through the normal native input path.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { SerialDevice, geadev, parseKeyValues } from '../../../../cli/src/device/serial.mjs'
import { executeGesturePlan } from './execute-gesture-plan.mjs'
import { addedAlarmLabels } from './gesture-outcome.mjs'

const { values } = parseArgs({
  options: {
    port: { type: 'string' },
    'build-report': { type: 'string' },
    cases: { type: 'string' },
    'output-dir': { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
  },
})
const plan = JSON.parse(readFileSync(new URL('./gesture-plan.json', import.meta.url)))
const selected = values.cases ? values.cases.split(',') : plan.cases.map((entry) => entry.id)

if (
  !selected.length ||
  new Set(selected).size !== selected.length ||
  selected.some((id) => !plan.cases.some((entry) => entry.id === id))
) {
  throw new Error('Select existing, unique shared gesture case IDs')
}

if (values['dry-run']) {
  console.log(
    JSON.stringify(
      {
        cases: selected,
        coldBootPerCase: true,
        normalInputPath: true,
        usbDuringPlayback: false,
        committedRollerOutcome:
          'Ordinary AlarmAdd OK then actual alarm-row text; no internal Store getter',
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

if (!values.port || !values['build-report']) {
  throw new Error('Use --port and --build-report for a root-authorized, exclusively owned device')
}

const build = JSON.parse(readFileSync(values['build-report'], 'utf8'))

if (
  build.framework !== 'gea' ||
  !build.gea_defines?.includes('GEA_EMBEDDED_COMPARISON_BENCHMARK=1')
) {
  throw new Error('Retained artifact must declare the benchmark flag with physical output clamps')
}

const destination =
  values['output-dir'] ||
  fileURLToPath(new URL('../../../reports/m5-stopwatch/gestures/gea', import.meta.url))

mkdirSync(destination, { recursive: true })
for (const id of selected) {
  if (
    existsSync(path.join(destination, `${id}.json`)) ||
    existsSync(path.join(destination, `${id}.log`))
  ) {
    throw new Error(`Preserve existing receipt: ${id}`)
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let device
let currentLog
let deviceMac
let initialAlarmLabels = []
const log = (line) => {
  if (currentLog) {
    appendFileSync(currentLog, `${line}\n`)
  }
}

async function connect() {
  let lastError

  for (let attempt = 0; attempt < 12; attempt++) {
    let opened

    try {
      opened = await SerialDevice.open({ path: values.port })
      const read = opened.readLine.bind(opened)
      const write = opened.writeLine.bind(opened)

      opened.readLine = async (timeout) => {
        const line = await read(timeout)

        if (line !== null) {
          log(line)
        }

        return line
      }

      opened.writeLine = async (line) => {
        log(`# HOST ${new Date().toISOString()} ${line}`)

        return write(line)
      }

      const identity = parseKeyValues(await geadev.ping(opened))

      if (identity.app !== 'm5-stopwatch' || (deviceMac && identity.mac !== deviceMac)) {
        throw new Error('Unexpected application or changed connected board')
      }

      deviceMac = identity.mac

      return opened
    } catch (error) {
      lastError = error
      if (opened) {
        await opened.close()
      }

      await wait(500)
    }
  }

  throw lastError
}

async function key(code) {
  await geadev.key(device, code)
  await wait(650)
}

async function tap(x, y) {
  await geadev.tap(device, x, y, 80)
  await wait(650)
}

async function scroll() {
  let lastError

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const line = await device.command('GEADEV SCROLLSTATE', ['SWSCROLL '], 15000)
      const result = JSON.parse(line.slice(line.indexOf('SWSCROLL ') + 9))

      if (
        result.nodes_dropped !== 0 ||
        result.nodes.some(
          (node) =>
            !['settings', 'roller', 'roller-track'].includes(node.class) && node.text_truncated,
        )
      ) {
        throw new Error('Native state evidence was truncated')
      }

      return result
    } catch (error) {
      lastError = error
      log(`# HOST read-only SCROLLSTATE retry ${attempt + 1}: ${error.message}`)
      await wait(100)
    }
  }

  throw lastError
}

const adapter = {
  // Verification is retained image/define/source provenance, not live register readback.
  hardwareMuteVerified: true,
  async prepare(recipe) {
    if (!device) {
      device = await connect()
    }

    await geadev.reboot(device)
    await device.close()
    device = null
    await wait(6500)
    device = await connect()
    await geadev.setTime(device, Date.UTC(2000, 0, 28, 11, 26, 0) / 1000)
    await key(27)
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
    const menu = await scroll()
    const title = menu.nodes.find((node) => node.class === 'menu-title')?.text
    let page = titles.indexOf(title)

    if (page < 0) {
      throw new Error('Actual initial launcher selection is unavailable')
    }

    const target = recipe.scene === 'settings-list' ? 7 : 0

    while (page !== target) {
      await key(39)
      page = (page + 1) % titles.length
    }

    if (recipe.scene === 'roller') {
      await tap(233, 220)
      initialAlarmLabels = (await scroll()).nodes
        .filter((node) => node.class === 'alarm-row')
        .map((node) => node.text)
      let addVisible = false

      for (let attempt = 0; attempt < 12; attempt++) {
        const list = await scroll()
        const add = list.nodes.find((node) => node.class === 'list-button' && node.text === 'Add')

        if (!add) {
          throw new Error('Actual alarm Add control is missing')
        }

        const y = Math.round((add.corners[0][1] + add.corners[2][1]) / 2)
        const x = Math.round((add.corners[0][0] + add.corners[2][0]) / 2)

        if (y > 90 && y < 400) {
          await tap(x, y)
          addVisible = true
          break
        }

        await geadev.drag(device, 233, 370, 233, 140, 10, 70)
        await wait(650)
      }

      if (!addVisible) {
        throw new Error('Actual alarm Add control could not be reached normally')
      }
    } else if (recipe.scene === 'settings-list') {
      await tap(233, 220)
    }

    await wait(800)
    const state = await scroll()
    const expectedClass = {
      launcher: 'menu-title',
      roller: 'adjust-title',
      'settings-list': 'section-title',
    }[recipe.scene]
    const expectedLabel = {
      launcher: 'AlarmClock',
      roller: 'Add Alarm',
      'settings-list': 'Device',
    }[recipe.scene]

    if (!state.nodes.some((node) => node.class === expectedClass && node.text === expectedLabel)) {
      throw new Error(`Initial route evidence missing for ${recipe.id}: ${expectedLabel}`)
    }

    if (recipe.scene === 'roller') {
      const picker = state.nodes.filter(
        (node) => node.class === 'roller' && node.x <= 144 && node.x + node.width > 144,
      )

      if (
        picker.length !== 1 ||
        !state.nodes.some(
          (node) =>
            node.class === 'roller-row' &&
            node.text === '07' &&
            node.x + node.width / 2 === picker[0].x + picker[0].width / 2 &&
            node.y + node.height / 2 === picker[0].y + picker[0].height / 2,
        )
      ) {
        throw new Error('Initial hour picker is not visibly centered on 07')
      }
    }

    return {
      route: recipe.requiredRoute,
      stateEvidence: { scroll: state, verifiedLabel: expectedLabel },
      coldBoot: true,
    }
  },
  async runScheduled({ events, observeAtMs }) {
    await device.command('GEADEV GESTURE RESET', ['GEADEV:OK GESTURE RESET'])
    for (const event of events) {
      await device.command(
        `GEADEV GESTURE TOUCH ${event.atMs} ${event.type === 'up' ? 0 : 1} ${event.x} ${event.y}`,
        ['GEADEV:OK GESTURE TOUCH'],
      )
    }

    for (const at of observeAtMs) {
      await device.command(`GEADEV GESTURE OBSERVE ${at}`, ['GEADEV:OK GESTURE OBSERVE'])
    }

    await device.command('GEADEV GESTURE BEGIN', ['GEADEV:OK GESTURE BEGIN'])
    // No transport reads or writes while the complete recipe plays on the device clock.
    await wait(Math.max(...observeAtMs) + 400)
    const line = await device.command('GEADEV GESTURE RESULT', ['SWGESTURE '], 30000)
    const raw = JSON.parse(line.slice(line.indexOf('SWGESTURE ') + 10))

    await device.command('GEADEV GESTURE CLEAR', ['GEADEV:OK GESTURE CLEAR'])
    const normal = raw.normal_input_authority === 'TouchRuntime consumed dispatch'

    return {
      raw,
      normalHalVerified: normal,
      pointerReadTimes: raw.pointer_reads.map((row) => (row[0] - raw.clock_origin_us) / 1000),
      samples: raw.observations.map((row) => ({
        requestedAtMs: row.requested_at_ms,
        actualAtMs: (row.actual_at_us - raw.clock_origin_us) / 1000,
        nodes: row.nodes,
        nodesDropped: row.nodes_dropped,
      })),
    }
  },
}

try {
  for (const id of selected) {
    currentLog = path.join(destination, `${id}.log`)
    writeFileSync(currentLog, '')
    let receipt

    try {
      receipt = await executeGesturePlan(adapter, plan, id)
      receipt.framework = 'gea'
      receipt.hardwareMuteVerified = true
      receipt.hardwareMuteVerification =
        'Flashed artifact selected by root, retained diagnostic define and source guards; no live hardware-register readback'
      receipt.firmware = build.app_image
      receipt.deviceMac = deviceMac
      receipt.coordinateMapping = {
        rawToLogicalSubtract: [0, 0],
        evidence: 'StopWatch target and shared gesture recipe use 466x466 logical coordinates',
      }
      receipt.finalState = await scroll()
      if (receipt.recipe.scene === 'roller') {
        await tap(233, 390)
        const confirmed = await scroll()
        const labels = confirmed.nodes
          .filter((node) => node.class === 'alarm-row')
          .map((node) => node.text)
        const difference = addedAlarmLabels(initialAlarmLabels, labels)

        receipt.committedOutcome = {
          kind: 'alarm-hour-minute-label',
          ordinaryUiConfirmed: difference.added.length === 1 && difference.removed.length === 0,
          value:
            difference.added.length === 1 && difference.removed.length === 0
              ? difference.added[0]
              : null,
          evidence: {
            action: 'Ordinary AlarmAdd OK',
            before: initialAlarmLabels,
            after: labels,
            difference,
            state: confirmed,
          },
          comparisonAvailable: difference.added.length === 1 && difference.removed.length === 0,
        }
      }

      receipt.evidenceComplete =
        receipt.observed.raw.pointer_reads_dropped === 0 &&
        receipt.observed.raw.observations.every((row) => row.nodes_dropped === 0) &&
        receipt.normalHalVerified
      writeFileSync(path.join(destination, `${id}.json`), `${JSON.stringify(receipt, null, 2)}\n`)
      console.log(
        `${id}: ${receipt.observed.raw.pointer_reads.length} consumed events, ${receipt.observed.raw.observations.length} observations`,
      )
    } catch (error) {
      writeFileSync(
        path.join(destination, `${id}.json`),
        `${JSON.stringify({ ...receipt, caseId: id, error: error.message }, null, 2)}\n`,
      )
      throw error
    }
  }
} finally {
  if (device) {
    try {
      await device.command('GEADEV GESTURE CLEAR', ['GEADEV:OK GESTURE CLEAR'])
    } catch (error) {
      log(`# HOST diagnostic cleanup failed: ${error.message}`)
    }

    await device.close()
  }
}
