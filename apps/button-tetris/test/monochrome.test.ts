import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const styles = readFileSync(resolve(__dirname, '..', 'styles.css'), 'utf8')

// On an e-paper board (the M5Paper) there is no colour and a refresh is slow, so
// the app drops the chrome that only makes sense in colour and forces the pieces
// to pure black/white. geastack/targets guards the board side; this is the app
// side.
describe('button-tetris on a monochrome panel', () => {
  it('hides colour-only chrome', () => {
    expect(styles).toMatch(/@media \(monochrome\)[\s\S]*?\.fps-badge\s*\{\s*display: none;/)
    expect(styles).toMatch(/@media \(monochrome\)[\s\S]*?\.tetris-score-label\s*\{\s*display: none;/)
  })

  it('forces pieces to pure black and white', () => {
    expect(styles).toMatch(/@media \(monochrome\)[\s\S]*?\.tetris-piece-i,[\s\S]*?background-color: #000000;/)
    expect(styles).toMatch(/@media \(monochrome\)[\s\S]*?\.tetris-block-hidden\s*\{\s*background-color: #ffffff;/)
  })
})
