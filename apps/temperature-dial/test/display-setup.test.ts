import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const entry = readFileSync(resolve(__dirname, '..', 'index.tsx'), 'utf8')

// This app is the one that exercises partial backlight brightness on the rotary
// board. geastack/targets guards the other half -- that the board drives its
// backlight with an LEDC PWM channel, so a duty cycle below 100% is a real
// dimmed panel rather than a value collapsed to on/off.
describe('temperature dial display setup', () => {
  it('asks for a partial brightness, not full', () => {
    expect(entry).toMatch(/Display\.setBrightness\(\s*50\s*\)/)
  })

  it('states the intended frame cadence rather than taking the default', () => {
    expect(entry).toMatch(/Display\.setFrameRate\(\s*50\s*\)/)
  })
})
