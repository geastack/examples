import { Component } from '@geastack/core'
import { Background } from './Background'
import { Controls } from './Controls'
import { Hud } from './Hud'
import { World } from './World'
import { WonOverlay } from './WonOverlay'
import { DISPLAY_H, DISPLAY_W } from '../constants'

export class App extends Component {
  template() {
    return (
      <div style={{ width: DISPLAY_W, height: DISPLAY_H, overflow: 'hidden', backgroundColor: '#68C5F7' }}>
        <Background />
        <World />
        <Hud />
        <Controls />
        <WonOverlay />
      </div>
    )
  }
}
