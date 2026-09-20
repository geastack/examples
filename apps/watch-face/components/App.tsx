import { Component } from '@geastack/core'
import { WatchFace } from './WatchFace'
import { WifiSettings } from './WifiSettings'

export class App extends Component {
  template() {
    return (
      <div style={{ width: '100vw', height: '100vh', backgroundColor: '#000000', overflow: 'hidden', fontFamily: 'Inter', fontSize: '15px' }}>
        <WatchFace />
        <WifiSettings />
      </div>
    )
  }
}
