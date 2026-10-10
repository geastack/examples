import { Component } from '@geastack/core'
import type { GeaElement } from '@geastack/core'
import { watchFace } from '../store'
import './number_flow.css'

const labels = [
  { id: 0, text: '9' },
  { id: 1, text: '0' },
  { id: 2, text: '1' },
  { id: 3, text: '2' },
  { id: 4, text: '3' },
  { id: 5, text: '4' },
  { id: 6, text: '5' },
  { id: 7, text: '6' },
  { id: 8, text: '7' },
  { id: 9, text: '8' },
  { id: 10, text: '9' },
  { id: 11, text: '0' },
]

class DigitColumn extends Component<GeaElement, { digit: number }> {
  declare props: { digit: number }

  template(props?: { digit: number }) {
    const digit = props ? props.digit : this.props.digit

    return (
      <div
        class="flow-column"
        style={{
          left: watchFace.numberFlowDigits[digit].x,
          opacity: watchFace.numberFlowDigits[digit].opacity,
        }}
      >
        <div class="flow-rail" style={{ top: -watchFace.numberFlowDigits[digit].y }}>
          {labels.map((label) => (
            <span
              key={label.id}
              class={
                watchFace.numberFlowCorrections[digit] & (1 << label.id)
                  ? 'flow-number flow-minus'
                  : watchFace.numberFlowCorrections[digit] & (1 << (label.id + 12))
                    ? 'flow-number flow-plus'
                    : 'flow-number'
              }
              style={{ top: label.id * 60 }}
            >
              {label.text}
            </span>
          ))}
        </div>
      </div>
    )
  }
}

export class NumberFlow extends Component {
  template() {
    return (
      <div class="number-face" style={{ backgroundColor: watchFace.themeBg }}>
        <div
          class="flow flow-hour"
          style={{ backgroundColor: watchFace.themePanel, color: watchFace.themeText }}
        >
          <div
            class="flow-digits"
            style={{
              left: (100 - 42 - watchFace.numberFlowDigits[1].x) / 2,
              width: 42 + watchFace.numberFlowDigits[1].x,
            }}
          >
            <DigitColumn digit={0} />
            <DigitColumn digit={1} />
          </div>
        </div>
        <div
          class="flow flow-minute"
          style={{ backgroundColor: watchFace.themePanel, color: watchFace.themeText }}
        >
          <div
            class="flow-digits"
            style={{
              left: (100 - 42 - watchFace.numberFlowDigits[3].x) / 2,
              width: 42 + watchFace.numberFlowDigits[3].x,
            }}
          >
            <DigitColumn digit={2} />
            <DigitColumn digit={3} />
          </div>
        </div>
        <div
          class="flow flow-second"
          style={{ backgroundColor: watchFace.themePanel, color: watchFace.themeText }}
        >
          <div
            class="flow-digits"
            style={{
              left: (100 - 42 - watchFace.numberFlowDigits[5].x) / 2,
              width: 42 + watchFace.numberFlowDigits[5].x,
            }}
          >
            <DigitColumn digit={4} />
            <DigitColumn digit={5} />
          </div>
        </div>
        <span class="face-date" style={{ color: watchFace.themeDate }}>
          {watchFace.faceDate}
        </span>
      </div>
    )
  }
}
