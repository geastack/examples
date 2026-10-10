import { SerialDevice, geadev } from '../../../../cli/src/device/serial.mjs'

export async function connectColdCapture(port) {
  let device = await SerialDevice.open({ path: port })

  try {
    if ((await geadev.app(device)) !== 'm5-stopwatch') {
      throw new Error('Actual connected application is not m5-stopwatch')
    }

    await geadev.reboot(device)
  } finally {
    await device.close()
  }

  await new Promise((resolve) => setTimeout(resolve, 3500))
  device = await SerialDevice.open({ path: port })

  try {
    await device.command('GEADEV COMPLETION 1', ['GEADEV:OK COMPLETION'], 15000)

    return device
  } catch (error) {
    await device.close()
    throw error
  }
}
