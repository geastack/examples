import { Component } from '@geastack/core'
import { store } from '../stores/ClickerStore'
import { StatusBar } from './StatusBar'
import { PresentationScreen } from './PresentationScreen'
import { MouseScreen } from './MouseScreen'
import { TrackpadScreen } from './TrackpadScreen'

export class App extends Component {
  template() {
    return (
      <div class="app">
        <StatusBar />
        <div style={{ display: store.screen === 0 ? 'flex' : 'none', flex: 1 }}>
          <PresentationScreen />
        </div>
        <div style={{ display: store.screen === 1 ? 'flex' : 'none', flex: 1 }}>
          <MouseScreen />
        </div>
        <div style={{ display: store.screen === 2 ? 'flex' : 'none', flex: 1 }}>
          <TrackpadScreen />
        </div>
      </div>
    )
  }
}
