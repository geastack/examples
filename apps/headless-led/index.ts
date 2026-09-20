// The onboard WS2812 cycles through the hue wheel; BOOT turns it on and off.
//
// The LED is on GPIO48. On VCC-GND / YD-ESP32-S3 boards it is wired there
// through a solder jumper silkscreened `RGB` that ships OPEN, so a board
// straight out of the bag stays dark however correct the firmware is: RMT
// reports every transmit as fine because the waveform really does leave the
// pin, it just has nothing on the other end. Bridge that pad with solder.
//
// BOOT is read as GPIO0 directly. Input.consumeBackButton() would work here too,
// but only because there is no launcher to return to first, and the platform
// sets it on release rather than on press -- a falling edge is the press itself.

import { Gpio, Led } from '@geastack/core'

const bootPin = 0
const ledPin = 48

const brightness = 70 // a WS2812 at full scale is unpleasant to sit next to
const degreesPerTick = 2 // 360 degrees / 2 per 40 ms tick = one turn every 7.2 s
const tickMs = 40

let hue = 0
let on = true
let lastLevel = true
let cooldown = 0

// Hue to RGB at full saturation. The wheel is six linear ramps: in each 60
// degree sector one channel is at full, one is at zero, and the third slides
// between them, which is the whole of HSV once saturation and value are fixed.
function paintHue(h: number): void {
  const sector = (h / 60) | 0
  const f = (h - sector * 60) / 60
  const rise = brightness * f
  const fall = brightness * (1 - f)
  if (sector === 0) Led.set(ledPin, brightness, rise, 0)
  else if (sector === 1) Led.set(ledPin, fall, brightness, 0)
  else if (sector === 2) Led.set(ledPin, 0, brightness, rise)
  else if (sector === 3) Led.set(ledPin, 0, fall, brightness)
  else if (sector === 4) Led.set(ledPin, rise, 0, brightness)
  else Led.set(ledPin, brightness, 0, fall)
}

Gpio.configureInput(bootPin, true)
paintHue(hue)
console.log('headless-led: rainbow on GPIO' + ledPin + ', BOOT stops and starts it')

setInterval(() => {
  const level = Gpio.read(bootPin)
  if (cooldown > 0) cooldown = cooldown - 1
  else if (lastLevel && !level) {
    cooldown = 5 // 200 ms of contact bounce
    on = !on
    if (!on) Led.off(ledPin)
    console.log('headless-led: ' + (on ? 'on' : 'off'))
  }
  lastLevel = level

  if (!on) return
  hue = (hue + degreesPerTick) % 360
  paintHue(hue)
}, tickMs)
