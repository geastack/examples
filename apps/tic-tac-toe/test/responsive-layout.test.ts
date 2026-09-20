import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '..')

function source(path: string): string {
  return readFileSync(resolve(root, path), 'utf8')
}

function optionalSource(path: string): string {
  const absolute = resolve(root, path)
  return existsSync(absolute) ? readFileSync(absolute, 'utf8') : ''
}

describe('responsive tic-tac-toe layout', () => {
  it('does not size the board from viewport width alone', () => {
    const board = source('components/Board.tsx') + optionalSource('components/Board.css')

    expect(board).not.toContain('width: 90vw')
    expect(board).not.toContain('height: 90vw')
  })

  it('uses a flex stage so the square board is bounded by remaining screen height', () => {
    const app = source('components/App.tsx')
    const appCss = optionalSource('components/App.css')
    const boardCss = optionalSource('components/Board.css')

    expect(app).toContain("class='game-view'")
    expect(app).toContain("class='game-board-stage'")
    expect(appCss).toContain('flex: 1')
    expect(appCss).toContain('max-height: calc(100vh - 72px)')
    expect(boardCss).toContain('width: clamp(1px, min(90vw, calc(100vh - 72px)), 90vw)')
    expect(boardCss).toContain('height: clamp(1px, min(90vw, calc(100vh - 72px)), 90vw)')
  })
})
