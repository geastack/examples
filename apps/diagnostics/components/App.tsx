import { Component } from '@geastack/core'
import { diag } from '../stores/DiagnosticsStore'
import { HomeOverview } from './HomeOverview'
import { ScreenHost } from './screens/ScreenHost'
import '../theme.css'
import './App.css'

export class App extends Component {
  template() {
    return (
      <div
        class="diag-root"
        onKeyDown={event => diag.keydown(event.keyCode)}
        onRotary={event => diag.rotary(event.delta)}
      >
        <div class="diag-body">
          {diag.screen == '' ? <HomeOverview /> : <ScreenHost />}
        </div>
        <div class="hint-bar">
          <span class="hint-item">{diag.hintLeft}</span>
          <span class="hint-item">{diag.hintRight}</span>
        </div>
      </div>
    )
  }
}
