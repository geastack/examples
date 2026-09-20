import { Component } from '@geastack/core'
import { BubbleField } from './BubbleField'
import { BubbleLabel } from './BubbleLabel'
import { FpsBadge } from './FpsBadge'
import { bubbleGrid } from '../stores/BubbleGridStore'

export class App extends Component {
  template() {
    return (
      <div
        class="bubble-grid-jsx"
        onTouchStart={e => bubbleGrid.pointerDown(e.clientX, e.clientY)}
        onTouchMove={e => bubbleGrid.pointerMove(e.clientX, e.clientY)}
        onTouchEnd={e => bubbleGrid.pointerUp(e.clientX, e.clientY)}
      >
        <BubbleField />
        <BubbleLabel />
        <FpsBadge />
      </div>
    )
  }
}
