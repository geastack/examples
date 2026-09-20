import { Component } from '@geastack/core'
import { dateWatch } from '../stores/DateWatchStore'

// Date + time watch face. Reactive bindings ({dateWatch.X}) advance via the
// store (real wall-clock from gea::host::Clock); the weekday gently pulses via
// gea::css (declarative data-anim). Distinct amber accent vs the blue digital
// face and the analog face.
//
// COORDINATES: 410x502 physical at devicePixelRatio 1.5 => ~273x334 CSS space.
// 100vw + text-align:center for full-width centered text. geatsc fast-path:
// static-literal styles only, no JSX comments inside the template, absolute
// positioning (see docs §8c).
export class App extends Component {
  template() {
    return (
      <div style={{ width: '100vw', height: '100vh', backgroundColor: '#0A0A12', position: 'absolute' }}>
        <span style={{ position: 'absolute', left: '150px', top: '16px', width: '110px', fontSize: '14px', color: '#4ADE80', textAlign: 'right' }}>
          {dateWatch.battery}
        </span>
        <span
          id="dw-weekday"
          data-anim="opacity"
          data-anim-from="255"
          data-anim-to="150"
          data-anim-dur="2400"
          data-anim-ease="ease-in-out"
          data-anim-dir="alternate"
          data-anim-iter="-1"
          style={{ position: 'absolute', left: '0px', top: '54px', width: '100vw', fontSize: '22px', color: '#F59E0B', textAlign: 'center' }}
        >
          {dateWatch.wd}
        </span>
        <span style={{ position: 'absolute', left: '0px', top: '90px', width: '100vw', fontSize: '96px', color: '#F8FAFC', textAlign: 'center' }}>
          {dateWatch.day}
        </span>
        <span style={{ position: 'absolute', left: '0px', top: '224px', width: '100vw', fontSize: '24px', color: '#94A3B8', textAlign: 'center' }}>
          {dateWatch.mon}
        </span>
        <span style={{ position: 'absolute', left: '0px', top: '280px', width: '100vw', fontSize: '30px', color: '#F59E0B', textAlign: 'center' }}>
          {dateWatch.time}
        </span>
        <span style={{ position: 'absolute', left: '8px', top: '314px', width: '257px', fontSize: '13px', color: '#FDE68A', textAlign: 'center' }}>
          {dateWatch.notification}
        </span>
      </div>
    )
  }
}
