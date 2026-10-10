import { system } from '../../stores/SystemStore'
import { Component } from '@geastack/core'

import './ErrorMessage.css'

export class ErrorMessage extends Component {
  template() {
    return (
      <button class="error" onClick={() => system.clearError()}>
        {system.error}
      </button>
    )
  }
}
