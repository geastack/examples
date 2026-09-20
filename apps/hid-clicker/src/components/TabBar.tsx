import { store } from '../stores/ClickerStore'

export function TabBar() {
  return (
    <div style={{
      height: '56px',
      width: '100vw',
      display: 'flex',
      flexDirection: 'row',
      backgroundColor: '#0A0A1A'
    }}>
      <div
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: store.screen === 0 ? '#16213E' : '#0A0A1A'
        }}
        onClick={() => store.switchScreen(0)}
      >
        <span style={{ fontFamily: 'Inter', fontSize: '14px', color: store.screen === 0 ? '#FFFFFF' : '#555555' }}>Slides</span>
      </div>
      <div style={{ width: '1px', height: '56px', backgroundColor: '#0F3460' }} />
      <div
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: store.screen === 1 ? '#16213E' : '#0A0A1A'
        }}
        onClick={() => store.switchScreen(1)}
      >
        <span style={{ fontFamily: 'Inter', fontSize: '14px', color: store.screen === 1 ? '#FFFFFF' : '#555555' }}>Mouse</span>
      </div>
      <div style={{ width: '1px', height: '56px', backgroundColor: '#0F3460' }} />
      <div
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: store.screen === 2 ? '#16213E' : '#0A0A1A'
        }}
        onClick={() => store.switchScreen(2)}
      >
        <span style={{ fontFamily: 'Inter', fontSize: '14px', color: store.screen === 2 ? '#FFFFFF' : '#555555' }}>Pad</span>
      </div>
    </div>
  )
}
