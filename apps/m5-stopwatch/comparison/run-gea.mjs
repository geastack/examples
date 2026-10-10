// Collect benchmark windows only. Firmware builds/flashing and screenshots are separate.
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { SerialDevice, geadev, parseKeyValues } from '../../../../cli/src/device/serial.mjs'
import { enterScene, selectScenes } from './benchmark-scenes.mjs'
import { completedUploadProfile, radioOffEvidence } from './benchmark-profile.mjs'

const { values } = parseArgs({
  options: {
    port: { type: 'string' },
    'build-report': { type: 'string' },
    scenes: { type: 'string' },
    'include-wheel': { type: 'boolean', default: false },
    'window-ms': { type: 'string', default: '10000' },
    repetitions: { type: 'string', default: '3' },
    completion: { type: 'string', default: '1' },
    'warmup-ms': { type: 'string', default: '3000' },
    'boot-wait-ms': { type: 'string', default: '6500' },
    'output-prefix': { type: 'string' },
    'run-prefix': { type: 'string', default: 'gea' },
    'dry-run': { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
})

const usage = `node comparison/run-gea.mjs --port /dev/cu.usbmodem... --build-report comparison/gea-benchmark-build.json
Options: --scenes menu-idle,classic-active,number-flow-active,imu-stationary,fft-passive,stopwatch-running
         --include-wheel --warmup-ms 3000 --window-ms 10000 --repetitions 3 --completion 1|0
         --output-prefix comparison/gea-benchmark --run-prefix gea --dry-run
Every scene cold-boots, uses native keys/taps, then measures ordinary activity.
No screenshots, task-stack scans or serial commands occur inside each window.
Physical speaker and vibration must be clamped by the selected benchmark firmware.`

if (values.help) {
  console.log(usage)
  process.exit(0)
}

const scenes = selectScenes(values.scenes, values['include-wheel'])
const windowMs = Number(values['window-ms'])
const warmupMs = Number(values['warmup-ms'])
const bootWaitMs = Number(values['boot-wait-ms'])
const repetitions = Number(values.repetitions)
const completion = Number(values.completion)

if (
  ![windowMs, warmupMs, bootWaitMs, repetitions].every(Number.isSafeInteger) ||
  windowMs < 1000 ||
  warmupMs < 0 ||
  bootWaitMs < 1000 ||
  repetitions < 1
) {
  throw new Error('Invalid sampling durations or repetition count')
}

if (completion !== 0 && completion !== 1) {
  throw new Error('Completion fence must be 0 or 1')
}

if (!/^[A-Za-z0-9_.-]{1,20}$/.test(values['run-prefix'])) {
  throw new Error('Invalid run prefix')
}

if (values['dry-run']) {
  console.log(
    JSON.stringify(
      {
        scenes,
        coldBootPerScene: true,
        warmupMs,
        windowMs,
        repetitions,
        completionFence: completion === 1,
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

if (!values.port || !values['build-report']) {
  throw new Error(usage)
}

const buildReport = JSON.parse(readFileSync(values['build-report'], 'utf8'))

if (
  buildReport.framework !== 'gea' ||
  !buildReport.gea_defines?.includes('GEA_EMBEDDED_COMPARISON_BENCHMARK=1')
) {
  throw new Error(
    'The selected build report must identify Gea benchmark firmware with physical-output clamps',
  )
}

const base = values['output-prefix'] || fileURLToPath(new URL('./gea-benchmark', import.meta.url))

if (!existsSync(path.dirname(base))) {
  throw new Error('Output must use an existing durable artifact directory')
}

const logPath = `${base}.log`
const resultPath = `${base}-runs.json`

if (existsSync(logPath) || existsSync(resultPath)) {
  throw new Error(`Preserve existing results; choose another output-prefix: ${base}`)
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const results = {
  schema_version: 1,
  framework: 'gea',
  started_at: new Date().toISOString(),
  device_path: values.port,
  host: { node: process.version, platform: process.platform, arch: process.arch },
  firmware_identity_mode: 'operator-selected build artifact; device MAC recorded separately',
  build_report: buildReport,
  settings: {
    window_ms: windowMs,
    warmup_ms: warmupMs,
    repetitions,
    cold_boot_per_scene: true,
    completion_fence: completion === 1,
    screenshots_in_window: false,
    hardware_speaker: 'clamped off',
    hardware_haptics: 'clamped off',
    radio: 'Explicit WiFi off after each fresh boot; reply/PING/source retained',
    time_seed_utc: '2000-01-28T11:26:00.000Z',
  },
  scenes: [],
}

writeFileSync(logPath, '')
const log = (line) => appendFileSync(logPath, `${line}\n`)
const save = () => writeFileSync(resultPath, `${JSON.stringify(results, null, 2)}\n`)

save()
let device = null
let activeWindow = false

function attachLog(connected) {
  const readLine = connected.readLine.bind(connected)

  connected.readLine = async (timeout) => {
    const line = await readLine(timeout)

    if (line !== null) {
      log(line)
    }

    return line
  }

  const writeLine = connected.writeLine.bind(connected)

  connected.writeLine = async (line) => {
    log(`# HOST ${new Date().toISOString()} ${line}`)

    return writeLine(line)
  }

  return connected
}

async function connect() {
  let lastError

  for (let attempt = 0; attempt < 12; attempt++) {
    let connected

    try {
      connected = attachLog(await SerialDevice.open({ path: values.port }))
      const pong = await geadev.ping(connected)
      const identity = parseKeyValues(pong)

      if (identity.app !== 'm5-stopwatch') {
        throw new Error(`Unexpected application: ${pong}`)
      }

      if (results.device_mac && results.device_mac !== identity.mac) {
        throw new Error('Connected board identity changed')
      }

      results.device_mac = identity.mac

      return connected
    } catch (error) {
      lastError = error
      if (connected) {
        await connected.close()
      }

      await wait(500)
    }
  }

  throw lastError
}

async function reboot() {
  if (!device) {
    device = await connect()
  }

  await geadev.reboot(device)
  await device.close()
  device = null
  await wait(bootWaitMs)
  device = await connect()
}

async function safeRead(command, prefix) {
  let lastError

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await device.command(command, [prefix], 15000)
    } catch (error) {
      lastError = error
      log(`# HOST read retry ${attempt + 1} ${command}: ${error.message}`)
      await wait(100)
    }
  }

  throw lastError
}

try {
  for (const scene of scenes) {
    const bootRequestedAt = new Date().toISOString()

    await reboot()
    const freshBootPing = await safeRead('GEADEV PING', 'GEADEV:PONG')
    const freshBootState = await safeRead('GEADEV STATE', 'GEADEV:STATE')
    const wifiOffReply = await device.command('GEADEV WIFI off', ['GEADEV:OK WIFI'], 15000)

    await wait(500)
    const radioOffPing = await safeRead('GEADEV PING', 'GEADEV:PONG')
    const radioControl = radioOffEvidence(wifiOffReply, parseKeyValues(radioOffPing))

    await device.command(`GEADEV COMPLETION ${completion}`, ['GEADEV:OK COMPLETION'])
    await geadev.setTime(device, Date.UTC(2000, 0, 28, 11, 26, 0) / 1000)
    const actions = {
      key: async (code) => {
        await geadev.key(device, code)
        await wait(650)
      },
      tap: async (x, y) => {
        await geadev.tap(device, x, y, 80)
        await wait(500)
      },
    }

    await enterScene(scene, actions)
    await wait(warmupMs)
    const node = await safeRead(`GEADEV NODE ${scene.expectedClass}`, 'GEADEV:NODE')

    if (/none=1|count=0/.test(node)) {
      throw new Error(`Expected ${scene.id} node missing: ${node}`)
    }

    const memoryBefore = await safeRead('GEADEV MEM', 'GEADEV:MEM')
    const state = await safeRead('GEADEV STATE', 'GEADEV:STATE')
    const geometry = parseKeyValues(state)

    if (geometry.width !== '466' || geometry.height !== '466') {
      throw new Error(`Unexpected screen geometry: ${state}`)
    }

    const record = {
      ...scene,
      cold_boot_requested_at: bootRequestedAt,
      fresh_boot_ping: freshBootPing,
      fresh_boot_state: freshBootState,
      radio_off_ping: radioOffPing,
      radio_control: radioControl,
      scene_ready_at: new Date().toISOString(),
      memory_before: memoryBefore,
      state,
      node,
      samples: [],
    }

    results.scenes.push(record)
    save()
    for (let repeat = 1; repeat <= repetitions; repeat++) {
      const runId = `${values['run-prefix']}-${scene.id}-${repeat}`
      const pipelineMemory = completion === 1 ? await safeRead('GEADEV MEM', 'GEADEV:MEM') : null
      const pipelineEvidence = pipelineMemory
        ? completedUploadProfile(parseKeyValues(pipelineMemory))
        : null

      record.pipeline_checks ??= []
      record.pipeline_checks.push({
        run_id: runId,
        raw_memory: pipelineMemory,
        evidence: pipelineEvidence,
      })
      save()
      await device.command(`GEADEV BENCH BEGIN ${runId} ${scene.id}`, ['GEADEV:OK BENCH BEGIN'])
      activeWindow = true
      await wait(windowMs)
      const raw = await device.command('GEADEV BENCH END', ['SWBENCH '], 10000)

      activeWindow = false
      const sample = JSON.parse(raw.slice(raw.indexOf('SWBENCH ') + 8))

      if (
        sample.framework !== 'gea' ||
        sample.run_id !== runId ||
        sample.scenario !== scene.id ||
        sample.completion_fence !== (completion === 1) ||
        sample.variant !== (completion === 1 ? 'benchmark-fenced' : 'benchmark-unfenced')
      ) {
        throw new Error(`Mismatched sample: ${raw}`)
      }

      record.samples.push(sample)
      save()
      console.log(
        `${scene.id} ${repeat}/${repetitions}: rendered=${sample.rendered_frames}, uploaded=${sample.presented_frames}, window_us=${sample.window_us}`,
      )
    }

    record.memory_after = await safeRead('GEADEV MEM', 'GEADEV:MEM')
    save()
  }

  results.completed_at = new Date().toISOString()
} catch (error) {
  results.error = error.message
  throw error
} finally {
  if (activeWindow && device) {
    try {
      await device.command('GEADEV BENCH END', ['SWBENCH '], 10000)
    } catch (error) {
      log(`# HOST failed to close interrupted window: ${error.message}`)
    }
  }

  save()
  if (device) {
    await device.close()
  }
}
