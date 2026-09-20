import { store } from '../stores/ClickerStore'

export function PresentationScreen() {
  return (
    <div class="screen">
      <button class="prevButton" onClick={() => store.prevSlide()}>PREV</button>
      <button class="nextButton" onClick={() => store.nextSlide()}>NEXT</button>
      <button class="mouseToggleButton" onClick={() => store.switchScreen(1)}>MOUSE MODE</button>
    </div>
  )
}
