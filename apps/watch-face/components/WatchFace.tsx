import { watch } from '../stores/WatchStore'
import { Complications } from './Complications'
import { ForecastStrip } from './ForecastStrip'
import { HeroTime } from './HeroTime'
import { Metrics } from './Metrics'
import { WifiFooter } from './WifiFooter'

export function WatchFace() {
  return (
    <div style={{ display: watch.screen === 0 ? 'flex' : 'none', position: 'absolute', left: '0px', top: '0px', width: '100vw', height: '100vh', fontFamily: 'Inter', fontSize: '15px' }}>
      <div style={{ position: 'absolute', left: '-90px', top: '-74px', width: '230px', height: '230px', borderRadius: '115px', backgroundColor: '#261010' }} />
      <div style={{ position: 'absolute', right: '-70px', top: '190px', width: '180px', height: '180px', borderRadius: '90px', backgroundColor: '#092018' }} />
      <HeroTime />
      <Complications />
      <Metrics />
      <ForecastStrip />
      <WifiFooter />
    </div>
  )
}
