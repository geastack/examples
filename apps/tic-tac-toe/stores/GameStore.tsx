import { Store } from '@geastack/core'

export class GameStore extends Store {
  cell0 = ' '
  cell1 = ' '
  cell2 = ' '
  cell3 = ' '
  cell4 = ' '
  cell5 = ' '
  cell6 = ' '
  cell7 = ' '
  cell8 = ' '
  turn = 'X'
  winner = ''
  status = 'Turn: X'

  play(index: number) {
    if (this.winner.length > 0) return
    if (index == 0 && this.cell0 == ' ') this.cell0 = this.turn
    else if (index == 1 && this.cell1 == ' ') this.cell1 = this.turn
    else if (index == 2 && this.cell2 == ' ') this.cell2 = this.turn
    else if (index == 3 && this.cell3 == ' ') this.cell3 = this.turn
    else if (index == 4 && this.cell4 == ' ') this.cell4 = this.turn
    else if (index == 5 && this.cell5 == ' ') this.cell5 = this.turn
    else if (index == 6 && this.cell6 == ' ') this.cell6 = this.turn
    else if (index == 7 && this.cell7 == ' ') this.cell7 = this.turn
    else if (index == 8 && this.cell8 == ' ') this.cell8 = this.turn
    else return

    this.winner = this.checkWin()
    if (this.winner.length > 0) {
      this.status = this.winner + ' wins!'
      return
    }
    this.turn = this.turn == 'X' ? 'O' : 'X'
    this.status = 'Turn: ' + this.turn
  }

  checkWin(): string {
    if (this.cell0 != ' ' && this.cell0 == this.cell1 && this.cell1 == this.cell2) return this.cell0
    if (this.cell3 != ' ' && this.cell3 == this.cell4 && this.cell4 == this.cell5) return this.cell3
    if (this.cell6 != ' ' && this.cell6 == this.cell7 && this.cell7 == this.cell8) return this.cell6
    if (this.cell0 != ' ' && this.cell0 == this.cell3 && this.cell3 == this.cell6) return this.cell0
    if (this.cell1 != ' ' && this.cell1 == this.cell4 && this.cell4 == this.cell7) return this.cell1
    if (this.cell2 != ' ' && this.cell2 == this.cell5 && this.cell5 == this.cell8) return this.cell2
    if (this.cell0 != ' ' && this.cell0 == this.cell4 && this.cell4 == this.cell8) return this.cell0
    if (this.cell2 != ' ' && this.cell2 == this.cell4 && this.cell4 == this.cell6) return this.cell2
    return ''
  }
}

export const game = new GameStore()
