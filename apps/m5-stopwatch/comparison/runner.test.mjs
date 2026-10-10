import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { enterScene, selectScenes } from './benchmark-scenes.mjs'
import { completedUploadProfile, radioOffEvidence } from './benchmark-profile.mjs'

const selected = selectScenes()

assert.equal(selected.length, 6)
assert.equal(selectScenes(undefined, true).length, 7)
assert.throws(() => selectScenes('classic-active,classic-active'))
assert.throws(() => selectScenes('unknown'))
for (const scene of selectScenes(undefined, true)) {
  const actions = []

  await enterScene(scene, {
    key: async (code) => actions.push(['key', code]),
    tap: async (x, y) => actions.push(['tap', x, y]),
  })
  assert.deepEqual(actions[0], ['key', 27])
  assert.equal(
    actions.filter(([kind, code]) => kind === 'key' && code === 39).length,
    scene.menuIndex + (scene.faceSteps || 0),
  )
  if (scene.id === 'menu-idle') {
    assert.equal(actions.length, 1)
  } else {
    assert.deepEqual(actions[scene.menuIndex + 1], ['tap', 233, 220])
  }

  if (scene.startStopwatch) {
    assert.deepEqual(actions.at(-1), ['tap', 315, 85])
  }

  if (scene.acceptWheel) {
    assert.deepEqual(actions.at(-1), ['tap', 233, 390])
  }
}

console.log(
  'Benchmark runner scene plans use native navigation, passive inputs and real app actions',
)

for (const completion of ['0', '1']) {
  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL('./run-gea.mjs', import.meta.url)),
      '--dry-run',
      '--include-wheel',
      '--completion',
      completion,
    ],
    { encoding: 'utf8' },
  )

  assert.equal(result.status, 0, result.stderr)
  const plan = JSON.parse(result.stdout)

  assert.equal(plan.completionFence, completion === '1')
  assert.equal(plan.scenes.length, 7)
}

assert.equal(
  completedUploadProfile({ flush_rows: '16', flush_depth: '3', flush_bytes: '44736' }).depth,
  3,
)
assert.throws(
  () => completedUploadProfile({ flush_rows: '16', flush_depth: '0', flush_bytes: '44736' }),
  /DMA slot pipeline/,
)
assert.throws(
  () => completedUploadProfile({ flush_rows: '16', flush_depth: '3' }),
  /DMA slot pipeline/,
)

assert.equal(radioOffEvidence('GEADEV:OK WIFI off connected=0', { ip: '0.0.0.0' }).ip, '0.0.0.0')
assert.throws(
  () => radioOffEvidence('GEADEV:OK WIFI off connected=1', { ip: '0.0.0.0' }),
  /WiFi-off/,
)
assert.throws(
  () => radioOffEvidence('GEADEV:OK WIFI off connected=0', { ip: '192.168.1.2' }),
  /WiFi-off/,
)
