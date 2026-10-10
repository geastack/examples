import { Component } from '@geastack/core'
import { guide } from '../../../assets'
import './guide_page.css'

export class GuidePage extends Component {
  template() {
    return (
      <div class="guide">
        <img src={guide} />
      </div>
    )
  }
}
