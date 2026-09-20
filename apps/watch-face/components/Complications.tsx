import { watch } from '../stores/WatchStore'

export function Complications() {
  return (
    <div style={{ position: 'absolute', left: '22px', top: '126px', width: '366px', height: '78px', display: 'flex', flexDirection: 'row', gap: '18px' }}>
      <div style={{ width: '174px', height: '78px', borderRadius: '18px', backgroundColor: '#16161A', padding: '12px 0 0 16px' }}>
        <div style={{ position: 'absolute', top: '14px', left: '14px', width: '12px', height: '12px', borderRadius: '6px', backgroundColor: '#64D2FF' }} />
        <span style={{ margin: '0 0 0 18px', fontFamily: 'Inter', fontSize: '16px', color: '#F5F5F7' }}>{watch.weatherText}</span>
        <span style={{ margin: '10px 0 0 0', fontFamily: 'Inter', fontSize: '14px', color: '#8E8E93' }}>{watch.weatherDetail}</span>
      </div>
      <div style={{ width: '174px', height: '78px', borderRadius: '18px', backgroundColor: '#16161A', padding: '12px 0 0 16px' }}>
        <div style={{ position: 'absolute', top: '14px', left: '14px', width: '12px', height: '12px', borderRadius: '6px', backgroundColor: '#FF453A' }} />
        <span style={{ margin: '0 0 0 18px', fontFamily: 'Inter', fontSize: '16px', color: '#F5F5F7' }}>{watch.calendarTime}</span>
        <span style={{ margin: '10px 0 0 0', fontFamily: 'Inter', fontSize: '14px', color: '#8E8E93' }}>{watch.calendarDetail}</span>
      </div>
    </div>
  )
}
