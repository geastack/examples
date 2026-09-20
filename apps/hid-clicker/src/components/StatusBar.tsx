import { store } from '../stores/ClickerStore'

export function StatusBar() {
  return (
    <p class="statusBar">
      <span class="statusText">
        {store.status}
      </span>
    </p>
  )
}
