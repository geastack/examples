import assert from 'node:assert/strict'

import { decodeRgb565Rle } from '../../../../cli/src/device/image.mjs'
import { parseKeyValues } from '../../../../cli/src/device/serial.mjs'

export async function captureUploadedFrame(device) {
  const armed = await device.command('GEADEV UPLOADSHOT ARM', ['GEADEV:OK UPLOADSHOT'], 15000)

  assert(armed.includes('source=co5300-submitted-rgb565'), 'Require actual display upload capture')
  await new Promise((resolve) => setTimeout(resolve, 650))
  const { begin, chunks } = await device.collect('GEADEV UPLOADSHOT READ', {
    begin: 'GEADEV:UPLOADSHOT BEGIN',
    end: 'GEADEV:UPLOADSHOT END',
    timeoutMs: 30000,
  })
  const metadata = parseKeyValues(begin)
  const width = Number(metadata.width)
  const height = Number(metadata.height)

  assert.equal(metadata.encoding, 'rgb565-rle-v1')
  assert.equal(metadata.source, 'co5300-submitted-rgb565')
  assert.equal(metadata.completed_dma, '1')

  return {
    width,
    height,
    rgb: decodeRgb565Rle(Buffer.from(chunks.join(''), 'base64'), width * height),
    captureTransport: metadata,
  }
}
