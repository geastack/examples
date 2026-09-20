import './WeatherForecast.css'
import { weather } from '../stores/WeatherStore'
import { HourList } from './HourList'
import { DayList } from './DayList'

export function WeatherForecast() {
  return (
    <div class={{ forecast: true, 'show-days': weather.forecastMode == 'days' }}>
      <div class="section-head">
        <span class="section-title">{weather.forecastMode == 'hours' ? 'Next hours' : 'Next days'}</span>
        <div class="forecast-tabs">
          <button
            class={{ 'forecast-tab': true, 'is-active': weather.forecastMode == 'hours' }}
            onClick={() => weather.setForecastMode('hours')}
          >
            Hours
          </button>
          <button
            class={{ 'forecast-tab': true, 'is-active': weather.forecastMode == 'days' }}
            onClick={() => weather.setForecastMode('days')}
          >
            Days
          </button>
        </div>
      </div>
      <HourList />
      <DayList />
    </div>
  )
}
