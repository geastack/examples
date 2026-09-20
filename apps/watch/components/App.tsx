import { Component } from '@geastack/core'
import { watch } from '../stores/WatchStore'

// Clean digital watch face. Reactive HH/MM/SS bindings advance via the store;
// the colon pulses through gea::css (declarative data-anim).
//
// COORDINATES: the panel is 410x502 physical at devicePixelRatio 1.5, so the CSS
// space is ~273x334. Use 100vw for full-width centered text and keep absolute
// lefts within ~0..273. geatsc fast-path rules: static-literal styles only, no
// JSX comments, absolute positioning (see docs §8c).

export class App extends Component {
  template() {
    return (
      <div style={{ width: '100vw', height: '100vh', backgroundColor: '#05070D', position: 'absolute' }}>
        <span style={{ position: 'absolute', left: '150px', top: '16px', width: '110px', fontSize: '14px', color: '#4ADE80', textAlign: 'right' }}>
          {watch.battery}
        </span>
        <span style={{ position: 'absolute', left: '0px', top: '48px', width: '100vw', fontSize: '13px', color: '#3B82F6', textAlign: 'center' }}>
          geaOS
        </span>
        <span style={{ position: 'absolute', left: '6px', top: '116px', width: '124px', fontSize: '54px', color: '#F8FAFC', textAlign: 'right' }}>
          {watch.hh}
        </span>
        <span
          id="wf-colon"
          data-anim="opacity"
          data-anim-from="255"
          data-anim-to="60"
          data-anim-dur="1000"
          data-anim-ease="ease-in-out"
          data-anim-dir="alternate"
          data-anim-iter="-1"
          style={{ position: 'absolute', left: '128px', top: '120px', width: '17px', fontSize: '48px', color: '#3B82F6', textAlign: 'center' }}
        >
          :
        </span>
        <span style={{ position: 'absolute', left: '143px', top: '116px', width: '124px', fontSize: '54px', color: '#F8FAFC', textAlign: 'left' }}>
          {watch.mm}
        </span>
        <span style={{ position: 'absolute', left: '0px', top: '210px', width: '100vw', fontSize: '26px', color: '#64748B', textAlign: 'center' }}>
          {watch.ss}
        </span>
        <span style={{ position: 'absolute', left: '0px', top: '272px', width: '100vw', fontSize: '18px', color: '#94A3B8', textAlign: 'center' }}>
          {watch.date}
        </span>
        <span style={{ position: 'absolute', left: '8px', top: '306px', width: '257px', fontSize: '15px', color: '#FDE68A', textAlign: 'center' }}>
          {watch.notification}
        </span>
      </div>
    )
  }
}
