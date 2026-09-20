import { ReactiveComponent, mount } from '@geastack/core'

// EXPERIMENTAL: component-as-store tic-tac-toe with a REAL array board.
// `cells` is a string[] — the board renders via `{this.cells.map(...)}` (keyed
// list), `play(index)` writes one element, and the win check scans the array.
// On the embedded target this compiles fully typed through the unified renderer.
export class App extends ReactiveComponent {
  cells = [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ']
  turn = 'X'
  winner = ''
  status = 'Turn: X'

  play(index: number) {
    if (this.winner.length > 0) return
    if (this.cells[index] != ' ') return
    this.cells[index] = this.turn
    this.winner = this.checkWin()
    if (this.winner.length > 0) {
      this.status = this.winner + ' wins!'
      return
    }
    this.turn = this.turn == 'X' ? 'O' : 'X'
    this.status = 'Turn: ' + this.turn
  }

  reset() {
    let i = 0
    while (i < 9) {
      this.cells[i] = ' '
      i = i + 1
    }
    this.turn = 'X'
    this.winner = ''
    this.status = 'Turn: X'
  }

  checkWin(): string {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ]
    for (const line of lines) {
      const a = this.cells[line[0]]
      if (a != ' ' && a == this.cells[line[1]] && a == this.cells[line[2]]) return a
    }
    return ''
  }

  template() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#07111f', padding: 16, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <span style={{ fontSize: 24, color: '#f8fafc' }}>{this.status}</span>
        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', width: 222, gap: 6 }}>
          {this.cells.map((cell, index) => (
            <div
              style={{ display: 'flex', width: 70, height: 70, borderRadius: 8, backgroundColor: '#0f172a', borderWidth: 2, borderColor: '#1e293b', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => this.play(index)}
            >
              <span style={{ fontSize: 40, color: cell == 'O' ? '#fca5a5' : '#67e8f9' }}>{cell}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', width: 120, height: 40, borderRadius: 8, backgroundColor: '#111827', borderWidth: 2, borderColor: '#475569', alignItems: 'center', justifyContent: 'center' }} onClick={() => this.reset()}>
          <span style={{ fontSize: 16, color: '#cbd5e1' }}>Reset</span>
        </div>
      </div>
    )
  }
}

mount(App)
