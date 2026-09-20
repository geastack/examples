import { Component } from '@geastack/core'
import { Ball } from './Ball'
import { BrickField } from './BrickField'
import { Hud } from './Hud'
import { Paddle } from './Paddle'
import { breakout } from '../stores/BreakoutStore'

export class App extends Component {
  template() {
    return (
      <div
        class="breakout-app"
        onTouchStart={event => breakout.handleTouchStart(event.clientX)}
        onTouchMove={event => breakout.handleTouchMove(event.clientX)}
      >
        <Hud />
        <BrickField />
        <Paddle />
        <Ball />
      </div>
    )
  }
}
