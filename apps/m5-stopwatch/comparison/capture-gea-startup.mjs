import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { SerialDevice, geadev, parseKeyValues } from '../../../../cli/src/device/serial.mjs'
import { writeImage } from '../../../../cli/src/device/image.mjs'
import { captureUploadedFrame } from './capture-upload.mjs'
import { retainedCaptureIdentity } from './capture-identity.mjs'

assert.equal(process.env.STOPWATCH_DIAGNOSTIC_MUTED, '1')
const identity = retainedCaptureIdentity(
  JSON.parse(readFileSync(new URL('./gea-benchmark-build.json', import.meta.url))),
)
const destination = new URL('../../../reports/m5-stopwatch/captures/gea/', import.meta.url)
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let device
const replies = []

async function connect() {
  const result = await SerialDevice.open({ path: '/dev/cu.usbmodem21101' })

  try {
    const pong = await result.command('GEADEV PING', ['GEADEV:PONG'], 1000)
    const fields = parseKeyValues(pong)

    assert.equal(fields.app, 'm5-stopwatch')
    assert.equal(fields.mac.toLowerCase().replace(/[^a-f0-9]/g, ''), '288485450b98')
    replies.push(pong)

    return result
  } catch (error) {
    await result.close()
    throw error
  }
}

async function capture(id, screen, state, className) {
  const node = await geadev.node(device, className)

  assert(!node.includes('none=1') && node.includes(`class=${className} `))
  const image = await captureUploadedFrame(device)

  assert.equal(image.width, 466)
  assert.equal(image.height, 466)
  writeImage(fileURLToPath(new URL(`${id}.png`, destination)), image.width, image.height, image.rgb)
  const publicControls = []

  if (id === 'boot') {
    for (const [control, expected] of [
      ['boot-logo-title', 'StopWatch'],
      ['boot-logo-status', 'Starting up ...'],
      ['boot-logo-version', 'V0.5'],
    ]) {
      let raw

      try {
        raw = await device.command(`GEADEV SCROLLSTATE ${control}`, ['SWSCROLL '], 15000)
      } catch (error) {
        if (error.message !== 'GEADEV:ERR SCROLLSTATE unknown-class') {
          throw error
        }

        publicControls.push({ control, expected, unavailable: error.message })
        continue
      }

      const actual = JSON.parse(raw.slice(raw.indexOf('{')))

      assert.equal(actual.nodes_dropped, 0)
      assert.equal(actual.nodes.length, 1)
      assert.equal(actual.nodes[0].text_truncated, false)
      assert.equal(actual.nodes[0].text, expected)
      publicControls.push({ control, actual, expected })
    }
  }

  const visualProof =
    id === 'guide'
      ? JSON.parse(
          execFileSync(
            '/Users/dashersw/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3',
            [
              fileURLToPath(new URL('./verify-guide-image.py', import.meta.url)),
              fileURLToPath(new URL('../assets/go_home_guide.png', import.meta.url)),
              fileURLToPath(new URL(`${id}.png`, destination)),
            ],
            { encoding: 'utf8' },
          ),
        )
      : null
  const receipt = {
    ...identity,
    id,
    framework: 'gea',
    manifestScreenId: screen,
    manifestState: state,
    parameters: {},
    comparisonParameters: {},
    stateVerified:
      id === 'boot'
        ? publicControls.length === 3 && publicControls.every((control) => !control.unavailable)
        : visualProof.exact565,
    captureTransport: image.captureTransport,
    pixelGeometry: {
      rawSize: [466, 466],
      crop: [0, 0, 466, 466],
      sourceAuthority: 'Actual logical CO5300 upload; no scaling or alignment search',
    },
    stateEvidence: {
      actualNode: node,
      publicControls,
      visualProof,
      replies: replies.slice(),
      authority:
        'Normal boot predicate, actual public text or exact guide bitmap, and actual display upload',
    },
  }

  writeFileSync(new URL(`${id}.json`, destination), JSON.stringify(receipt, null, 2) + '\n')
  console.log(`captured ${id}`)
}

try {
  device = await connect()
  replies.push(await geadev.storageSet(device, 'm5watch.bootCount', '4'))
  replies.push(await geadev.reboot(device))
  await device.close()
  device = null
  const started = Date.now()

  while (!device && Date.now() - started < 4500) {
    await wait(200)
    try {
      device = await connect()
    } catch (error) {
      replies.push(String(error))
    }
  }

  assert(device, 'Reconnect after normal startup')
  replies.push(await device.command('GEADEV COMPLETION 1', ['GEADEV:OK COMPLETION']))
  const storage = await device.collect('GEADEV STORAGE GET m5watch.bootCount', {
    begin: 'GEADEV:STORAGE GET BEGIN',
    end: 'GEADEV:STORAGE GET END',
    timeoutMs: 15000,
  })
  const count = Buffer.from(storage.chunks.join(''), 'base64').toString('utf8')

  assert.equal(count, '5')
  replies.push(`normal first-five predicate: actual bootCount=${count}`)
  await capture('guide', 'startup.guide', 'first through fifth boot', 'guide')
} finally {
  if (device) {
    try {
      await geadev.storageSet(device, 'm5watch.bootCount', '5')
      await device.command('GEADEV UPLOADSHOT DISARM', ['GEADEV:OK UPLOADSHOT'])
      await geadev.tap(device, 233, 233)
    } finally {
      await device.close()
    }
  }
}
