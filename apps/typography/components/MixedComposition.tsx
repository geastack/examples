import './MixedComposition.css'

export function MixedComposition() {
  return (
    <div class="mixed-composition">
      <h2 class="mixed-composition-title">Mixed Composition</h2>
      <p class="mixed-composition-copy">
        A paragraph can carry a <span class="mixed-composition-label">technical label</span>
        {', a '}
        <span class="mixed-composition-score">score value</span>
        {', and a '}
        <span class="mixed-composition-loud">LOUD MOMENT</span>
        {' without leaving the block.'}
      </p>
      <p class="mixed-composition-note">
        Scroll to inspect wrapping, inheritance, heading defaults, and inline spans across all four
        bundled fonts.
      </p>
    </div>
  )
}
