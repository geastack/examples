import { watch } from '../stores/WatchStore'

export function WifiSettings() {
  return (
    <div style={{ display: watch.screen === 1 ? 'flex' : 'none', position: 'absolute', left: '0px', top: '0px', width: '100vw', height: '100vh', backgroundColor: '#050507', fontFamily: 'Inter', fontSize: '15px' }}>
      <div style={{ position: 'absolute', left: '-88px', top: '-92px', width: '242px', height: '242px', borderRadius: '121px', backgroundColor: '#061A2F' }} />
      <div style={{ position: 'absolute', right: '-90px', bottom: '-86px', width: '220px', height: '220px', borderRadius: '110px', backgroundColor: '#1C1602' }} />

      <div style={{ position: 'absolute', left: '22px', top: '18px', width: '72px', height: '36px', borderRadius: '18px', backgroundColor: '#1C1C22', alignItems: 'center', justifyContent: 'center' }} onClick={() => watch.closeSettings()}>
        <span style={{ fontFamily: 'Inter', fontSize: '15px', color: '#F5F5F7' }}>Back</span>
      </div>
      <span style={{ position: 'absolute', left: '112px', top: '22px', fontFamily: 'Inter', fontSize: '24px', color: '#F5F5F7' }}>Wi-Fi Setup</span>
      <span style={{ position: 'absolute', left: '25px', top: '60px', fontFamily: 'Inter', fontSize: '14px', color: '#8E8E93' }}>{watch.settingsStatus}</span>

      <span style={{ position: 'absolute', left: '27px', top: '78px', fontFamily: 'Inter', fontSize: '13px', color: '#8E8E93' }}>Network name</span>
      <div style={{ position: 'absolute', left: '25px', top: '94px', width: '360px', height: '52px', borderRadius: '16px', backgroundColor: '#1C1C22', justifyContent: 'center' }} onClick={() => watch.selectSsid()}>
        <span style={{ marginLeft: '18px', fontFamily: 'Inter', fontSize: '15px', color: '#F5F5F7' }}>{watch.wifiSsid}</span>
      </div>

      <span style={{ position: 'absolute', left: '27px', top: '148px', fontFamily: 'Inter', fontSize: '13px', color: '#8E8E93' }}>Password</span>
      <div style={{ position: 'absolute', left: '25px', top: '164px', width: '360px', height: '52px', borderRadius: '16px', backgroundColor: '#1C1C22', justifyContent: 'center' }} onClick={() => watch.selectPassword()}>
        <span style={{ marginLeft: '18px', fontFamily: 'Inter', fontSize: '15px', color: '#F5F5F7' }}>Hidden</span>
      </div>

      <div style={{ position: 'absolute', left: '48px', top: '226px', width: '132px', height: '30px', borderRadius: '15px', backgroundColor: '#1C1C22', alignItems: 'center', justifyContent: 'center' }} onClick={() => watch.closeSettings()}>
        <span style={{ fontFamily: 'Inter', fontSize: '15px', color: '#8E8E93' }}>Cancel</span>
      </div>
      <div style={{ position: 'absolute', left: '230px', top: '226px', width: '132px', height: '30px', borderRadius: '15px', backgroundColor: '#0A84FF', alignItems: 'center', justifyContent: 'center' }} onClick={() => watch.saveWifi()}>
        <span style={{ fontFamily: 'Inter', fontSize: '15px', color: '#FFFFFF' }}>Save</span>
      </div>
    </div>
  )
}
