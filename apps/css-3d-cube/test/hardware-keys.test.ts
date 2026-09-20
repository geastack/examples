import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const app = readFileSync(resolve(__dirname, '..', 'components', 'App.tsx'), 'utf8')

// The cube runs on the Pimoroni Tufty 2350, whose Button A toggles face
// translucency. geastack/targets guards the board side; this is the app side.
describe('css-3d-cube hardware keys', () => {
  it('binds Button A (keyCode 65) to the translucency toggle', () => {
    expect(app).toMatch(/keydown\(keyCode: number\)[\s\S]*?keyCode === 65[\s\S]*?this\.toggle\(\)/)
  })

  it('listens for hardware keydown at the root', () => {
    expect(app).toMatch(/onKeyDown=\{event => this\.keydown\(event\.keyCode\)\}/)
  })
})
