import './DayList.css'
import { weather } from '../stores/WeatherStore'

// Daily forecast cards, via a single keyed-list .map() over weather.days. Static
// root class (see HourList) so it mounts as a reactive keyed list.
export function DayList() {
  return (
    <div class="day-row" momentum="true">
      {weather.days.map(day => (
        <div class="day-card">
          <span class="forecast-label">{day.label}</span>
          <div class="forecast-icon-slot">
            <img class="forecast-icon-img" src={day.icon} fit="contain" />
          </div>
          <span class="forecast-temp">{day.temp}</span>
        </div>
      ))}
    </div>
  )
}
