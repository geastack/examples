import { store } from '../stores/ClickerStore'

export function TrackpadScreen() {
  return (
    <div class="screen">
      <div
        class="trackpadArea"
        onTouchStart={(event) => store.initTouch(event.clientX, event.clientY)}
        onTouchMove={(event) => store.trackpadMove(event.clientX, event.clientY)}
        onTouchEnd={() => store.resetTouch()}
        onClick={() => store.leftClick()}
      >
        <span class="buttonLabel">TRACKPAD</span>
      </div>
      <button class="trackpadRightClick" onClick={() => store.rightClick()}>
        RIGHT CLICK
      </button>
      <div class="bottomRow">
        <button class="navButton" onClick={() => store.switchScreen(1)}>
          MOUSE
        </button>
        <button class="navButton" onClick={() => store.switchScreen(0)}>
          BACK
        </button>
      </div>
    </div>
  )
}
