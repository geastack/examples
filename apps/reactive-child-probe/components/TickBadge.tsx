import { ticker } from '../stores/TickStore'

// Function-component child mounted from a ReactiveComponent template. This is
// the exact shape that used to compile to a SILENT black screen: the typed
// self-store renderer refused all child mounts (`canMount: () => false`),
// selfStoreMountedRenderer returned null, and the boxed fallback mounted a
// neutralized class that never rendered. It must render — and keep updating
// reactively from its global store — when mounted from <App/>.
export function TickBadge() {
  return (
    <div class="tick-badge">
      <span class="tick-badge-text">{ticker.tickText}</span>
    </div>
  )
}
