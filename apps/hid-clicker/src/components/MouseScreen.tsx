import { store } from '../stores/ClickerStore'

export function MouseScreen() {
  return (
    <div class="screen">
      <div class="mouseButtonRow">
        <button
          class="leftClickButton"
          onTouchStart={() => store.mouseLeftDown()}
          onTouchEnd={() => store.mouseLeftUp()}
        >
          LEFT
        </button>
        <div
          class="scrollZone"
          onTouchStart={(event) => store.initTouch(event.clientX, event.clientY)}
          onTouchMove={(event) => store.scrollMove(event.clientX, event.clientY)}
          onTouchEnd={() => store.resetTouch()}
        >
          <span class="buttonLabel">SCROLL</span>
        </div>
        <button
          class="rightClickButton"
          onTouchStart={() => store.mouseRightDown()}
          onTouchEnd={() => store.mouseRightUp()}
        >
          RIGHT
        </button>
      </div>
      <div class="bottomRow">
        <button class="navButton" onClick={() => store.switchScreen(0)}>
          BACK
        </button>
        <button class="biasButton" onClick={() => store.recaptureBias()}>
          BIAS
        </button>
        <button class="navButton" onClick={() => store.switchScreen(2)}>
          PAD
        </button>
      </div>
    </div>
  )
}
