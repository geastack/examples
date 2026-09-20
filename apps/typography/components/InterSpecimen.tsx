import './InterSpecimen.css'

export function InterSpecimen() {
  return (
    <div class="inter-specimen">
      <span class="inter-specimen-title">Inter</span>
      <p>
        Inter is the steady interface voice: compact, neutral, and readable at small sizes. It keeps
        status text, settings labels, and dense controls calm without becoming invisible.
      </p>
      <p>
        The quick brown fox jumps over 13 lazy dogs while every pixel lands on the same baseline.
        <span class="inter-specimen-emphasis"> Inline emphasis</span>
        {' stays inside the paragraph flow.'}
      </p>
      <span class="inter-specimen-sample">Aa Bb Cc 12345</span>
      <span class="inter-specimen-caps">ABCDEFGHIJKLMNOPQRSTUVWXYZ</span>
    </div>
  )
}
