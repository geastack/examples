import { watch } from '../stores/WatchStore'

export function WifiFooter() {
  return (
    <div style={{ position: 'absolute', left: '54px', top: '444px', width: '302px', height: '42px', borderRadius: '18px', backgroundColor: '#16161A', padding: '8px 0 0 20px' }} onClick={() => watch.openSettings()}>
      <span style={{ fontFamily: 'Inter', fontSize: '13px', color: '#8E8E93' }}>{watch.wifiTitle}</span>
      <span style={{ margin: '3px 0 0 0', fontFamily: 'Inter', fontSize: '13px', color: '#F5F5F7' }}>{watch.wifiDetail}</span>
    </div>
  )
}
