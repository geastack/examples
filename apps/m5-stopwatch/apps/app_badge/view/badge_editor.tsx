import { Component } from '@geastack/core'
import { badge } from '../store'
import './badge_editor.css'

export class BadgeEditor extends Component {
  template() {
    return (
      <div class="badge-edit">
        <span>Connect to Wi-Fi:</span>
        <span>{badge.ap}</span>
        <span>And open page:</span>
        <span>192.168.4.1</span>
      </div>
    )
  }
}
