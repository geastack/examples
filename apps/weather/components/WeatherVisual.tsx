import './WeatherVisual.css'
import { weather } from '../stores/WeatherStore'

// The hero condition art: one image per visual, the active one shown via a class.
// Visibility folds into the class (no inline display style); the inactive images
// stay decoded so switching conditions is instant.
export function WeatherVisual() {
  return (
    <div class="weather-visual">
      <img
        class={{ 'weather-img': true, 'is-hidden': weather.visual != 'clear' }}
        src="assets/weather/weather-clear.png"
        fit="contain"
      />
      <img
        class={{ 'weather-img': true, 'is-hidden': weather.visual != 'cloud' }}
        src="assets/weather/weather-cloud.png"
        fit="contain"
      />
      <img
        class={{ 'weather-img': true, 'is-hidden': weather.visual != 'rain' }}
        src="assets/weather/weather-rain.png"
        fit="contain"
      />
      <img
        class={{ 'weather-img': true, 'is-hidden': weather.visual != 'snow' }}
        src="assets/weather/weather-snow.png"
        fit="contain"
      />
      <img
        class={{ 'weather-img': true, 'is-hidden': weather.visual != 'fog' }}
        src="assets/weather/weather-fog.png"
        fit="contain"
      />
    </div>
  )
}
