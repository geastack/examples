import { Component } from '@geastack/core'
import { setup } from '../store'
import './about.css'

export class AboutView extends Component {
  template() {
    return (
      <div class="about">
        <span class="sad">:(</span>
        <span class="crash-message">
          {
            "Your StopWatch ran into a problem and\nneeds to restart. We're just collecting some\nerror info, and then we'll restart for you."
          }
        </span>
        <span class="crash-progress">{setup.progress}% Complete</span>
        <span class="crash-tips">
          {'If you call a support person, give them this info:\nStop code: I_DONT_REALLY_KNOW'}
        </span>
      </div>
    )
  }
}
