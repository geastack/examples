import { Component } from '@geastack/core'
import { scrollProbe } from '../stores/VirtualScrollStore'
import { VirtualListView } from './VirtualListView'

export class App extends Component {
  template() {
    return (
      <div class="probe-app">
        <div class="probe-hud">
          <div class="probe-hud-row">
            <span class="probe-hud-label">speed</span>
            <span class="probe-hud-value">{scrollProbe.speedText}</span>
          </div>
          <div class="probe-hud-row">
            <span class="probe-hud-label">scrolled</span>
            <span class="probe-hud-value">{scrollProbe.scrollText}</span>
          </div>
          <div class="probe-hud-row probe-hud-row-small">
            <span>{scrollProbe.windowText}</span>
            <span>{scrollProbe.directionText}</span>
            <span>{scrollProbe.progressText}</span>
          </div>
        </div>
        <div class="probe-scale">
          <span class="probe-scale-text">{scrollProbe.scaleText}</span>
        </div>
        <VirtualListView />
      </div>
    )
  }
}
