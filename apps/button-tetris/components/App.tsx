import { Component } from '@geastack/core'
import { tetris } from '../stores/TetrisStore'
import { Controls } from './Controls'
import { FpsBadge } from './FpsBadge'
import { GameOverOverlay } from './GameOverOverlay'
import { TetrisBoard } from './TetrisBoard'

export class App extends Component {
  template() {
    return (
      <div class="tetris-app">
        <div class="tetris-header">
          <span class="tetris-score-label">{'Score ' + tetris.score}</span>
        </div>
        <TetrisBoard />
        <Controls />
        <FpsBadge />
        <GameOverOverlay />
      </div>
    )
  }
}
