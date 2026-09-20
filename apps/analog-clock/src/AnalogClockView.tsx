import '../styles.css'
import { analogClock } from './ClockStore'

function ClockHand({ className, angle }: { className: string; angle: number }) {
  return <div class={className} style={{ transform: `rotate(${angle / 10}deg)` }} />
}

export function AnalogClockView() {
  const markerClasses = [
    'clock-marker clock-marker-major clock-marker-12',
    'clock-marker clock-marker-1',
    'clock-marker clock-marker-2',
    'clock-marker clock-marker-major clock-marker-3',
    'clock-marker clock-marker-4',
    'clock-marker clock-marker-5',
    'clock-marker clock-marker-major clock-marker-6',
    'clock-marker clock-marker-7',
    'clock-marker clock-marker-8',
    'clock-marker clock-marker-major clock-marker-9',
    'clock-marker clock-marker-10',
    'clock-marker clock-marker-11'
  ]

  return (
    <div class="clock-root">
      <div class="clock-stage">
        <div class="clock-shadow" />
        <div class="clock-face" />
        {markerClasses.map(markerClass => (
          <div class={markerClass} />
        ))}

        <span class="clock-number clock-number-12">12</span>
        <span class="clock-number clock-number-3">3</span>
        <span class="clock-number clock-number-6">6</span>
        <span class="clock-number clock-number-9">9</span>

        <ClockHand angle={analogClock.hourAngle} className="clock-hand clock-hour-hand" />
        <ClockHand angle={analogClock.minuteAngle} className="clock-hand clock-minute-hand" />
        <ClockHand angle={analogClock.secondAngle} className="clock-hand clock-second-hand" />
        <div class="clock-center-cap" />
      </div>

      <span class="clock-time">{analogClock.timeText}</span>
      <span class="clock-label">Analog Clock</span>
    </div>
  )
}
