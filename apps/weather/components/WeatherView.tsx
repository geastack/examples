import './WeatherView.css'
import { weather } from '../stores/WeatherStore'
import { CityRail } from './CityRail'
import { WeatherForecast } from './WeatherForecast'
import { WeatherMetrics } from './WeatherMetrics'
import { WeatherVisual } from './WeatherVisual'

export function WeatherView() {
  return (
    <div class="weather-view">
      <div class="topbar">
        <div class="top-actions">
          <button class="manage-button" onClick={() => weather.openManager()}>
            <span class="topbar-button-label">Cities</span>
          </button>
          <button class="unit-pill" onClick={() => weather.toggleUnit()}>
            <span class="topbar-button-label">{weather.unit}</span>
          </button>
          <button class="icon-button" onClick={() => weather.refreshActive()}>
            <span class="topbar-button-label">Refresh</span>
          </button>
        </div>
      </div>
      <CityRail />
      <div class="hero">
        <div class="place-block">
          <div class="place-row">
            <span class="place-name">{weather.name}</span>
          </div>
          <span class="location-detail">{weather.subtitle}</span>
        </div>
        <div class="hero-stage">
          <div class="temp-row">
            <span class="temp">{weather.temp}</span>
            <span
              class={{
                degree: true,
                'is-cloud': weather.visual == 'cloud' || weather.visual == 'fog',
                'is-rain': weather.visual == 'rain',
                'is-snow': weather.visual == 'snow',
                'is-night': weather.visual == 'night'
              }}
            >
              °
            </span>
          </div>
          <WeatherVisual />
        </div>
        <div class="condition-row">
          <span class="condition">{weather.condition}</span>
          <span class="range">{weather.range}</span>
        </div>
      </div>
      <WeatherMetrics />
      <WeatherForecast />
    </div>
  )
}
