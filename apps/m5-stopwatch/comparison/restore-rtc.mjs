import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

import { SerialDevice, geadev } from '../../../../cli/src/device/serial.mjs'

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export function selectedRollerValues(observations) {
  return observations.roller.nodes
    .map((roller) => {
      const centerX = roller.x + roller.width / 2
      const centerY = roller.y + roller.height / 2
      const values = [
        ...new Set(
          observations['roller-row'].nodes
            .filter(
              (row) =>
                Math.abs(row.x + row.width / 2 - centerX) <= 0.5 &&
                Math.abs(row.y + row.height / 2 - centerY) <= 0.5,
            )
            .map((row) => Number(row.text)),
        ),
      ]

      if (values.length !== 1 || !Number.isInteger(values[0])) {
        throw new Error('Ambiguous actual selected roller readback')
      }

      return { centerX, value: values[0] }
    })
    .sort((left, right) => left.centerX - right.centerX)
    .map((row) => row.value)
}

export function verifyUtcReadback(fields, beforeMs, afterMs, toleranceSeconds = 15) {
  const [year, month, day, hour, minute, second] = fields

  if (fields.length !== 6 || fields.some((value) => !Number.isInteger(value))) {
    throw new Error('Actual date and time controls are required')
  }

  const epochMs = Date.UTC(year, month - 1, day, hour, minute, second)
  const normalized = new Date(epochMs)
  const matchesFields =
    normalized.getUTCFullYear() === year &&
    normalized.getUTCMonth() + 1 === month &&
    normalized.getUTCDate() === day &&
    normalized.getUTCHours() === hour &&
    normalized.getUTCMinutes() === minute &&
    normalized.getUTCSeconds() === second
  const nearHostUtc =
    matchesFields &&
    epochMs >= beforeMs - toleranceSeconds * 1000 &&
    epochMs <= afterMs + toleranceSeconds * 1000

  return { fields, epochMs, hostWindowMs: [beforeMs, afterMs], toleranceSeconds, nearHostUtc }
}

async function controls(device, names) {
  const result = {}

  for (const name of names) {
    const line = await device.command(`GEADEV SCROLLSTATE ${name}`, ['SWSCROLL '], 15000)
    const value = JSON.parse(line.slice(line.indexOf('{')))

    if (value.nodes_dropped !== 0 || value.nodes.some((node) => node.text_truncated)) {
      throw new Error(`Incomplete actual control observations: ${name}`)
    }

    result[name] = value
  }

  return result
}

async function openSettings(device) {
  await geadev.key(device, 27)
  await wait(500)
  for (let index = 0; index < 8; index++) {
    const actual = await controls(device, ['menu-title'])

    if (actual['menu-title'].nodes.some((node) => node.text === 'Settings')) {
      await geadev.tap(device, 233, 220, 80)
      await wait(500)

      return
    }

    await geadev.key(device, 39)
    await wait(500)
  }

  throw new Error('Actual Settings launcher title not found')
}

async function openWorker(device, title) {
  await openSettings(device)
  for (let attempt = 0; attempt < 10; attempt++) {
    const actual = await controls(device, ['settings', 'list-button'])
    const panel = actual.settings.nodes[0]
    const button = actual['list-button'].nodes.find((node) => node.text === title)

    if (!panel || !button) {
      throw new Error(`Actual Settings control missing: ${title}`)
    }

    const y = Math.round(button.y + button.height / 2)

    if (y > 90 && y < 400) {
      await geadev.tap(device, 233, y, 80)
      await wait(400)

      return actual
    }

    await geadev.drag(device, 233, 360, 233, 150, 10, 70)
    await wait(600)
  }

  throw new Error(`Actual Settings worker not reachable: ${title}`)
}

export async function restoreRtc({ port, backupRestored, hardwareMuteVerified, output }) {
  if (backupRestored !== true || hardwareMuteVerified !== true) {
    throw new Error(
      'Root must finish original backup restore and verify diagnostic physical mute before RTC restoration',
    )
  }

  let device = await SerialDevice.open({ path: port })
  const receipt = {
    source:
      'normal Settings Time OK writes full RX8130CE date/time; SETTIME changes system clock only',
    alarmsModified: false,
  }

  try {
    await device.command('GEADEV CLOCKFREEZE 0', ['GEADEV:OK CLOCKFREEZE'], 15000)
    await openSettings(device)
    const requestedEpochSeconds = Math.floor(Date.now() / 1000)
    const acknowledgement = await geadev.setTime(device, requestedEpochSeconds)

    await openWorker(device, 'Set Time')
    const beforeSave = await controls(device, ['roller', 'roller-row'])
    const values = selectedRollerValues(beforeSave)
    const wanted = new Date(requestedEpochSeconds * 1000)

    if (
      values.length !== 3 ||
      values[0] !== wanted.getUTCHours() ||
      values[1] !== wanted.getUTCMinutes()
    ) {
      throw new Error('Current UTC was not loaded into actual Time controls; refusing RTC save')
    }

    await geadev.tap(device, 233, 390, 80)
    await wait(500)
    const savedSettingsNode = await geadev.node(device, 'settings')

    if (savedSettingsNode.includes('none=1') || !savedSettingsNode.includes('class=settings ')) {
      throw new Error('Normal Time OK did not return to Settings; RTC save may have failed')
    }

    receipt.savedSettingsNode = savedSettingsNode
    receipt.systemSetTime = {
      requestedEpochSeconds,
      acknowledgement,
      beforeSave,
      selectedTime: values,
    }
    await geadev.reboot(device)
    await device.close()
    device = null
    await wait(3500)
    device = await SerialDevice.open({ path: port })
    const readBeforeMs = Date.now()

    await openWorker(device, 'Set Date')
    const yearMonth = await controls(device, ['roller', 'roller-row'])
    const dateValues = selectedRollerValues(yearMonth)

    await geadev.tap(device, 233, 390, 80)
    await wait(400)
    const day = await controls(device, ['roller', 'roller-row'])
    const dayValues = selectedRollerValues(day)

    await geadev.key(device, 27)
    await openWorker(device, 'Set Time')
    const time = await controls(device, ['roller', 'roller-row'])
    const timeValues = selectedRollerValues(time)
    const readAfterMs = Date.now()
    const verification = verifyUtcReadback(
      [...dateValues, ...dayValues, ...timeValues],
      readBeforeMs,
      readAfterMs,
    )

    receipt.afterReboot = { yearMonth, day, time, verification }
    if (!verification.nearHostUtc) {
      throw new Error('Actual post-reboot calendar/time controls do not match host UTC window')
    }

    await geadev.key(device, 27)
    receipt.verified = true

    return receipt
  } finally {
    try {
      if (output) {
        writeFileSync(output, JSON.stringify(receipt, null, 2) + '\n')
      }
    } finally {
      await device?.close()
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2)
  const port = args[args.indexOf('--port') + 1]
  const output = args.includes('--output') ? args[args.indexOf('--output') + 1] : undefined

  if (!args.includes('--port') || !args.includes('--backup-restored')) {
    throw new Error('Usage: --port PATH --backup-restored [--output durable-receipt.json]')
  }

  await restoreRtc({
    port,
    output,
    backupRestored: true,
    hardwareMuteVerified: process.env.STOPWATCH_DIAGNOSTIC_MUTED === '1',
  })
}
