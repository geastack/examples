import { Component } from '@geastack/core'
import './App.css'
import { weather } from '../stores/WeatherStore'
import { CityManager } from './CityManager'
import { WeatherView } from './WeatherView'
import { WeatherBackground } from './WeatherBackground'

export class App extends Component {
  template() {
    return (
      <div class="app-stage">
        <div class="weather-shell">
          <WeatherBackground />
          <div class="screen">{weather.managing ? <CityManager /> : <WeatherView />}</div>
          <div class={{ toast: true, 'is-visible': weather.toast != '' }}>{weather.toast}</div>
        </div>
      </div>
    )
  }
}
