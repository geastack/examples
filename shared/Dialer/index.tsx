import './styles.css'
import { Component } from '@geastack/core'
import { dialer } from './store'

export { dialer }

const DIAL_PAD: string[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']

const SIGNALING_URL = 'ws://gea-dev.local:8788/'

export class Dialer extends Component {
  template() {
    if (dialer.state === 'connected') {
      return (
        <div class="dialer-root">
          <span class="dialer-header">In Call</span>
          <span class="dialer-remote-id">{dialer.remoteId}</span>
          <span class="dialer-status">connected</span>
          <button class="dialer-hangup-button" onPress={() => dialer.hangup()}>
            <span>End</span>
          </button>
        </div>
      )
    }

    if (dialer.state === 'dialing' || dialer.state === 'ringing') {
      return (
        <div class="dialer-root">
          <span class="dialer-header">{dialer.state === 'ringing' ? 'Ringing' : 'Dialing'}</span>
          <span class="dialer-remote-id">{dialer.remoteId}</span>
          <span class="dialer-status">{dialer.state}</span>
          <button class="dialer-hangup-button" onPress={() => dialer.hangup()}>
            <span>Cancel</span>
          </button>
        </div>
      )
    }

    return (
      <div class="dialer-root">
        <span class="dialer-header">Dialer</span>
        <span class="dialer-remote-id">{dialer.remoteId || '—'}</span>
        {[0, 1, 2, 3].map((row) => (
          <div class="dialer-pad-row">
            {[0, 1, 2].map((col) => {
              const digit = DIAL_PAD[row * 3 + col]
              return (
                <button class="dialer-pad-key" onPress={() => dialer.pressDigit(digit)}>
                  <span>{digit}</span>
                </button>
              )
            })}
          </div>
        ))}
        <button class="dialer-call-button" onPress={() => dialer.dial(SIGNALING_URL)}>
          <span>Call</span>
        </button>
        {dialer.errorMessage ? <span class="dialer-error">{dialer.errorMessage}</span> : null}
      </div>
    )
  }
}
