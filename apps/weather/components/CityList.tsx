import './CityList.css'
import { weather } from '../stores/WeatherStore'

// The manager's saved-cities list, via a single keyed-list .map(). Hidden cities
// fold into the class object instead of an inline conditional class string.
export function CityList() {
  return (
    <div class="city-list">
      {weather.cities.map(city => (
        <div class={{ 'city-row': true, 'is-hidden-row': !city.visible }}>
          <button
            class="city-select"
            onClick={() => {
              weather.setActive(city.id)
              weather.closeManager()
            }}
          >
            <span class="city-name">{city.name}</span>
            <span class="city-detail">{city.detail}</span>
          </button>
          <span class="city-row-temp">{city.temp}</span>
          <button class="delete-city" onClick={() => weather.deleteCity(city.id)}>
            <span class="delete-city-label">×</span>
          </button>
        </div>
      ))}
    </div>
  )
}
