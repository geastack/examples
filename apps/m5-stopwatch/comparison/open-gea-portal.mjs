import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { SerialDevice, geadev } from '../../../../cli/src/device/serial.mjs'
import { writeImage } from '../../../../cli/src/device/image.mjs'
import { captureUploadedFrame } from './capture-upload.mjs'
import { retainedCaptureIdentity } from './capture-identity.mjs'

assert.equal(process.env.STOPWATCH_DIAGNOSTIC_MUTED, '1')
const identity = retainedCaptureIdentity(
  JSON.parse(readFileSync(new URL('./gea-benchmark-build.json', import.meta.url))),
)
const device = await SerialDevice.open({ path: '/dev/cu.usbmodem21101' })
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const actions = []

try {
  actions.push(await geadev.key(device, 27))
  await wait(700)
  const raw = await device.command('GEADEV SCROLLSTATE menu-title', ['SWSCROLL '], 15000)
  const title = JSON.parse(raw.slice(raw.indexOf('{')))

  assert.equal(title.nodes_dropped, 0)
  assert.equal(title.nodes.length, 1)
  assert.equal(title.nodes[0].text_truncated, false)
  const names = [
    'AlarmClock',
    'WatchFace',
    'Stopwatch',
    'Badge',
    'IMU',
    'Audio.FFT',
    'LuckyWheel',
    'Settings',
  ]
  let index = names.indexOf(title.nodes[0].text)

  assert(index >= 0)
  while (index !== 3) {
    actions.push(await geadev.key(device, 39))
    await wait(650)
    index = (index + 1) % 8
  }

  actions.push(await geadev.tap(device, 233, 220))
  await wait(700)
  const badge = await geadev.node(device, 'badge')

  assert(!badge.includes('none=1'))
  actions.push(await geadev.tap(device, 233, 233, 650))
  await wait(500)
  const dialog = await device.command('GEADEV SCROLLSTATE dialog', ['SWSCROLL '], 15000)
  const publicDialog = JSON.parse(dialog.slice(dialog.indexOf('{')))

  assert.equal(publicDialog.nodes_dropped, 0)
  assert(publicDialog.nodes.some((node) => !node.text_truncated && node.text.includes('Edit')))
  actions.push(await geadev.tap(device, 145, 285))
  await wait(2500)
  const actualNode = await geadev.node(device, 'badge-edit')

  assert(!actualNode.includes('none=1'))
  const image = await captureUploadedFrame(device)
  const destination = new URL('../../../reports/m5-stopwatch/captures/gea/', import.meta.url)

  writeImage(
    fileURLToPath(new URL('badge-edit-ap.png', destination)),
    image.width,
    image.height,
    image.rgb,
  )
  writeFileSync(
    new URL('badge-edit-ap.json', destination),
    JSON.stringify(
      {
        ...identity,
        id: 'badge-edit-ap',
        framework: 'gea',
        manifestScreenId: 'badge.ap_instructions',
        manifestState: 'AP ready',
        comparisonParameters: {},
        parameters: {},
        stateVerified: false,
        captureTransport: image.captureTransport,
        pixelGeometry: {
          rawSize: [image.width, image.height],
          crop: [0, 0, 466, 466],
          sourceAuthority: 'Actual CO5300 logical display upload',
        },
        stateEvidence: {
          initialTitle: title,
          actualBadgeNode: badge,
          actualDialog: publicDialog,
          actualNode,
          actions,
          authority:
            'Normal launcher, Badge hold and Edit routes; actual rendered text requires visual verification',
        },
      },
      null,
      2,
    ) + '\n',
  )
  console.log(
    'Normal Badge Edit route opened and captured; AP intentionally remains open for actual HTTP tests',
  )
} finally {
  try {
    await device.command('GEADEV UPLOADSHOT DISARM', ['GEADEV:OK UPLOADSHOT'])
  } finally {
    await device.close()
  }
}
