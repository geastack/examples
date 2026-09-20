import { watch } from '../stores/WatchStore'

export function Metrics() {
  return (
    <div style={{ position: 'absolute', left: '52px', top: '226px', width: '306px', height: '128px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
      <div style={{ width: '128px', height: '128px', borderRadius: '64px', borderWidth: '6px', borderColor: '#222226', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', left: '49px', bottom: '16px', width: '30px', height: watch.stepPct, borderRadius: '15px', backgroundColor: '#30D158' }} />
        <span style={{ fontFamily: 'Inter', fontSize: '24px', color: '#F5F5F7' }}>{watch.stepText}</span>
        <span style={{ margin: '8px 0 0 0', fontFamily: 'Inter', fontSize: '14px', color: '#8E8E93' }}>steps</span>
      </div>
      <div style={{ width: '128px', height: '128px', borderRadius: '64px', borderWidth: '6px', borderColor: '#222226', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', left: '49px', bottom: '16px', width: '30px', height: watch.batteryPct, borderRadius: '15px', backgroundColor: watch.batteryPct < 25 ? '#FF453A' : '#30D158' }} />
        <span style={{ fontFamily: 'Inter', fontSize: '24px', color: '#F5F5F7' }}>{watch.batteryText}</span>
        <span style={{ margin: '8px 0 0 0', fontFamily: 'Inter', fontSize: '14px', color: '#8E8E93' }}>battery</span>
      </div>
    </div>
  )
}
