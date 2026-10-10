import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { SerialDevice, geadev } from '../../../../cli/src/device/serial.mjs'
import { writeImage } from '../../../../cli/src/device/image.mjs'
import { captureUploadedFrame } from './capture-upload.mjs'
import { retainedCaptureIdentity } from './capture-identity.mjs'

const { values } = parseArgs({
  options: {
    port: { type: 'string' },
    'portal-receipt': { type: 'string' },
    'build-report': { type: 'string' },
  },
})

assert(
  values.port && values['portal-receipt'],
  'Use --port and actual --portal-receipt after root closes AP and hands the port',
)
assert.equal(process.env.STOPWATCH_DIAGNOSTIC_MUTED, '1', 'Only physically muted diagnostic builds')
const build = JSON.parse(
  readFileSync(
    values['build-report'] || new URL('./gea-benchmark-build.json', import.meta.url),
    'utf8',
  ),
)
const identity = retainedCaptureIdentity(build)
const portal = JSON.parse(readFileSync(values['portal-receipt'], 'utf8'))

assert.equal(portal.framework, 'gea')
assert.equal(portal.completed, true)
const portalFailures = portal.tests.filter((test) => test.passed === false)

assert(
  portalFailures.every(
    (test) => test.name === 'captive discovery /connecttest.txt' && test.observedStatus === 404,
  ),
  'Any failed image workflow or unexpected portal assertion blocks device fixture proof',
)
assert(!portal.failure, 'Incomplete browser assertions block device fixture proof')
assert.equal(portal.passed, portalFailures.length === 0, 'Retain the truthful overall verdict')
assert.equal(portal.build.app_image.sha256, identity.firmwareBinarySha256)
assert.equal(portal.finalBackendState?.activeSlot, 0, 'Actual final active slot must be0')
assert.deepEqual(
  portal.finalBackendState.slots.filter((slot) => slot.hasImage).map((slot) => slot.slot),
  [0, 1, 2, 3, 4],
)
const destination = fileURLToPath(
  new URL('../../../reports/m5-stopwatch/captures/gea/', import.meta.url),
)
const reports = fileURLToPath(new URL('../../../reports/m5-stopwatch/', import.meta.url))

assert(existsSync(destination), 'Use the existing report directory')
const fixtures = new Map()

for (let slot = 0; slot < 5; slot++) {
  const entry = portal.tests.find((test) => test.slot === slot && test.fixture && test.sha256)

  assert(entry, `Actual uploaded fixture evidence missing for slot${slot}`)
  const filename = path.join(reports, entry.fixture)
  const sha256 = createHash('sha256').update(readFileSync(filename)).digest('hex')

  assert.equal(sha256, entry.sha256, `Retain the actual slot${slot} source bytes`)
  fixtures.set(slot, { filename, sha256 })
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const execute = promisify(execFile)
const device = await SerialDevice.open({ path: values.port })
const receipts = []
const actions = []

async function key(code) {
  const acknowledgement = await geadev.key(device, code)

  assert(!acknowledgement.includes('ERR'))
  actions.push({ code, acknowledgement, requestedAt: new Date().toISOString() })
  await wait(700)
}

async function capture(id, slot, manifestState) {
  const node = await geadev.node(device, 'badge')

  assert(
    !node.includes('none=1') && node.includes('class=badge '),
    'Actual normal Badge display required',
  )
  const imageNode = await geadev.node(device, 'badge-image')
  const image = await captureUploadedFrame(device)
  const filename = path.join(destination, `${id}.png`)

  writeImage(filename, image.width, image.height, image.rgb)
  const fixture = fixtures.get(slot)
  const visualOutput = path.join(reports, `${id}-gea-visual.json`)

  await execute('python3', [
    fileURLToPath(new URL('./verify-badge-image.py', import.meta.url)),
    '--fixture',
    fixture.filename,
    '--capture',
    filename,
    '--slot',
    String(slot),
    '--output',
    visualOutput,
  ])
  const visual = JSON.parse(readFileSync(visualOutput, 'utf8'))
  const receipt = {
    ...identity,
    id,
    framework: 'gea',
    manifestScreenId: 'badge.display',
    manifestState,
    parameters: { slot },
    comparisonParameters: { slot },
    stateVerified: visual.visualFixtureIdentified === true,
    captureTransport: image.captureTransport,
    pixelGeometry: {
      rawSize: [image.width, image.height],
      crop: [0, 0, 466, 466],
      sourceAuthority: 'Actual CO5300 logical466x466 upload; no resize or alignment search',
    },
    stateEvidence: {
      actualNode: node,
      actualImageNode: imageNode,
      actualInitialBackendState: portal.finalBackendState,
      portalOverallPassed: portal.passed,
      portalKnownDiscoveryFailures: portalFailures,
      fixtureSha256: fixture.sha256,
      visualProof: visual,
      normalKeyActions: actions.slice(),
      activeSlotReadbackAfterClose: false,
      interpretation:
        'Distinct rendered fixture identifies expected slot under ordinary A/B traversal; later active index is not independently queried after AP closes. Exact pixels and decoder differences are reported separately.',
    },
  }

  receipts.push(receipt)
  writeFileSync(path.join(destination, `${id}.json`), JSON.stringify(receipt, null, 2) + '\n')
  writeFileSync(
    path.join(reports, 'gea-badge-device-proof.json'),
    JSON.stringify({ schemaVersion: 1, results: receipts }, null, 2) + '\n',
  )
  console.log(`${id}: identified=${receipt.stateVerified};exact565=${visual.exactQuantizedPixels}`)
}

try {
  await capture('badge-upload-slot-0', 0, 'occupied slot')
  await key(39)
  await capture('badge-upload-slot-1', 1, 'occupied slot')
  await key(39)
  await capture('badge-upload-slot-2', 2, 'occupied slot')
  await key(39)
  await capture('badge-upload-slot-3', 3, 'occupied slot')
  await key(37)
  await capture('badge-button-previous', 2, 'A/B previous/next occupied slot')
  await key(39)
  await key(39)
  await capture('badge-upload-slot-4', 4, 'occupied slot')
  await key(39)
  await capture('badge-button-skip-deleted', 0, 'A/B previous/next occupied slot')
  await key(37)
  await capture('badge-button-wrap', 4, 'last slot wraps')
} finally {
  try {
    await device.command('GEADEV UPLOADSHOT DISARM', ['GEADEV:OK UPLOADSHOT'], 15000)
  } finally {
    await device.close()
  }
}
