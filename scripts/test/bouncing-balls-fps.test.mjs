import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import test from 'node:test'
import { checkLog, checkLinkedStorage, checkWorkload, checkBoard, checkWorkloadFiles, main } from '../check-bouncing-balls-fps.mjs'
function log(overrides = {}) {
  const data = { frames: 3600, warmup: 300, done_total: 59867790, done_p99_le: 18500, done_max: 31865, done_over16667: 1474, ...overrides }
  data.done_avg ??= Math.floor(data.done_total / data.frames)
  data.fps_milli ??= Math.floor(1e9 * data.frames / data.done_total)
  return 'I (65000) ui_bench: RESULT ' + Object.entries(data).map(([k, v]) => `${k}=${v}`).join(' ') + '\n'
}
test('accept measured baseline throughput and latency', () => assert.ok(checkLog(log()).fps >= 60))
for (const fps of [11.495, 34.921, 42.181, 44.761, 53.338, 58.851, 59.459, 59.917, 59.9999])
  test(`reject slower throughput ${fps} without rounding up`, () => assert.throws(() => checkLog(log({ done_total: Math.ceil(3.6e9 / fps), done_max: Math.max(31865, Math.ceil(1e6 / fps) + 1000), done_p99_le: Math.max(18500, Math.ceil(1e6 / fps / 250) * 250) })), /below 60/))
for (const fault of ['task_wdt: Task watchdog got triggered', 'Guru Meditation Error', 'assert failed: x', 'CORRUPT HEAP', 'Brownout detector was triggered'])
  test(`reject 60 FPS with ${fault}`, () => assert.throws(() => checkLog(log() + fault), /fault/))
for (const [name, text] of [
  ['empty log', ''], ['missing summary', 'booted'], ['duplicate summary/reboot', log() + log()],
  ['short sample', log({ frames: 3599 })], ['no warmup', log({ warmup: 0 })],
  ['missing warmup field', log().replace('warmup=300 ', '')],
  ['zero elapsed', log({ done_total: 0 })], ['forged FPS', log({ fps_milli: 70000 })],
  ['incorrect mean', log({ done_avg: 10000 })], ['NaN', log({ done_total: 'NaN' })],
  ['infinite', log({ done_total: 'Infinity' })], ['unsafe integer', log({ done_total: '999999999999999999' })],
  ['slow p99', log({ done_p99_le: 20000 })], ['long stall', log({ done_max: 60000 })],
  ['invalid distribution', log({ done_over16667: 3601 })],
]) test(`reject ${name}`, () => assert.throws(() => checkLog(text)))
test('missing device/log is a failure, never an implicit hardware skip', async () => assert.rejects(main([]), /no hardware/))
test('wrong board cannot be flashed by the gate', () => {
  const valid = { amoled: { target: 'esp32-s3-touch-amoled-2.06', transports: { usbSerial: { serial: '80:B5:4E:DA:73:88' } } } }
  checkBoard(valid)
  assert.throws(() => checkBoard({}), /Refusing/)
  valid.amoled.transports.usbSerial.serial = 'another-board'
  assert.throws(() => checkBoard(valid), /Refusing/)
})
test('workload reductions cannot silently make a slower engine pass', () => {
  const entry = 'Display.setFrameRate(120); Display.setVSync(false); Display.setTextRasterCache(true); Display.setFlushConfig({ rows: 64, depth: 2 })'
  checkWorkload(entry, 'export const BALL_COUNT = 64')
  assert.throws(() => checkWorkload(entry, 'export const BALL_COUNT = 32'))
  assert.throws(() => checkWorkload(entry.replace('120', '60'), 'export const BALL_COUNT = 64'))
})

test('source, CSS and label workload changes require explicit review', () => {
  const expected = { 'styles.css': createHash('sha256').update('.ball { border-radius: 50%; }').digest('hex') }
  checkWorkloadFiles(expected, () => '.ball { border-radius: 50%; }')
  assert.throws(() => checkWorkloadFiles(expected, () => '.ball { display: none; }'), /workload changed/)
})

