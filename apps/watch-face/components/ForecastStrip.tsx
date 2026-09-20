export function ForecastStrip() {
  return (
    <div style={{ position: 'absolute', left: '22px', top: '370px', width: '366px', height: '58px', display: 'flex', flexDirection: 'row', gap: '8px' }}>
      <div style={{ flex: 1, borderRadius: '16px', backgroundColor: '#16161A', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '28px', height: '4px', borderRadius: '2px', backgroundColor: '#64D2FF' }} />
        <span style={{ margin: '6px 0 0 0', fontFamily: 'Inter', fontSize: '12px', color: '#8E8E93' }}>Now</span>
        <span style={{ margin: '4px 0 0 0', fontFamily: 'Inter', fontSize: '14px', color: '#F5F5F7' }}>72F</span>
      </div>
      <div style={{ flex: 1, borderRadius: '16px', backgroundColor: '#16161A', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '28px', height: '4px', borderRadius: '2px', backgroundColor: '#30D158' }} />
        <span style={{ margin: '6px 0 0 0', fontFamily: 'Inter', fontSize: '12px', color: '#8E8E93' }}>2 PM</span>
        <span style={{ margin: '4px 0 0 0', fontFamily: 'Inter', fontSize: '14px', color: '#F5F5F7' }}>74F</span>
      </div>
      <div style={{ flex: 1, borderRadius: '16px', backgroundColor: '#16161A', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '28px', height: '4px', borderRadius: '2px', backgroundColor: '#FFD60A' }} />
        <span style={{ margin: '6px 0 0 0', fontFamily: 'Inter', fontSize: '12px', color: '#8E8E93' }}>5 PM</span>
        <span style={{ margin: '4px 0 0 0', fontFamily: 'Inter', fontSize: '14px', color: '#F5F5F7' }}>70F</span>
      </div>
    </div>
  )
}
