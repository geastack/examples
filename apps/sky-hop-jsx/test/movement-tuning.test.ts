import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(resolve(__dirname, '..', 'constants.tsx'), 'utf8')

function numberConst(name: string): number {
  const match = source.match(new RegExp(`export const ${name} = ([0-9.]+)`))
  if (!match) throw new Error(`Missing numeric constant ${name}`)
  return Number(match[1])
}

// Tuning guard, not a unit test: these four constants interact, and a plausible
// edit to any one of them can leave the player unable to build up ground speed.
// The terminal speed is the fixed point of `v = (v + a) * friction`, so it is
// `friction * a / (1 - friction)`, capped at MAX_SPEED.
//
// This used to live in geastack/core, which has nothing to do with it and was
// reaching into this repo by a sibling-checkout path.
describe('Sky Hop JSX movement tuning', () => {
  const moveAccel = numberConst('MOVE_ACCEL')
  const groundFriction = numberConst('GROUND_FRICTION')
  const airFriction = numberConst('AIR_FRICTION')
  const maxSpeed = numberConst('MAX_SPEED')

  const accelPerFrame = moveAccel * (1000 / 60)
  const terminal = (friction: number) =>
    friction >= 1 ? maxSpeed : Math.min(maxSpeed, (friction * accelPerFrame) / (1 - friction))

  const groundTerminalSpeed = terminal(groundFriction)
  const airTerminalSpeed = terminal(airFriction)

  it('lets the player reach a usable speed on the ground', () => {
    expect(groundTerminalSpeed).toBeGreaterThanOrEqual(airTerminalSpeed * 0.6)
  })

  it('keeps the ground grippier than the air', () => {
    expect(groundFriction).toBeLessThan(airFriction)
  })
})
