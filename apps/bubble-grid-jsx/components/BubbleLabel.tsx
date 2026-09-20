import { bubbleGrid } from '../stores/BubbleGridStore'

export function BubbleLabel() {
  return (
    <>
      <div
        class="bubble-label-chip"
        style={{
          left: bubbleGrid.labelLeft,
          top: bubbleGrid.labelTop,
          width: bubbleGrid.labelWidth,
          height: bubbleGrid.labelHeight,
          opacity: bubbleGrid.labelChipOpacity
        }}
      />
      <span
        class="bubble-label-text"
        style={{
          left: bubbleGrid.labelLeft,
          top: bubbleGrid.labelTop,
          width: bubbleGrid.labelWidth,
          height: bubbleGrid.labelHeight,
          fontSize: bubbleGrid.labelFontSize,
          opacity: bubbleGrid.labelTextOpacity
        }}
      >
        {bubbleGrid.labelText}
      </span>
    </>
  )
}
