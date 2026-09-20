import './CityRail.css'
import { weather } from '../stores/WeatherStore'

// One pinned-city chip per city, via a single keyed-list .map(). Visibility and
// the active highlight are folded into the class object — no inline display style.
export function CityRail() {
  return (
    <div class="city-rail" momentum="true">
      {weather.cities.map(city => (
        <button
          class={{ 'city-chip': true, 'is-active': weather.active == city.id, 'is-hidden': !city.visible }}
          onClick={() => weather.setActive(city.id)}
        >
          <span class="city-chip-name">{city.name}</span>
          <span class="city-chip-temp">{city.temp}</span>
        </button>
      ))}
    </div>
  )
}
