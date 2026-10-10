export function completedUploadProfile(values) {
  const rows = Number(values.flush_rows)
  const depth = Number(values.flush_depth)
  const bytes = Number(values.flush_bytes)

  if (![rows, depth, bytes].every((value) => Number.isSafeInteger(value) && value > 0)) {
    throw new Error('Fenced completion requires the actual StopWatch DMA slot pipeline')
  }

  return { rows, depth, bytes, scope: 'Actual configured StopWatch CO5300 DMA slot pipeline' }
}

export function radioOffEvidence(reply, identity) {
  if (!/GEADEV:OK WIFI off connected=0/.test(reply) || identity.ip !== '0.0.0.0') {
    throw new Error('WiFi-off command and disconnected IP evidence are required')
  }

  return {
    commandReply: reply,
    ip: identity.ip,
    source:
      'targets/targets/esp32/connectivity/wifi.cpp:127-176 disables, stops and deinitializes WiFi',
    scope: 'Command/source provenance and reported disconnected IP; no independent RF measurement',
  }
}
