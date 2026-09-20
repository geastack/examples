import './LauncherMenu.css'
import { LauncherList } from './LauncherList'

export function LauncherMenu() {
  return (
    <div class="launcher-root">
      <span class="launcher-heading">App Launcher</span>
      <LauncherList />
    </div>
  )
}
