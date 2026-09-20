import './CityManager.css'
import { weather } from '../stores/WeatherStore'
import { CityList } from './CityList'

export function CityManager() {
  return (
    <div class="city-manager">
      <div class="manager-head">
        <span class="manager-title">Cities</span>
        <button class="done-button" onClick={() => weather.closeManager()}>
          Done
        </button>
      </div>
      <div class="city-form">
        <input
          class="city-input"
          value={weather.draft}
          placeholder="Add city"
          onInput={event => weather.updateDraft(event.currentTarget.value)}
          onKeyDown={event => {
            if (event.keyCode == 13) weather.addSearchResult()
          }}
        />
        <button class="add-button" onClick={() => weather.addSearchResult()}>
          +
        </button>
      </div>
      <div
        class={{
          'search-results': true,
          'is-hidden-row': !weather.searchResultVisible && weather.searchMessage == ''
        }}
      >
        <span class={{ 'search-message': true, 'is-hidden-row': weather.searchMessage == '' }}>
          {weather.searchMessage}
        </span>
        <button
          class={{ 'search-result': true, 'is-hidden-row': !weather.searchResultVisible }}
          onClick={() => weather.addSearchResult()}
        >
          <span class="search-name">{weather.searchName}</span>
          <span class="search-detail">{weather.searchDetail}</span>
        </button>
      </div>
      <CityList />
    </div>
  )
}
