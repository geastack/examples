import { Component } from '@geastack/core'
import { watchFace } from '../store'
import { digits } from '../../../assets'
import './big_number.css'

export class BigNumber extends Component {
  template() {
    return (
      <div class="big-face">
        <img
          class="digit d0"
          src={digits[watchFace.theme * 40 + Math.floor(watchFace.hours / 10)]}
        />
        <img class="digit d1" src={digits[watchFace.theme * 40 + 10 + (watchFace.hours % 10)]} />
        <img
          class="digit d2"
          src={digits[watchFace.theme * 40 + 20 + Math.floor(watchFace.minutes / 10)]}
        />
        <img class="digit d3" src={digits[watchFace.theme * 40 + 30 + (watchFace.minutes % 10)]} />
      </div>
    )
  }
}
