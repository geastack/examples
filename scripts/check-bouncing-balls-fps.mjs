#!/usr/bin/env node
// Completed-frame gate for the original 64-ball JSX app on USB AMOLED 2.06.
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const limits = Object.freeze({ frames: 3600, warmup: 300, fps: 60, p99Us: 19000, maxUs: 35000 })
const failurePattern = /task_wdt|watchdog|Guru Meditation|panic(?:ked)?|abort\(\)|CORRUPT HEAP|assert failed|Brownout detector/i
function requireCondition(ok, message) { if (!ok) throw new Error(message) }

export function checkLog(text, expectedShared) {
  requireCondition(!failurePattern.test(text), 'Device reported a watchdog, panic, assertion, or hardware fault')
  const rows = text.split(/\r?\n/).filter(line => /(?:^|\s)RESULT\s+frames=/.test(line))
  requireCondition(rows.length === 1, `Expected exactly one benchmark RESULT, found ${rows.length}`)
  const fields = Object.fromEntries([...rows[0].matchAll(/\b([a-z][a-z0-9_]*)=([^\s]+)/g)].map(([, k, v]) => [k, v]))
  const result = {}
  for (const key of ['frames', 'warmup', 'done_total', 'done_avg', 'done_p99_le', 'done_max', 'done_over16667', 'fps_milli']) {
    requireCondition(/^\d+$/.test(fields[key] ?? ''), `Missing or invalid ${key}`)
    result[key] = Number(fields[key])
    requireCondition(Number.isSafeInteger(result[key]), `Unsafe integer ${key}`)
  }
  requireCondition(result.frames === limits.frames && result.warmup === limits.warmup, 'Incorrect sample count or warm-up; expected 300 + 3600 completed frames')
  requireCondition(result.done_total > 0, 'Invalid elapsed time')
  requireCondition(result.done_avg === Math.floor(result.done_total / result.frames), 'Inconsistent elapsed time / average')
  requireCondition(result.fps_milli === Math.floor(1e9 * result.frames / result.done_total), 'Inconsistent FPS / elapsed time')
  requireCondition(result.done_p99_le > 0 && result.done_max >= result.done_avg && result.done_p99_le <= result.done_max + 250 && result.done_over16667 <= result.frames, 'Invalid frame distribution')
  // Use the exact elapsed sum, not rounded FPS or rounded mean frame time.
  const fps = 1e6 * result.frames / result.done_total
  requireCondition(fps >= limits.fps, `Completed-frame throughput ${fps.toFixed(3)} FPS is below ${limits.fps} FPS`)
  requireCondition(result.done_p99_le <= limits.p99Us, `p99 ${result.done_p99_le} us exceeds ${limits.p99Us} us`)
  requireCondition(result.done_max <= limits.maxUs, `Longest frame ${result.done_max} us exceeds ${limits.maxUs} us`)
  const storageRows = text.split(/\r?\n/).filter(line => /(?:^|\s)STORAGE\s+shared=/.test(line))
  let storage
  if (expectedShared !== undefined || storageRows.length) {
    requireCondition(storageRows.length === 1, 'Missing or duplicate memory census')
    storage = Object.fromEntries([...storageRows[0].matchAll(/\b([a-z][a-z0-9_]*)=(\d+)/g)].map(([, k, v]) => [k, Number(v)]))
    for (const key of ['shared', 'nodes', 'capacity', 'tree_bytes', 'node_array_bytes', 'records', 'record_payload', 'record_heap', 'record_static', 'memo_active', 'memo_peak_heap', 'memo_static', 'layout_aux_payload', 'layout_aux_heap', 'layout_aux_allocs', 'layout_aux_peak', 'layout_aux_peak_allocs', 'layout_aux_static'])
      requireCondition(Number.isSafeInteger(storage[key]), `Missing storage field ${key}`)
    requireCondition(storage.shared === 0 || storage.shared === 1, 'Invalid shared-style mode')
    if (expectedShared !== undefined) requireCondition(storage.shared === Number(expectedShared), 'Firmware style storage does not match the requested comparison')
    requireCondition(storage.nodes > 0 && storage.nodes <= storage.capacity && storage.node_array_bytes === Number(fields.node) * storage.capacity && storage.tree_bytes >= storage.node_array_bytes, 'Invalid tree storage census')
    requireCondition(storage.record_heap >= storage.record_payload, 'Invalid style allocation census')
    requireCondition(storage.memo_active === 0 && storage.memo_peak_heap >= 10 * storage.nodes && storage.memo_static === 12, 'Layout scratch must be measured and released before retained frames')
    if (storage.shared) {
      requireCondition(storage.layout_aux_payload >= 8 * storage.nodes && storage.layout_aux_heap >= storage.layout_aux_payload && storage.layout_aux_allocs === Math.ceil(storage.nodes / 16) + 1 && storage.layout_aux_static === 20, 'Invalid persistent layout allocation census')
      requireCondition(storage.layout_aux_peak >= storage.layout_aux_heap && storage.layout_aux_peak_allocs >= storage.layout_aux_allocs, 'Missing layout page-growth allocation peak')
    } else {
      requireCondition(['layout_aux_payload', 'layout_aux_heap', 'layout_aux_allocs', 'layout_aux_peak', 'layout_aux_peak_allocs', 'layout_aux_static'].every(key => storage[key] === 0), 'Inline layout must not allocate auxiliary pages')
    }
    for (const key of ['node', 'style', 'psram_free', 'internal_free']) {
      requireCondition(/^\d+$/.test(fields[key] ?? ''), `Missing memory field ${key}`)
      result[key] = Number(fields[key])
    }
  }
  const ownedRows = text.split(/\r?\n/).filter(line => /(?:^|\s)OWNED\s+group=/.test(line))
  let ownership
  if (expectedShared !== undefined || ownedRows.length) {
    ownership = {}
    requireCondition(ownedRows.length === 5, 'Missing or duplicate node ownership census')
    for (const line of ownedRows) {
      const group = line.match(/\bgroup=(\w+)/)?.[1]
      requireCondition(['tree', 'text', 'rare', 'overrides', 'dependencies'].includes(group) && !ownership[group], 'Invalid or duplicate ownership group')
      const fields = Object.fromEntries([...line.matchAll(/\b([a-z]+)=(\d+)/g)].map(([, key, value]) => [key, Number(value)]))
      for (const key of ['payload', 'heap', 'allocs', 'static', 'untracked'])
        requireCondition(Number.isSafeInteger(fields[key]), `Missing ownership ${group}.${key}`)
      requireCondition(fields.heap >= fields.payload && (fields.heap === 0) === (fields.allocs === 0), `Invalid ownership heap for ${group}`)
      requireCondition(fields.untracked === 0, `Incomplete ownership census for ${group}`)
      ownership[group] = fields
    }
    requireCondition(storage && ownership.tree.payload === storage.tree_bytes && ownership.tree.allocs === 1 && ownership.tree.static === 4,
      'Ownership tree must include its allocation and static owner')
  }
  return { ...result, fps, ...(storage ? { storage } : {}), ...(ownership ? { ownership } : {}) }
}

