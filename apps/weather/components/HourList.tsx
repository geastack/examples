import './HourList.css'
import { weather } from '../stores/WeatherStore'

// Hourly forecast cards, via a single keyed-list .map() over weather.hours. The
// root class is static so this mounts as a reactive keyed list (a reactive root
// class would force the non-keyed render path); hours/days visibility is driven
// by a class on the parent .forecast container instead.
export function HourList() {
  return (
    <div class="hour-row" momentum="true">
      {weather.hours.map(hour => (
        <div class="hour">
          <span class="forecast-label">{hour.label}</span>
          <div class="forecast-icon-slot">
            <img class="forecast-icon-img" src={hour.icon} fit="contain" />
          </div>
          <span class="forecast-temp">{hour.temp}</span>
        </div>
      ))}
    </div>
  )
}
