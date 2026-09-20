import { game } from '../stores/GameStore'
import './Cell.css'

export function Cell0() {
  return <div class={game.cell0 == 'O' ? 'tic-cell tic-cell-o' : 'tic-cell tic-cell-x'} onClick={() => game.play(0)}>{game.cell0}</div>
}

export function Cell1() {
  return <div class={game.cell1 == 'O' ? 'tic-cell tic-cell-o' : 'tic-cell tic-cell-x'} onClick={() => game.play(1)}>{game.cell1}</div>
}

export function Cell2() {
  return <div class={game.cell2 == 'O' ? 'tic-cell tic-cell-o' : 'tic-cell tic-cell-x'} onClick={() => game.play(2)}>{game.cell2}</div>
}

export function Cell3() {
  return <div class={game.cell3 == 'O' ? 'tic-cell tic-cell-o' : 'tic-cell tic-cell-x'} onClick={() => game.play(3)}>{game.cell3}</div>
}

export function Cell4() {
  return <div class={game.cell4 == 'O' ? 'tic-cell tic-cell-o' : 'tic-cell tic-cell-x'} onClick={() => game.play(4)}>{game.cell4}</div>
}

export function Cell5() {
  return <div class={game.cell5 == 'O' ? 'tic-cell tic-cell-o' : 'tic-cell tic-cell-x'} onClick={() => game.play(5)}>{game.cell5}</div>
}

export function Cell6() {
  return <div class={game.cell6 == 'O' ? 'tic-cell tic-cell-o' : 'tic-cell tic-cell-x'} onClick={() => game.play(6)}>{game.cell6}</div>
}

export function Cell7() {
  return <div class={game.cell7 == 'O' ? 'tic-cell tic-cell-o' : 'tic-cell tic-cell-x'} onClick={() => game.play(7)}>{game.cell7}</div>
}

export function Cell8() {
  return <div class={game.cell8 == 'O' ? 'tic-cell tic-cell-o' : 'tic-cell tic-cell-x'} onClick={() => game.play(8)}>{game.cell8}</div>
}