// Ceilings for this unchanged RGB565 app on USB AMOLED boards. A smaller future layout
// remains eligible, but losing whole-source pruning is a build regression.
// Inspect the linked records before flashing; matching translation units alone
// cannot catch a consistently stale analyzer that retained unused fields.
export function checkLinkedStorage(layout, shared) {
  requireCondition(layout?.consistent === true, 'Firmware contains incompatible UI record layouts; refusing to flash')
  for (const [name, ceiling] of [['CanvasMath', 468], ['ComputedStyle', 32], ['Node', shared ? 48 : 100], ['NodeRareData', 12], ['RenderState', 6], ['TreeState', shared ? 33848 : 60472], ['LayoutPassMemo', 10], ...(shared ? [['PersistentLayoutState', 8], ['SharedStyleRecord', 40]] : [])]) {
    const variants = layout.records?.[name]
    requireCondition(Array.isArray(variants) && variants.length === 1, `Missing or ambiguous linked ${name} layout; refusing to flash`)
    const bytes = variants[0].bytes
    requireCondition(Number.isSafeInteger(bytes) && bytes > 0 && bytes <= ceiling,
      `${name} storage ${bytes} exceeds ${ceiling} bytes; automatic pruning regressed; refusing to flash`)
  }
  const triangleBytes = layout.staticStorage?.triangleOcclusionBytes
  requireCondition(Number.isSafeInteger(triangleBytes) && triangleBytes >= 0,
    'Missing triangle scratch symbol census; refusing to flash')
  requireCondition(triangleBytes === 0,
    `Unused triangle scratch retained ${triangleBytes} bytes; automatic pruning regressed; refusing to flash`)
  for (const [name, ceiling] of Object.entries({ cssDenseMarkBytes: 1026, cssDynamicLengthCacheBytes: 1024,
    textLineBreakCacheBytes: 6656, cssRuleIndexBytes: 2872, cssActiveRulePlanCacheBytes: 4704, layoutGenerationBytes: 0 })) {
    const bytes = layout.staticStorage[name]
    requireCondition(Number.isSafeInteger(bytes) && bytes >= 0, `Missing ${name} symbol census; refusing to flash`)
    requireCondition(bytes <= ceiling, `${name} storage ${bytes} exceeds ${ceiling}; refusing to flash`)
  }
}

