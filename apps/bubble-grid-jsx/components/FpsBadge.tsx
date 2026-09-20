import { bubbleGrid } from '../stores/BubbleGridStore'

export function FpsBadge() {
  return (
    <span
      class="bubble-grid-fps"
      style={{
        left: 0,
        top: bubbleGrid.fpsTop,
        width: bubbleGrid.screenWidth,
        height: bubbleGrid.fpsFontSize,
        fontSize: bubbleGrid.fpsFontSize
      }}
    >
      {bubbleGrid.fpsText}
    </span>
  )
}
