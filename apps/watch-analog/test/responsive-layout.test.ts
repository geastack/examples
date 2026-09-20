import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(resolve(__dirname, '..', 'components', 'App.tsx'), 'utf8')

// Each element's style props, sliced out by its id. The face and the hands are
// positioned proportionally so the watch scales with the viewport; a fixed pixel
// offset anywhere in here means it only looks right on one screen.
function snippetFor(id: string): string {
  const marker = `id="${id}"`
  const start = source.indexOf(marker)
  expect(start, `${id} should be present`).not.toBe(-1)
  const nextId = source.indexOf('id="', start + marker.length)
  return source.slice(start, nextId === -1 ? source.length : nextId)
}

describe('responsive analog watch layout', () => {
  it('centers the face on both axes', () => {
    expect(source).toMatch(/display:\s*'flex'/)
    expect(source).toMatch(/justifyContent:\s*'center'/)
    expect(source).toMatch(/alignItems:\s*'center'/)
  })

  it('sizes the face from the smaller viewport axis', () => {
    const face = snippetFor('wf-face')

    expect(face, 'face should be the positioning context for the hands').toMatch(/position:\s*'relative'/)
    expect(face).toMatch(/width:\s*'min\(84vw,\s*84vh\)'/)
    expect(face).toMatch(/height:\s*'min\(84vw,\s*84vh\)'/)
    expect(face, 'face should not use fixed pixel offsets').not.toMatch(/\b(?:left|top):\s*'\d+px'/)
  })

  it.each(['wf-hour', 'wf-min', 'wf-sec'])('pivots %s on the face center', (id) => {
    const hand = snippetFor(id)

    expect(hand, 'bottom pivot should sit on the face center').toMatch(/left:\s*'calc\(50% - [0-9.]+%\)'/)
    expect(hand, 'hand should end at the face center').toMatch(/top:\s*'calc\(50% - [0-9.]+%\)'/)
    expect(hand, 'hand should rotate around its bottom center').toMatch(/transformOrigin:\s*'50% 100%'/)
    expect(hand, 'geometry should be proportional, not fixed pixels').not.toMatch(
      /\b(?:left|top|width|height):\s*'\d+px'/
    )
  })

  it('centers the cap on the pivot', () => {
    const cap = snippetFor('wf-cap')

    expect(cap).toMatch(/left:\s*'calc\(50% - 2.5%\)'/)
    expect(cap).toMatch(/top:\s*'calc\(50% - 2.5%\)'/)
  })
})
