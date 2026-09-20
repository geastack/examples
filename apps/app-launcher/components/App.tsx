import { Component } from '@geastack/core'
import { SettingsPanel } from '../../../shared/Settings'
import './App.css'
import './SettingsPanel.css'
import { LauncherMenu } from './LauncherMenu'

export class App extends Component {
  template() {
    return (
      <div>
        <LauncherMenu />
        <SettingsPanel />
      </div>
    )
  }
}
