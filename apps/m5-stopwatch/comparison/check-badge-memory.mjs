import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'

import { SerialDevice, parseKeyValues } from '../../../../cli/src/device/serial.mjs'

const { values } = parseArgs({
  options: {
    port: { type: 'string', default: '/dev/cu.usbmodem21101' },
    output: { type: 'string' },
    switches: { type: 'string', default: '120' },
  },
})
const switches = Number(values.switches)

assert(values.output, 'Provide a durable evidence receipt path')
assert(Number.isInteger(switches) && switches >= 100)

const device = await SerialDevice.open({ path: values.port })
const receipt = {
  recordedAt: new Date().toISOString(),
  requestedSwitches: switches,
  samples: [],
  completed: false,
  passed: false,
  readRetries: [],
}

async function read(command, prefix) {
  try {
    return await device.command(command, [prefix], 15000)
  } catch (error) {
    if (!String(error).includes('timed out waiting for response')) {
      throw error
    }

    receipt.readRetries.push({ command, error: String(error), at: new Date().toISOString() })
    await new Promise((resolve) => setTimeout(resolve, 1500))

    return await device.command(command, [prefix], 15000)
  }
}

async function sample(index) {
  const memory = await read('GEADEV MEM', 'GEADEV:MEM')
  const state = await read('GEADEV STATE', 'GEADEV:STATE')
  const parsed = parseKeyValues(state)
  const node = await read('GEADEV NODE badge-image', 'GEADEV:NODE')

  assert(!node.includes('none=1'), 'Normal Badge image must remain mounted')
  assert(Number(parsed.presented_nonblack) > 10000, 'Badge must remain visibly rendered')
  receipt.samples.push({ index, memory, state, node })
  writeFileSync(values.output, JSON.stringify(receipt, null, 2) + '\n')
}

try {
  for (let index = 0; index < switches; index++) {
    await device.command(`GEADEV KEY ${index % 2 === 0 ? 39 : 37}`, ['GEADEV:OK KEY'], 15000)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    await sample(index + 1)
    if ((index + 1) % 20 === 0) {
      console.log(`${index + 1} switches: ${receipt.samples.at(-1).memory}`)
    }
  }

  const used = receipt.samples.map((entry) => Number(parseKeyValues(entry.memory).psram_used))
  const steady = used.slice(10)

  receipt.steadyRangeBytes = Math.max(...steady) - Math.min(...steady)
  receipt.firstSteadyBytes = steady[0]
  receipt.lastBytes = used.at(-1)
  receipt.completed = true
  // Two opaque 466-square images require868,624 bytes. Allow64KiB for
  // ordinary runtime variation, but reject retained decode-sized growth.
  assert(receipt.steadyRangeBytes <= 65536, 'Warm image memory must remain bounded')
  receipt.passed = true
  console.log(`PASS: ${switches} switches; warm PSRAM range ${receipt.steadyRangeBytes} bytes`)
} catch (error) {
  receipt.error = String(error)
  throw error
} finally {
  writeFileSync(values.output, JSON.stringify(receipt, null, 2) + '\n')
  await device.close()
}
