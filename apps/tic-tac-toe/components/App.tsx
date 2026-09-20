import { Component } from '@geastack/core'
import { Board } from './Board'
import { StatusText } from './StatusText'
import './App.css'

export function GameView() {
  return (
    <div class='game-view'>
      <StatusText />
      <div class='game-board-stage'>
        <Board />
      </div>
    </div>
  )
}

export class App extends Component {
  template() {
    return <GameView />
  }
}