test('tracked original workload still matches the hardware benchmark', () => {
  const expected = JSON.parse(readFileSync(new URL('./bouncing-balls-workload.json', import.meta.url), 'utf8'))
  checkWorkloadFiles(expected, file => readFileSync(new URL(`../../apps/bouncing-balls-jsx/${file}`, import.meta.url)))
})

function ownershipLog() {
  const groups = { tree: [100000, 100000, 1, 4], text: [400, 404, 3, 32], rare: [1000, 1008, 10, 80], overrides: [800, 820, 12, 0], dependencies: [0, 0, 0, 7364] }
  return Object.entries(groups).map(([group, [payload, heap, allocs, statics]]) =>
    `I ui_bench: OWNED group=${group} payload=${payload} heap=${heap} allocs=${allocs} static=${statics} untracked=0\n`).join('')
}

function memoryLog(shared) {
  const node = shared ? 52 : 168
  return ownershipLog() + `I ui_bench: STORAGE shared=${shared} nodes=68 capacity=512 tree_bytes=100000 node_array_bytes=${node * 512} records=${shared ? 68 : 0} record_payload=${shared ? 7616 : 0} record_heap=${shared ? 7616 : 0} record_static=${shared ? 120 : 0} memo_active=0 memo_peak_heap=680 memo_static=12 layout_aux_payload=${shared ? 832 : 0} layout_aux_heap=${shared ? 832 : 0} layout_aux_allocs=${shared ? 6 : 0} layout_aux_peak=${shared ? 848 : 0} layout_aux_peak_allocs=${shared ? 7 : 0} layout_aux_static=${shared ? 20 : 0}\n` + log().trimEnd() + ` node=${node} style=100 psram_free=7000000 internal_free=65000\n`
}
test('inline/shared experiment keeps the same performance limits and identifies its storage', () => {
  assert.equal(checkLog(memoryLog(0), false).storage.shared, 0)
  assert.equal(checkLog(memoryLog(1), true).storage.records, 68)
  assert.throws(() => checkLog(memoryLog(0), true), /does not match/)
  assert.throws(() => checkLog(log(), true), /memory census/)
  assert.throws(() => checkLog(memoryLog(1).replace('node_array_bytes=26624', 'node_array_bytes=4'), true), /tree storage/)
})

test('layout scratch cannot disappear from the memory census or remain allocated', () => {
  assert.throws(() => checkLog(memoryLog(1).replace('memo_active=0', 'memo_active=5120'), true), /scratch/)
  assert.throws(() => checkLog(memoryLog(1).replace('memo_peak_heap=680', 'memo_peak_heap=0'), true), /scratch/)
  assert.throws(() => checkLog(memoryLog(1).replace('memo_peak_heap=680', ''), true), /Missing storage field/)
})

test('cold layout pages and growth cannot be omitted from memory measurements', () => {
  assert.throws(() => checkLog(memoryLog(1).replace('layout_aux_heap=832', 'layout_aux_heap=0'), true), /persistent layout/)
  assert.throws(() => checkLog(memoryLog(1).replace('layout_aux_peak=848', 'layout_aux_peak=0'), true), /page-growth/)
  assert.throws(() => checkLog(memoryLog(1).replace('layout_aux_heap=832', 'layout_aux_heap=856'), true), /page-growth/)
  assert.throws(() => checkLog(memoryLog(1).replace('layout_aux_allocs=6', 'layout_aux_allocs=33'), true), /persistent layout/)
  assert.throws(() => checkLog(memoryLog(1).replace('layout_aux_peak_allocs=7', ''), true), /Missing storage field/)
  assert.throws(() => checkLog(memoryLog(0).replace('layout_aux_heap=0', 'layout_aux_heap=832'), false), /Inline layout/)
})

test('scratch peak includes allocator slack and rejects the old payload-only census', () => {
  assert.equal(checkLog(memoryLog(1).replace('memo_peak_heap=680', 'memo_peak_heap=688'), true).storage.memo_peak_heap, 688)
  assert.throws(() => checkLog(memoryLog(1).replace('memo_peak_heap=680', 'memo_peak=680'), true), /Missing storage field memo_peak_heap/)
})