// Compare emitted C++ and runtime headers across storage variants even when
// the shared compiler build changes. Ignore only the intentional storage define.
export function fingerprintGeneratedNative(directory) {
  const hashes = {}
  function walk(relative = '') {
    for (const entry of readdirSync(path.join(directory, relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(relative, entry.name)
      if (entry.isDirectory()) walk(file)
      else if (/\.(?:cpp|h|hpp)$/.test(file) && entry.name !== 'wifi_config.h') {
        const source = readFileSync(path.join(directory, file), 'utf8').replace(/^(#define GEA_EMBEDDED_SHARED_STYLES) [01]$/gm, '$1 <storage-variant>')
        hashes[file] = createHash('sha256').update(source).digest('hex')
      }
    }
  }
  walk()
  return hashes
}

export function checkWorkload(entry, constants) {
  for (const call of ['setFrameRate(120)', 'setVSync(false)', 'setTextRasterCache(true)', 'setFlushConfig({ rows: 64, depth: 2 })'])
    requireCondition(entry.includes(`Display.${call}`), `Benchmark workload changed: missing Display.${call}`)
  requireCondition(/export const BALL_COUNT = 64\b/.test(constants), 'Benchmark requires the original 64 balls')
}

export function checkWorkloadFiles(expected, read) {
  for (const [file, digest] of Object.entries(expected))
    requireCondition(createHash('sha256').update(read(file)).digest('hex') === digest, `Benchmark workload changed: ${file}; review and explicitly update its baseline`)
}

export function checkBoard(boards) {
  const board = boards.amoled
  requireCondition(board?.target === 'esp32-s3-touch-amoled-2.06' && board?.transports?.usbSerial?.serial === '80:B5:4E:DA:73:88', 'Refusing device run: amoled must be the registered USB 2.06 board 80:B5:4E:DA:73:88')
}

async function deviceRun(sharedStyles = false) {
  const project = fileURLToPath(new URL('..', import.meta.url))
  const app = path.join(project, 'apps/bouncing-balls-jsx')
  const cli = process.env.GEA_CLI_BIN
  const compiler = process.env.GEA_COMPILER_DIR
  requireCondition(cli && existsSync(cli), 'Set GEA_CLI_BIN to the Geastack CLI bin/gea.mjs')
  requireCondition(compiler && existsSync(path.join(compiler, 'dist/compiler.js')), 'Set GEA_COMPILER_DIR to the current single Geastack compiler build')
  checkBoard(JSON.parse(readFileSync(path.join(project, '.gea/boards.json'), 'utf8')))
  checkWorkload(readFileSync(path.join(app, 'index.tsx'), 'utf8'), readFileSync(path.join(app, 'constants.tsx'), 'utf8'))
  const workload = JSON.parse(readFileSync(new URL('./test/bouncing-balls-workload.json', import.meta.url), 'utf8'))
  checkWorkloadFiles(workload, file => readFileSync(path.join(app, file)))
  const build = path.join(project, '.gea/build/esp32-s3-touch-amoled-2.06/app-builds/bouncing-balls-jsx')
  mkdirSync(build, { recursive: true })
  // A failed attempt must never leave an older passing report beside its log.
  rmSync(path.join(build, 'fps-regression-result.json'), { force: true })
  const manifestPath = path.join(app, 'package.json')
  const original = readFileSync(manifestPath, 'utf8'), manifest = JSON.parse(original)
  manifest.gea.defines = { ...manifest.gea.defines, GEA_EMBEDDED_FRAME_BENCHMARK: 2, GEA_EMBEDDED_FRAME_SCHEDULER_FPS_LOG: 0, GEA_EMBEDDED_SHARED_STYLES: Number(sharedStyles) }
  const run = (args, timeout = 900000) => {
    const result = spawnSync(process.execPath, [cli, ...args], { cwd: project, env: process.env, stdio: 'inherit', timeout })
    requireCondition(result.status === 0, `${args[0]} failed: ${result.error?.message || result.signal || result.status}`)
  }
  // Always rebuild this app; --no-build only applies to the subsequent flash.
  try {
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
    run(['build', '--board', 'amoled', '--app', 'bouncing-balls-jsx'])
  } finally { writeFileSync(manifestPath, original) }
  const nativeSourceHashes = fingerprintGeneratedNative(path.join(build, 'apps/bouncing-balls-jsx'))
  const image = path.join(build, 'gea_embedded.bin')
  const sha256 = createHash('sha256').update(readFileSync(image)).digest('hex')
  if (process.env.GEA_UI_LAYOUT_CHECKER) {
    const check = spawnSync(process.env.GEA_UI_LAYOUT_PYTHON || 'python3', [process.env.GEA_UI_LAYOUT_CHECKER, path.join(build, 'gea_embedded.elf')], { cwd: project, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 })
    if (check.stdout) process.stdout.write(check.stdout)
    if (check.stderr) process.stderr.write(check.stderr)
    requireCondition(check.status === 0, 'Firmware contains incompatible UI record layouts; refusing to flash')
    checkLinkedStorage(JSON.parse(check.stdout), sharedStyles)
  }
  run(['flash', '--board', 'amoled', '--app', 'bouncing-balls-jsx', '--no-build', '--image', image], 180000)
  const logFile = path.join(build, 'fps-regression-device.log')
  const result = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, 'logs', '--board', 'amoled', '--transport', 'usb'], { cwd: project, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] })
    let log = '', settling, killTimer, timedOut = false, stopped = false
    const stop = () => {
      stopped = true; child.kill('SIGINT')
      killTimer = setTimeout(() => child.kill('SIGKILL'), 5000)
    }
    const timer = setTimeout(() => { timedOut = true; stop() }, 150000)
    const collect = chunk => {
      log += chunk.toString()
      // Allow a complete line and a short post-result window to catch late faults.
      if (!settling && /RESULT[^\n]*\n/.test(log)) settling = setTimeout(stop, 3000)
    }
    child.stdout.on('data', collect); child.stderr.on('data', collect)
    child.on('error', error => { clearTimeout(timer); clearTimeout(settling); clearTimeout(killTimer); reject(error) })
    child.on('close', (code, signal) => {
      clearTimeout(timer); clearTimeout(settling); clearTimeout(killTimer); writeFileSync(logFile, log)
      try {
        requireCondition(!timedOut, `Timed out waiting for 3600 completed frames; see ${logFile}`)
        requireCondition(stopped && (code === 0 || code === 130 || signal === 'SIGINT'), `Device monitor failed or exited early: ${code ?? signal}`)
        resolve(checkLog(log, sharedStyles))
      } catch (error) { reject(error) }
    })
  })
  const report = { ...result, sha256, nativeSourceHashes, image, logFile, measuredAt: new Date().toISOString() }
  writeFileSync(path.join(build, 'fps-regression-result.json'), JSON.stringify(report, null, 2) + '\n')
  return report
}

export async function main(args = process.argv.slice(2)) {
  let report
  if (args.length === 1 && args[0] === '--device') report = await deviceRun()
  else if (args.length === 2 && args[0] === '--device' && args[1] === '--shared-styles') report = await deviceRun(true)
  else if (args.length === 2 && args[0] === '--log') report = checkLog(readFileSync(args[1], 'utf8'))
  else throw new Error('Usage: node scripts/check-bouncing-balls-fps.mjs --device [--shared-styles] | --log <captured-log> (no hardware means no performance pass)')
  console.log(`PASS: ${report.fps.toFixed(3)} FPS; p99 <= ${(report.done_p99_le / 1000).toFixed(2)} ms; max ${(report.done_max / 1000).toFixed(2)} ms; ${report.frames} frames after ${report.warmup} warm-up; no device faults`)
  console.log('Gate measures sustained throughput and tail latency, not an every-frame 16.67 ms guarantee.')
  return report
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href)
  main().catch(error => { console.error(`FAIL: ${error.message}`); process.exitCode = 1 })
