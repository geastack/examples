import { watch } from '../stores/WatchStore'

export function HeroTime() {
  return (
    <div style={{ position: 'absolute', left: '24px', top: '22px', width: '362px', height: '92px' }}>
      <span style={{ fontFamily: 'Inter', fontSize: '16px', color: '#FF453A' }}>{watch.dateText}</span>
      <span style={{ margin: '8px 0 0 0', fontFamily: 'Inter', fontSize: '70px', color: '#F5F5F7' }}>{watch.timeText}</span>
    </div>
  )
}
