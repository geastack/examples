import { Component } from '@geastack/core'
import { BallField } from './BallField'
import { FpsBadge } from './FpsBadge'

export class App extends Component {
  template() {
    return (
      <div class="app">
        <FpsBadge />
        <BallField />
      </div>
    )
  }
}
