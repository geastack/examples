import { tetris } from '../stores/TetrisStore'

export function GameOverOverlay() {
  return (
    <div class={{ 'tetris-game-over-overlay': true, 'tetris-game-over-overlay-hidden': tetris.gameOver !== 1 }}>
      <div class="tetris-overlay-card">
        <span class="tetris-overlay-title">You lost the game</span>
        <span class="tetris-overlay-score">{'Score ' + tetris.score}</span>
        <RestartButton />
      </div>
    </div>
  )
}

function RestartButton() {
  return (
    <div
      onClick={() => tetris.restart()}
      class="tetris-restart-button"
    >
      <span class="tetris-restart-label">Restart</span>
    </div>
  )
}
