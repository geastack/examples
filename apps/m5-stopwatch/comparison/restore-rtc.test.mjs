import assert from 'node:assert/strict'
import test from 'node:test'

import { restoreRtc, selectedRollerValues, verifyUtcReadback } from './restore-rtc.mjs'

test('RTC restoration refuses device access before original backup restore and physical mute', async () => {
  await assert.rejects(
    restoreRtc({ port: 'invalid', backupRestored: false, hardwareMuteVerified: true }),
    /backup restore/,
  )
  await assert.rejects(
    restoreRtc({ port: 'invalid', backupRestored: true, hardwareMuteVerified: false }),
    /mute/,
  )
})

test('actual selected rollers deduplicate selected overlay and reject ambiguous values', () => {
  const observations = {
    roller: { nodes: [{ x: 100, y: 138, width: 100, height: 164 }] },
    'roller-row': {
      nodes: [
        { x: 110, y: 205, width: 80, height: 30, text: '26' },
        { x: 110, y: 205, width: 80, height: 30, text: '26' },
        { x: 110, y: 251, width: 80, height: 30, text: '27' },
      ],
    },
  }

  assert.deepEqual(selectedRollerValues(observations), [26])
  observations['roller-row'].nodes[1].text = '25'
  assert.throws(() => selectedRollerValues(observations), /Ambiguous/)
})

test('post-reboot date/time proof checks full UTC calendar, stale epochs and midnight window', () => {
  const now = Date.UTC(2026, 9, 6, 23, 59, 59)

  assert.equal(verifyUtcReadback([2026, 10, 6, 23, 59, 59], now, now + 2000).nearHostUtc, true)
  assert.equal(verifyUtcReadback([2026, 10, 7, 0, 0, 0], now, now + 2000).nearHostUtc, true)
  assert.equal(verifyUtcReadback([2000, 1, 28, 11, 26, 0], now, now + 2000).nearHostUtc, false)
  assert.equal(verifyUtcReadback([2026, 2, 29, 11, 26, 0], now, now + 2000).nearHostUtc, false)
  assert.throws(() => verifyUtcReadback([2026, 10, 6], now, now), /controls/)
})
