import { bubbleGrid } from '../stores/BubbleGridStore'

export function BubbleField() {
  return (
    <div class="bubble-field">
      {bubbleGrid.bubbles.map(bubble => (
        <div
          class="bubble"
          style={{
            width: bubble.size,
            height: bubble.size,
            backgroundColor: bubble.color,
            opacity: bubble.opacity,
            left: bubble.x,
            top: bubble.y
          }}
        />
      ))}
    </div>
  )
}