function linkedStorage(shared, overrides = {}) {
  return { consistent: true, staticStorage: {triangleOcclusionBytes:0, cssDenseMarkBytes:1026, cssDynamicLengthCacheBytes:1024, textLineBreakCacheBytes:6656, cssRuleIndexBytes:2872, cssActiveRulePlanCacheBytes:4704, layoutGenerationBytes:0}, records: Object.fromEntries(Object.entries({ LayoutPassMemo:10, ...(shared ? {PersistentLayoutState:8, SharedStyleRecord:40} : {}), CanvasMath: 468, ComputedStyle: 32, Node: shared ? 48 : 100, NodeRareData: 12, RenderState: 6, TreeState: shared ? 33848 : 60472, ...overrides }).map(([name, bytes]) => [name, [{ bytes }]])) }
}
test('linked inline and shared layouts preserve automatic memory pruning before flashing', () => {
  checkLinkedStorage(linkedStorage(false), false)
  checkLinkedStorage(linkedStorage(true), true)
  checkLinkedStorage(linkedStorage(true, { ComputedStyle: 28, Node: 44, TreeState: 31800 }), true)
})
test('the observed stale-analyzer 100-byte style and 56-byte node are rejected before flashing', () => {
  assert.throws(() => checkLinkedStorage(linkedStorage(true, { ComputedStyle: 100, Node: 56, TreeState: 42048 }), true), /ComputedStyle.*automatic pruning regressed.*refusing to flash/)
  assert.throws(() => checkLinkedStorage(linkedStorage(true, { Node: 56 }), true), /Node storage/)
  assert.throws(() => checkLinkedStorage(linkedStorage(true, { NodeRareData: 64 }), true), /NodeRareData storage/)
  assert.throws(() => checkLinkedStorage(linkedStorage(true, { TreeState: 42048 }), true), /TreeState storage/)
})
test('missing, inconsistent or malformed linked layouts cannot pass memory qualification', () => {
  assert.throws(() => checkLinkedStorage({ consistent: false }, true), /incompatible/)
  assert.throws(() => checkLinkedStorage({ consistent: true, records: {} }, true), /Missing/)
  assert.throws(() => checkLinkedStorage(linkedStorage(true, { ComputedStyle: 0 }), true), /storage/)
  assert.throws(() => checkLinkedStorage(linkedStorage(true, { ComputedStyle: NaN }), true), /storage/)
  const ambiguous = linkedStorage(true)
  ambiguous.records.Node.push({ bytes: 56 })
  assert.throws(() => checkLinkedStorage(ambiguous, true), /ambiguous/)
})

test('node-owned strings, rare containers and overrides cannot disappear from the census', () => {
  const result = checkLog(memoryLog(1), true)
  assert.equal(result.ownership.text.allocs, 3)
  assert.equal(result.ownership.overrides.heap, 820)
  assert.equal(result.ownership.dependencies.static, 7364)
  assert.throws(() => checkLog(memoryLog(1).replace(ownershipLog(), ''), true), /ownership census/)
  assert.throws(() => checkLog(memoryLog(1) + ownershipLog(), true), /ownership census/)
  assert.throws(() => checkLog(memoryLog(1).replace('untracked=0', 'untracked=1'), true), /Incomplete ownership/)
  assert.throws(() => checkLog(memoryLog(1).replace('heap=404', 'heap=399'), true), /ownership heap/)
  assert.throws(() => checkLog(memoryLog(1).replace('payload=100000', 'payload=99999'), true), /Ownership tree/)
  assert.throws(() => checkLog(memoryLog(1).replace('group=overrides', 'group=text'), true), /duplicate ownership/)
})


