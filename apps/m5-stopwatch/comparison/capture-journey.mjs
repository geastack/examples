export async function readJourneySnapshot(device) {
  const released = []

  released.push(await device.command('GEADEV UPLOADSHOT DISARM', ['GEADEV:OK UPLOADSHOT'], 15000))
  released.push(await device.command('GEADEV GESTURE CLEAR', ['GEADEV:OK GESTURE CLEAR'], 15000))
  try {
    released.push(await device.command('GEADEV INPUTTRACE END', ['SWINPUT '], 15000))
  } catch (error) {
    if (error.message !== 'GEADEV:ERR INPUTTRACE inactive') {
      throw error
    }

    released.push(error.message)
  }

  const state = await device.command('GEADEV STATE', ['GEADEV:STATE'], 15000)
  const memory = await device.command('GEADEV MEM', ['GEADEV:MEM'], 15000)

  return {
    capturedAt: new Date().toISOString(),
    releasedDiagnosticBuffers: released,
    state,
    memory,
  }
}
