import { Component } from '@geastack/core'

// Analog watch face. The root centers a square face sized from the smaller
// viewport axis, and the hands are positioned as percentages of that face.
// Their bottom-center sits at 50%/50% and rotates via declarative data-anim.

export class App extends Component {
  template() {
    return (
      <div style={{ width: '100vw', height: '100vh', backgroundColor: '#05070D', position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div id="wf-face" class="watch-analog-face" style={{ position: 'relative', width: 'min(84vw, 84vh)', height: 'min(84vw, 84vh)', borderRadius: '50%', borderWidth: '2px', borderColor: '#1F2937' }}>
          <div
            id="wf-hour"
            class="watch-analog-hour"
            data-anim="rotate"
            data-anim-from="304"
            data-anim-to="664"
            data-anim-dur="43200000"
            data-anim-ease="linear"
            data-anim-iter="-1"
            style={{ position: 'absolute', left: 'calc(50% - 1.2%)', top: 'calc(50% - 23%)', width: '2.4%', height: '23%', backgroundColor: '#F8FAFC', transformOrigin: '50% 100%' }}
          />
          <div
            id="wf-min"
            class="watch-analog-minute"
            data-anim="rotate"
            data-anim-from="54"
            data-anim-to="414"
            data-anim-dur="3600000"
            data-anim-ease="linear"
            data-anim-iter="-1"
            style={{ position: 'absolute', left: 'calc(50% - 0.85%)', top: 'calc(50% - 33%)', width: '1.7%', height: '33%', backgroundColor: '#CBD5E1', transformOrigin: '50% 100%' }}
          />
          <div
            id="wf-sec"
            class="watch-analog-second"
            data-anim="rotate"
            data-anim-from="0"
            data-anim-to="360"
            data-anim-dur="60000"
            data-anim-ease="linear"
            data-anim-iter="-1"
            style={{ position: 'absolute', left: 'calc(50% - 0.5%)', top: 'calc(50% - 41%)', width: '1%', height: '41%', backgroundColor: '#3B82F6', transformOrigin: '50% 100%' }}
          />
          <div id="wf-cap" class="watch-analog-cap" style={{ position: 'absolute', left: 'calc(50% - 2.5%)', top: 'calc(50% - 2.5%)', width: '5%', height: '5%', borderRadius: '50%', backgroundColor: '#3B82F6' }} />
        </div>
      </div>
    )
  }
}