test('full circle-cache storage cannot silently return to the bounded app', () => {
  assert.throws(() => checkLinkedStorage(linkedStorage(true, { CanvasMath: 21480 }), true), /CanvasMath.*automatic pruning regressed.*refusing to flash/)
  assert.throws(() => checkLinkedStorage(linkedStorage(true, { CanvasMath: 768 }), true), /CanvasMath storage 768 exceeds 468/)
  assert.throws(() => checkLinkedStorage(linkedStorage(true, { CanvasMath: 756 }), true), /CanvasMath storage 756 exceeds 468/)
  const missing=linkedStorage(true)
  delete missing.records.CanvasMath
  assert.throws(() => checkLinkedStorage(missing,true), /Missing or ambiguous linked CanvasMath/)
})


test('triangle scratch is absent in the linked app and cannot silently escape accounting', () => {
  const report=linkedStorage(true)
  report.staticStorage.triangleOcclusionBytes=3072
  assert.throws(()=>checkLinkedStorage(report,true),/Unused triangle scratch retained 3072 bytes/)
  for(const value of [undefined,NaN,-1]) {
    report.staticStorage.triangleOcclusionBytes=value
    assert.throws(()=>checkLinkedStorage(report,true),/Missing triangle scratch symbol census/)
  }
  report.staticStorage=null
  assert.throws(()=>checkLinkedStorage(report,true),/Missing triangle scratch symbol census/)
})

test('unused percentage-size fields cannot silently return to the linked app', () => {
  assert.throws(() => checkLinkedStorage(linkedStorage(true, { ComputedStyle: 44 }), true), /ComputedStyle storage 44 exceeds 32/)
  assert.throws(() => checkLinkedStorage(linkedStorage(false, { Node: 104 }), false), /Node storage 104 exceeds 100/)
  assert.throws(() => checkLinkedStorage(linkedStorage(false, { TreeState: 62520 }), false), /TreeState storage 62520 exceeds 60472/)
})

test('fixed CSS and text caches cannot grow or disappear from the memory census', () => {
  for (const [name, previous] of Object.entries({ cssDenseMarkBytes:2052, cssDynamicLengthCacheBytes:1280,
    textLineBreakCacheBytes:6720, cssRuleIndexBytes:3000, cssActiveRulePlanCacheBytes:4800 })) {
    const layout = linkedStorage(true)
    layout.staticStorage[name] = previous
    assert.throws(() => checkLinkedStorage(layout,true), new RegExp(name + ' storage'))
    delete layout.staticStorage[name]
    assert.throws(() => checkLinkedStorage(layout,true), new RegExp('Missing ' + name))
    layout.staticStorage[name] = 0 // A future complete elimination remains eligible.
    checkLinkedStorage(layout,true)
  }
})


test('pass-local memoization retains complete accounting and removes generation storage', () => {
  const compact = memoryLog(1).replace('layout_aux_payload=832', 'layout_aux_payload=672')
    .replace('layout_aux_heap=832', 'layout_aux_heap=680').replace('layout_aux_peak=848', 'layout_aux_peak=696')
  assert.equal(checkLog(compact, true).storage.layout_aux_payload, 672)
  assert.throws(() => checkLog(compact.replace('layout_aux_payload=672', 'layout_aux_payload=543'), true), /persistent layout/)
  assert.throws(() => checkLinkedStorage(linkedStorage(true, {PersistentLayoutState:10}), true), /PersistentLayoutState storage/)
  const missing = linkedStorage(true)
  delete missing.records.PersistentLayoutState
  assert.throws(() => checkLinkedStorage(missing, true), /Missing or ambiguous linked PersistentLayoutState/)
  const serial = linkedStorage(true)
  serial.staticStorage.layoutGenerationBytes = 4
  assert.throws(() => checkLinkedStorage(serial, true), /layoutGenerationBytes storage/)
  delete serial.staticStorage.layoutGenerationBytes
  assert.throws(() => checkLinkedStorage(serial, true), /Missing layoutGenerationBytes/)
})


test('packed flags and unused node owners cannot silently regrow', () => {
  for (const [name,bytes] of Object.entries({Node:52,ComputedStyle:40,SharedStyleRecord:48,NodeRareData:40,RenderState:10,TreeState:35896}))
    assert.throws(()=>checkLinkedStorage(linkedStorage(true,{[name]:bytes}),true),new RegExp(name+' storage'))
})
