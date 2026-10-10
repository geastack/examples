import { watchFace } from '../../apps/app_watch_face/store'
import { Component } from '@geastack/core'

import './ArcTopClock.css'

export class ArcTopClock extends Component {
  template() {
    return (
      <div class="top-clock">
        <div class="arc-glyph arc0">
          <span>{watchFace.hour[0] === '0' ? 'O' : watchFace.hour[0]}</span>
        </div>
        <div class="arc-glyph arc1">
          <span>{watchFace.hour[1] === '0' ? 'O' : watchFace.hour[1]}</span>
        </div>
        <div class="arc-glyph arc2">
          <span>:</span>
        </div>
        <div class="arc-glyph arc3">
          <span>{watchFace.minute[0] === '0' ? 'O' : watchFace.minute[0]}</span>
        </div>
        <div class="arc-glyph arc4">
          <span>{watchFace.minute[1] === '0' ? 'O' : watchFace.minute[1]}</span>
        </div>
      </div>
    )
  }
}
