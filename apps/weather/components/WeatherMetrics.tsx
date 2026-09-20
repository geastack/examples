import './WeatherMetrics.css'
import { weather } from '../stores/WeatherStore'

export function WeatherMetrics() {
  return (
    <div class="metrics">
      <span class="metrics-rule metrics-rule-top"></span>
      <span class="metrics-rule metrics-rule-bottom"></span>
      <div class="metric">
        <span class="metric-label">Feels</span>
        <span class="metric-value">{weather.feels}</span>
      </div>
      <div class="metric">
        <span class="metric-divider"></span>
        <span class="metric-label">Wind</span>
        <span class="metric-value">{weather.wind}</span>
      </div>
      <div class="metric">
        <span class="metric-divider"></span>
        <span class="metric-label">Rain</span>
        <span class="metric-value">{weather.rain}</span>
      </div>
      <div class="metric">
        <span class="metric-divider"></span>
        <span class="metric-label">Humid</span>
        <span class="metric-value">{weather.humid}</span>
      </div>
    </div>
  )
}
