import { Cell0, Cell1, Cell2, Cell3, Cell4, Cell5, Cell6, Cell7, Cell8 } from './Cell'
import './Board.css'

export function Board() {
  return (
    <div class='tic-board'>
      <div class='tic-board-row'>
        <Cell0 />
        <Cell1 />
        <Cell2 />
      </div>
      <div class='tic-board-row'>
        <Cell3 />
        <Cell4 />
        <Cell5 />
      </div>
      <div class='tic-board-row'>
        <Cell6 />
        <Cell7 />
        <Cell8 />
      </div>
    </div>
  )
}
