import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { addedAlarmLabels } from './gesture-outcome.mjs'

assert.deepEqual(addedAlarmLabels(['07:00'], ['07:00', '08:00']), { added: ['08:00'], removed: [] })
assert.deepEqual(addedAlarmLabels(['07:00'], ['07:00', '07:00']), { added: ['07:00'], removed: [] })
assert.deepEqual(addedAlarmLabels(['07:00'], ['08:00']), { added: ['08:00'], removed: ['07:00'] })
const runner = fileURLToPath(new URL('./run-gea-gestures.mjs', import.meta.url))
const result = spawnSync(process.execPath, [runner, '--dry-run'], { encoding: 'utf8' })

assert.equal(result.status, 0, result.stderr)
const plan = JSON.parse(result.stdout)

assert.equal(plan.cases.length, 21)
assert.equal(plan.coldBootPerCase, true)
assert.equal(plan.usbDuringPlayback, false)
const bad = spawnSync(process.execPath, [runner, '--dry-run', '--cases', 'unknown'], {
  encoding: 'utf8',
})

assert.notEqual(bad.status, 0)
console.log(
  'Gesture runner stays offline during dry run and identifies actual added alarm labels without treating replaced/deleted labels as success',
)
