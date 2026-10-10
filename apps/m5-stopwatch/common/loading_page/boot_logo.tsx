import { Component } from '@geastack/core'
import './boot_logo.css'

export class BootLogo extends Component {
  template() {
    return (
      <div class="boot-logo">
        <span class="boot-logo-title">StopWatch</span>
        <span class="boot-logo-status">Starting up ...</span>
        <span class="boot-logo-version">V0.5</span>
      </div>
    )
  }
}
