import { system } from '../../stores/SystemStore'
import { Component } from '@geastack/core'

import './Dialog.css'

export class Dialog extends Component {
  template() {
    return (
      <div class="dialog">
        <span>{system.dialog === 'badge' ? 'Enter badge edit?' : 'Delete this alarm?'}</span>
        <div class="dialog-buttons">
          <button
            class={system.dialog === 'badge' ? 'confirm' : 'delete'}
            onClick={() => system.confirmDialog()}
          >
            {system.dialog === 'badge' ? 'Edit' : 'Delete'}
          </button>
          <button onClick={() => system.cancelDialog()}>Cancel</button>
        </div>
      </div>
    )
  }
}
