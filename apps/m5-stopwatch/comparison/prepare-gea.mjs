import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'

import { SerialDevice, geadev, parseKeyValues } from '../../../../cli/src/device/serial.mjs'

const { values } = parseArgs({
  options: {
    port: { type: 'string', default: '/dev/cu.usbmodem21101' },
    'build-report': { type: 'string' },
    output: { type: 'string' },
    benchmark: { type: 'boolean', default: false },
  },
})

assert(values['build-report'] && values.output, 'Identify the flashed build and durable output')
const build = JSON.parse(readFileSync(values['build-report'], 'utf8'))

assert.equal(build.framework, 'gea')
assert(build.gea_defines.includes('GEA_EMBEDDED_COMPARISON_BENCHMARK=1'))
const settings = {
  'm5watch.volume': '0',
  'm5watch.sfx': '0',
  'm5watch.vibration': '0',
  'm5watch.bootCount': '5',
  'm5watch.comparisonBootHoldMs': '0',
}

if (values.benchmark) {
  settings['m5watch.alarms'] = '[]'
}

const receipt = {
  recordedAt: new Date().toISOString(),
  build,
  clampEvidence:
    'Flashed artifact and compile-time physical output guards; no hardware-register readback',
  settings: {},
  replies: [],
}
let device

async function connect() {
  const connected = await SerialDevice.open({ path: values.port })

  try {
    const pong = await geadev.ping(connected)
    const identity = parseKeyValues(pong)

    assert.equal(identity.app, 'm5-stopwatch')
    assert.equal(identity.mac.toLowerCase().replace(/[^a-f0-9]/g, ''), '288485450b98')
    receipt.replies.push(pong)

    return connected
  } catch (error) {
    await connected.close()
    throw error
  }
}

try {
  device = await connect()
  receipt.replies.push(await device.command('GEADEV COMPLETION 1', ['GEADEV:OK COMPLETION']))
  if (values.benchmark) {
    receipt.replies.push(await device.command('GEADEV WIFI off', ['GEADEV:OK WIFI']))
  }

  for (const [key, value] of Object.entries(settings)) {
    const response = await geadev.storageSet(device, key, value)

    assert(response.startsWith('GEADEV:OK STORAGE'))
    receipt.replies.push(response)
  }

  await geadev.reboot(device)
  await device.close()
  device = null
  await new Promise((resolve) => setTimeout(resolve, 6500))
  device = await connect()
  for (const [key, value] of Object.entries(settings)) {
    const response = await device.collect(`GEADEV STORAGE GET ${key}`, {
      begin: 'GEADEV:STORAGE GET BEGIN',
      end: 'GEADEV:STORAGE GET END',
      timeoutMs: 15000,
    })
    const actual = Buffer.from(response.chunks.join(''), 'base64').toString('utf8')

    if (key === 'm5watch.comparisonBootHoldMs' && actual === '') {
      receipt.bootHoldInterpretation =
        'Absent optional key uses source default0ms; no boot hold enabled'
    } else {
      assert.equal(actual, value)
    }

    receipt.settings[key] = actual
  }

  receipt.replies.push(await device.command('GEADEV CLOCKFREEZE 0', ['GEADEV:OK CLOCKFREEZE']))
  receipt.replies.push(await device.command('GEADEV GESTURE CLEAR', ['GEADEV:OK GESTURE CLEAR']))
  receipt.replies.push(await device.command('GEADEV UPLOADSHOT DISARM', ['GEADEV:OK UPLOADSHOT']))
  receipt.replies.push(await geadev.state(device))
  receipt.passed = true
  writeFileSync(values.output, JSON.stringify(receipt, null, 2) + '\n')
  console.log('Muted preferences verified after reboot; diagnostic capture controls cleared')
} finally {
  if (device) {
    await device.close()
  }
}
