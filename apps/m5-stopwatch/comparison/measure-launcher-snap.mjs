// Measure completed uploads during launcher snaps through the registered Gea board.
import { parseArgs } from '../../../../cli/src/args.mjs'
import { createContext } from '../../../../cli/src/context.mjs'
import { selectBoard } from '../../../../cli/src/commands/board.mjs'
import { openDevice } from '../../../../cli/src/device/device.mjs'
import { geadev } from '../../../../cli/src/device/serial.mjs'

const parsed = parseArgs(['--board', 'stopwatch'])
const ctx = createContext(parsed)
const selection = selectBoard(ctx, parsed)
const device = await openDevice({ selection, transport: 'usb' })
const serial = device.serial
const initialVsync = (await geadev.vsync(serial)).vsync
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const logs = []
const readLine = serial.readLine.bind(serial)
serial.readLine = async (...args) => {
  const line = await readLine(...args)
  if (line?.includes('perf:') || line?.includes('SLOW ')) logs.push(line)
  return line
}
const runs = []
try {
  console.log(await geadev.ping(serial))
  await geadev.key(serial, 27)
  await wait(2200)
  console.log(await geadev.node(serial, 'menu-title'))
  const modes =
    process.env.SNAP_VSYNC === undefined ? [true, false] : [process.env.SNAP_VSYNC === '1']
  const repetitions = Number(process.env.SNAP_REPETITIONS ?? 4)
  for (const vsync of modes) {
    await geadev.vsync(serial, vsync)
    for (const gesture of ['arrow', 'release']) {
      for (let repetition = 0; repetition < repetitions; repetition++) {
        await wait(600)
        if (gesture === 'arrow') await geadev.tap(serial, 440, 230, 2)
        else await geadev.drag(serial, 350, 230, 250, 230, 6, 16)
        await serial.command(`GEADEV BENCH BEGIN snap-${runs.length} ${gesture}`, [
          'GEADEV:OK BENCH',
        ])
        await wait(450)
        await serial.writeLine('GEADEV BENCH END')
        let sample
        const deadline = Date.now() + 20000
        for (;;) {
          if (Date.now() >= deadline) throw new Error('Benchmark reply timed out')
          const line = await serial.readLine(deadline - Date.now())
          if (line === null) throw new Error('Benchmark reply timed out')
          const start = line.indexOf('SWBENCH ')
          if (start >= 0) {
            sample = JSON.parse(line.slice(start + 8))
            break
          }
          if (line.includes('GEADEV:ERR')) throw new Error(line)
        }
        const run = {
          vsync,
          gesture,
          repetition,
          sample,
          completedCadenceFps: sample.presented_cadence_count
            ? (sample.presented_cadence_count * 1e6) / sample.presented_cadence_sum_us
            : null,
        }
        runs.push(run)
        console.log(JSON.stringify(run))
      }
    }
  }
} finally {
  try {
    await geadev.vsync(serial, initialVsync)
  } finally {
    await device.close()
    console.log(JSON.stringify({ runs, logs }))
  }
}
