import { Component } from '@geastack/core'
import { diag } from '../../stores/DiagnosticsStore'
import './SpeakerScreen.css'
import './NotPresent.css'

export class SpeakerScreen extends Component {
  template() {
    return (
      <div class="screen-body speaker-screen">
        <div class="speaker-live">
          <div class="kv-row"><span class="kv-k">CODEC</span><span class="kv-v">{diag.curDetail}</span></div>
          <span class="speaker-hint">{diag.compact == 1 ? 'PICK A NOTE BELOW, KEY1 PLAYS A 250 ms SINE' : 'TAP A NOTE TO PLAY A 250 ms SINE'}</span>
          {diag.compact == 0 ? (
            <div class="tone-grid">
              <div id="speaker.440" class="tone-btn" onClick={() => diag.tone(440)}>440 Hz</div>
              <div id="speaker.880" class="tone-btn" onClick={() => diag.tone(880)}>880 Hz</div>
              <div id="speaker.1320" class="tone-btn" onClick={() => diag.tone(1320)}>1320 Hz</div>
            </div>
          ) : null}
        </div>
      </div>
    )
  }
}
