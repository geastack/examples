import { Store, WiFi } from '@geastack/core'
import type { CityState, Forecast, WxForecast, GeoResponse } from '../components/cityData'

// WiFi credentials for the live-forecast fetch, read from the app's .env
// (GEA_WIFI_SSID / GEA_WIFI_PASSWORD). The build inlines process.env.<KEY> as a
// string literal (see core/packages/core/scripts/dotenv-defines.mjs), so this
// compiles to a constant on device and in the browser sim. Empty when no .env is
// provided — then we fall back to enabling WiFi with the target's build-time default.
const WIFI_SSID = process.env.GEA_WIFI_SSID
const WIFI_PASSWORD = process.env.GEA_WIFI_PASSWORD

export type ForecastMode = 'hours' | 'days'

const HOUR_SLOT_COUNT = 12
const DAY_SLOT_COUNT = 14

// ---- open-meteo chip-temperature extraction (single field; no full parse) -----
// The full forecast is decoded once per active city with a typed
// `JSON.parse(raw) as WxForecast` (see applyApiWeather). But the city rail needs
// only ONE number — current.temperature_2m — for every cached city, recomputed
// on unit toggle. Decoding every city's entire response (48h + 14d arrays) just
// for that one scalar would be wasteful, so the chip temperature still uses a
// targeted single-field scan.

function weatherSectionStart(raw: string, name: string): number {
  const id = raw.indexOf('"' + name + '":')
  return id < 0 ? 0 : id
}

function weatherValueStart(raw: string, start: number, key: string): number {
  const markerIndex = raw.indexOf('"' + key + '":', start)
  if (markerIndex < 0) return -1
  const colon = raw.indexOf(':', markerIndex)
  return colon < 0 ? -1 : colon + 1
}

function weatherNumberEnd(raw: string, start: number): number {
  // A JSON number ends at the next ',' '}' or ']'. Find the nearest via indexOf
  // (single native scans) instead of per-char substring — substring(i,i+1) is
  // O(i) in this runtime, so char-by-char from a deep offset is O(n) per call.
  let end = raw.length
  const comma = raw.indexOf(',', start)
  if (comma >= 0 && comma < end) end = comma
  const brace = raw.indexOf('}', start)
  if (brace >= 0 && brace < end) end = brace
  const bracket = raw.indexOf(']', start)
  if (bracket >= 0 && bracket < end) end = bracket
  return end
}

function weatherExtractNumberField(raw: string, start: number, key: string, fallback: number): number {
  const valueStart = weatherValueStart(raw, start, key)
  if (valueStart < 0) return fallback
  const valueEnd = weatherNumberEnd(raw, valueStart)
  if (valueEnd <= valueStart) return fallback
  return Number(raw.substring(valueStart, valueEnd))
}

function weatherFormatHourLabel(time: string): string {
  return hourLabel(Number(time.substring(11, 13)))
}

function hourLabel(hour: number): string {
  if (hour == 0) return '12 AM'
  if (hour < 12) return '' + hour + ' AM'
  if (hour == 12) return '12 PM'
  return '' + (hour - 12) + ' PM'
}

function weatherTimeSortKey(time: string): number {
  return Number(time.substring(5, 7)) * 744 + Number(time.substring(8, 10)) * 24 + Number(time.substring(11, 13))
}

function weekdayFromISO(time: string): string {
  const y = Number(time.substring(0, 4))
  const m = Number(time.substring(5, 7))
  const d = Number(time.substring(8, 10))
  const monthOffset = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4]
  const dow = (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + monthOffset[m - 1] + d) % 7
  if (dow == 0) return 'Sunday'
  if (dow == 1) return 'Monday'
  if (dow == 2) return 'Tuesday'
  if (dow == 3) return 'Wednesday'
  if (dow == 4) return 'Thursday'
  if (dow == 5) return 'Friday'
  return 'Saturday'
}

function weatherFormatDayLabel(time: string): string {
  return weekdayFromISO(time)
}

// ---- open-meteo geocoding (typed JSON.parse) ----------------------------------

function geocodeDetailLine(admin1: string, countryCode: string): string {
  if (admin1.length > 0 && countryCode.length > 0) return admin1 + ', ' + countryCode
  if (admin1.length > 0) return admin1
  return countryCode
}

function geocodeExtractPlace(
  raw: string
): { name: string; detail: string; latitude: string; longitude: string } | null {
  // One typed decode of the geocoding response — `results` lands as a typed
  // std::vector<GeoResult>, each element read straight from struct fields.
  const data = JSON.parse(raw) as GeoResponse
  if (data.results.length == 0) return null
  const result = data.results[0]
  if (result.name.length == 0) return null
  return {
    name: result.name,
    detail: geocodeDetailLine(result.admin1, result.country_code),
    latitude: '' + result.latitude,
    longitude: '' + result.longitude
  }
}

function cityCoordsMatch(city: CityState, latitude: string, longitude: string): boolean {
  return (
    Math.abs(Number(city.latitude) - Number(latitude)) < 0.05 &&
    Math.abs(Number(city.longitude) - Number(longitude)) < 0.05
  )
}

// ---- store --------------------------------------------------------------------

export class WeatherStore extends Store {
  active = 0
  managing = 0
  unit = 'C'
  draft = ''
  toast = ''
  forecastMode: ForecastMode = 'hours'
  synced = 0
  fetchInFlight = 0
  fetchQueue: number[] = []
  refreshPending = 0
  wifiRequested = 0
  wifiRetryTicks = 0

  searchResultVisible = 0
  searchName = ''
  searchDetail = ''
  searchLatitude = ''
  searchLongitude = ''
  searchMessage = ''
  searchRequestId = 0
  searchTimerId = 0
  toastTimerId = 0

  // Current conditions for the active city. Shows '--' placeholders until the
  // first live fetch lands (init()'s setActive(0) applies the placeholder state).
  name = 'Lisbon'
  subtitle = 'Lisbon District, PT'
  temp = '--'
  condition = '--'
  range = ''
  feels = '--'
  wind = '--'
  rain = '--'
  humid = '--'
  visual = 'cloud'

  // Pinned-city slots (rendered via .map). `visible` is the pin state; unpinned
  // entries are display:none (.is-hidden / .is-hidden-row). City search uses the
  // Open-Meteo geocoding API and reuses an existing slot (by coordinates) or the
  // first unpinned slot — no array growth (pushing structs is not a proven
  // keyed-list operation). The first four ship pinned by default.
  cities: CityState[] = [
    {
      id: 0,
      name: 'Lisbon',
      detail: 'Lisbon District, PT',
      latitude: '38.7223',
      longitude: '-9.1393',
      visible: true,
      temp: '--',
      cached: ''
    },
    {
      id: 1,
      name: 'San Francisco',
      detail: 'California, US',
      latitude: '37.7749',
      longitude: '-122.4194',
      visible: true,
      temp: '--',
      cached: ''
    },
    {
      id: 2,
      name: 'Berlin',
      detail: 'Berlin, DE',
      latitude: '52.52',
      longitude: '13.405',
      visible: true,
      temp: '--',
      cached: ''
    },
    {
      id: 3,
      name: 'Tokyo',
      detail: 'Tokyo, JP',
      latitude: '35.6762',
      longitude: '139.6503',
      visible: true,
      temp: '--',
      cached: ''
    },
    {
      id: 4,
      name: 'Paris',
      detail: 'Ile-de-France, FR',
      latitude: '48.8566',
      longitude: '2.3522',
      visible: false,
      temp: '--',
      cached: ''
    },
    {
      id: 5,
      name: 'London',
      detail: 'England, GB',
      latitude: '51.5074',
      longitude: '-0.1278',
      visible: false,
      temp: '--',
      cached: ''
    },
    {
      id: 6,
      name: 'New York',
      detail: 'New York, US',
      latitude: '40.7128',
      longitude: '-74.006',
      visible: false,
      temp: '--',
      cached: ''
    },
    {
      id: 7,
      name: 'Madrid',
      detail: 'Madrid, ES',
      latitude: '40.4168',
      longitude: '-3.7038',
      visible: false,
      temp: '--',
      cached: ''
    },
    {
      id: 8,
      name: 'Rome',
      detail: 'Lazio, IT',
      latitude: '41.9028',
      longitude: '12.4964',
      visible: false,
      temp: '--',
      cached: ''
    },
    {
      id: 9,
      name: 'Amsterdam',
      detail: 'North Holland, NL',
      latitude: '52.3676',
      longitude: '4.9041',
      visible: false,
      temp: '--',
      cached: ''
    },
    {
      id: 10,
      name: 'Sydney',
      detail: 'New South Wales, AU',
      latitude: '-33.8688',
      longitude: '151.2093',
      visible: false,
      temp: '--',
      cached: ''
    },
    {
      id: 11,
      name: 'Singapore',
      detail: 'Singapore, SG',
      latitude: '1.3521',
      longitude: '103.8198',
      visible: false,
      temp: '--',
      cached: ''
    },
    {
      id: 12,
      name: 'Dubai',
      detail: 'Dubai, AE',
      latitude: '25.2048',
      longitude: '55.2708',
      visible: false,
      temp: '--',
      cached: ''
    },
    {
      id: 13,
      name: 'Toronto',
      detail: 'Ontario, CA',
      latitude: '43.6532',
      longitude: '-79.3832',
      visible: false,
      temp: '--',
      cached: ''
    },
    {
      id: 14,
      name: 'Istanbul',
      detail: 'Istanbul, TR',
      latitude: '41.0082',
      longitude: '28.9784',
      visible: false,
      temp: '--',
      cached: ''
    },
    {
      id: 15,
      name: 'Mumbai',
      detail: 'Maharashtra, IN',
      latitude: '19.076',
      longitude: '72.8777',
      visible: false,
      temp: '--',
      cached: ''
    },
    {
      id: 16,
      name: 'Cairo',
      detail: 'Cairo, EG',
      latitude: '30.0444',
      longitude: '31.2357',
      visible: false,
      temp: '--',
      cached: ''
    },
    {
      id: 17,
      name: 'Bangkok',
      detail: 'Bangkok, TH',
      latitude: '13.7563',
      longitude: '100.5018',
      visible: false,
      temp: '--',
      cached: ''
    },
    {
      id: 18,
      name: 'Seoul',
      detail: 'Seoul, KR',
      latitude: '37.5665',
      longitude: '126.978',
      visible: false,
      temp: '--',
      cached: ''
    },
    {
      id: 19,
      name: 'Los Angeles',
      detail: 'California, US',
      latitude: '34.0522',
      longitude: '-118.2437',
      visible: false,
      temp: '--',
      cached: ''
    }
  ]

  // The active city's forecast (rendered via .map). Twelve hour slots and six day
  // slots, mutated in place (per-slot reactivity drives the keyed list). Start as
  // '--' placeholders; init()'s setActive(0) applies the placeholder state and the
  // first live fetch fills real values.
  hours: Forecast[] = [
    { label: '', temp: '--', icon: '' },
    { label: '', temp: '--', icon: '' },
    { label: '', temp: '--', icon: '' },
    { label: '', temp: '--', icon: '' },
    { label: '', temp: '--', icon: '' },
    { label: '', temp: '--', icon: '' },
    { label: '', temp: '--', icon: '' },
    { label: '', temp: '--', icon: '' },
    { label: '', temp: '--', icon: '' },
    { label: '', temp: '--', icon: '' },
    { label: '', temp: '--', icon: '' },
    { label: '', temp: '--', icon: '' }
  ]
  days: Forecast[] = [
    { label: '', temp: '--', icon: '' },
    { label: '', temp: '--', icon: '' },
    { label: '', temp: '--', icon: '' },
    { label: '', temp: '--', icon: '' },
    { label: '', temp: '--', icon: '' },
    { label: '', temp: '--', icon: '' },
    { label: '', temp: '--', icon: '' },
    { label: '', temp: '--', icon: '' },
    { label: '', temp: '--', icon: '' },
    { label: '', temp: '--', icon: '' },
    { label: '', temp: '--', icon: '' },
    { label: '', temp: '--', icon: '' },
    { label: '', temp: '--', icon: '' },
    { label: '', temp: '--', icon: '' }
  ]

  // Parsed forecasts remain immutable Celsius source data. Cache them by city so
  // selection formats an existing typed record instead of decoding the same JSON
  // on every switch. Rendering still updates every visible field immediately.
  forecastCache: WxForecast[] = []
  forecastCacheReady: number[] = []
  forecastCacheWarmIndex = 0

  // Display-ready strings are prepared alongside each parsed forecast, outside
  // the city-selection path. Flat slot caches keep the generated C++ vectors
  // typed (nested string arrays fall back to boxed values). A tap only copies
  // these strings into the reactive view model; it does no date/temperature/
  // condition formatting and never parses JSON.
  presentationCacheReady: number[] = []
  preparedTemp: string[] = []
  preparedCondition: string[] = []
  preparedRange: string[] = []
  preparedFeels: string[] = []
  preparedWind: string[] = []
  preparedRain: string[] = []
  preparedHumid: string[] = []
  preparedVisual: string[] = []
  preparedHourLabel: string[] = []
  preparedHourTemp: string[] = []
  preparedHourIcon: string[] = []
  preparedDayLabel: string[] = []
  preparedDayTemp: string[] = []
  preparedDayIcon: string[] = []

  showToast(message: string) {
    this.toast = message
    if (this.toastTimerId) {
      clearTimeout(this.toastTimerId)
      this.toastTimerId = 0
    }
    this.toastTimerId = setTimeout(() => {
      this.toastTimerId = 0
      this.toast = ''
    }, 5000)
  }

  // ---- persistence (localStorage) ----
  // The saved city list and each city's last forecast survive reboots / power
  // cycles via the global `localStorage`. Stored per-key (one opaque value each)
  // rather than as one JSON blob: a forecast body contains quotes, and embedding
  // it inside a JSON wrapper would need escaping (and JSON.stringify isn't a
  // lowered store-method op). Values are opaque strings, so the raw forecast goes
  // in verbatim. localStorage stages writes in RAM, then the runtime flushes the
  // mirror to flash after the current application frame.

  saveState() {
    localStorage.setItem('wxUnit', this.unit)
    localStorage.setItem('wxActive', '' + this.active)
    for (let i = 0; i < this.cities.length; i++) {
      const c = this.cities[i]
      localStorage.setItem('wxV' + i, c.visible ? '1' : '0')
      if (c.visible) {
        localStorage.setItem('wxN' + i, c.name)
        localStorage.setItem('wxD' + i, c.detail)
        localStorage.setItem('wxLa' + i, c.latitude)
        localStorage.setItem('wxLo' + i, c.longitude)
        localStorage.setItem('wxC' + i, c.cached)
      }
    }
  }

  restoreState() {
    const unit = localStorage.getItem('wxUnit')
    if (!unit || unit.length == 0) return // nothing persisted yet — keep compile-time defaults
    this.unit = unit == 'F' ? 'F' : 'C'
    for (let i = 0; i < this.cities.length; i++) {
      const vis = localStorage.getItem('wxV' + i)
      if (!vis || vis.length == 0) continue // slot never saved — leave its default
      this.cities[i].visible = vis == '1'
      if (this.cities[i].visible) {
        const name = localStorage.getItem('wxN' + i)
        if (name && name.length > 0) {
          this.cities[i].name = name
          this.cities[i].detail = localStorage.getItem('wxD' + i) || ''
          this.cities[i].latitude = localStorage.getItem('wxLa' + i) || ''
          this.cities[i].longitude = localStorage.getItem('wxLo' + i) || ''
        }
        this.cities[i].cached = localStorage.getItem('wxC' + i) || ''
      } else {
        this.cities[i].cached = ''
      }
    }
    const active = Number(localStorage.getItem('wxActive'))
    if (active >= 0 && active < this.cities.length && this.cities[active].visible) this.active = active
  }

  init() {
    // Restore the saved city list + last forecasts before anything renders, so a
    // reboot shows your cities and their last weather immediately (no '--' flash).
    this.restoreState()
    // Render static city data immediately. Crucially, DON'T bring WiFi up here:
    // WiFi bring-up allocates ~55 KB of internal RAM, and during init the RAM
    // arbiter that shrinks display staging to make room runs on the frame task,
    // which isn't started yet — so an init-time bring-up starves the first
    // display flush and stalls first paint. WiFi is enabled from tick() instead,
    // after the first paint, when the arbiter can do its job.
    this.refreshChipTemps()
    this.setActive(this.active)
  }

  tick() {
    // Spread boot-cache decoding across frames. The active city is decoded by
    // init(); warming one remaining saved city per frame keeps subsequent taps hot
    // without delaying first paint or deferring any visible weather fields.
    if (this.forecastCacheWarmIndex < this.cities.length) {
      const warmId = this.forecastCacheWarmIndex
      this.forecastCacheWarmIndex = warmId + 1
      if (
        this.cities[warmId].visible &&
        this.cities[warmId].cached.length > 0 &&
        !this.forecastIsCached(warmId)
      ) {
        this.cacheForecast(warmId, this.cities[warmId].cached)
      } else if (
        this.cities[warmId].visible &&
        this.forecastIsCached(warmId) &&
        !this.presentationIsCached(warmId)
      ) {
        this.prepareWeatherPresentation(warmId, this.forecastCache[warmId])
      }
    }
    if (!this.wifiRequested) {
      this.wifiRequested = 1
      this.wifiRetryTicks = 0
      // configure() sets the credentials AND triggers the lazy bring-up. With no
      // .env credentials, fall back to enabling WiFi with the build-time default.
      if (WIFI_SSID) {
        WiFi.configure(WIFI_SSID, WIFI_PASSWORD)
      } else {
        WiFi.setEnabled(true)
      }
      return
    }
    // Gating fetch on connectivity is what prevents the boot crash: calling
    // fetch() before the TCP/IP stack exists asserts (Invalid mbox).
    if (!WiFi.connected()) {
      this.synced = 0
      // A lost bring-up (esp_wifi_init NO_MEM racing the display RAM shrink, or
      // the bring-up worker failing to spawn) is permanent unless re-kicked.
      // setEnabled(true) is a no-op while a bring-up is in flight or the radio
      // is already up+retrying, so re-request every ~15 s until we connect.
      this.wifiRetryTicks = this.wifiRetryTicks + 1
      if (this.wifiRetryTicks > 900) this.wifiRequested = 0
      return
    }
    if (this.synced || this.fetchInFlight) return
    if (this.fetchQueue.length == 0) this.rebuildFetchQueue()
    const id = this.dequeueFetchId()
    if (id < 0) {
      if (this.refreshPending) {
        this.showToast('Forecast refreshed')
        this.refreshPending = 0
      }
      this.synced = 1
      return
    }
    this.fetchInFlight = 1
    this.loadActiveWeather(id, 0).then(() => {
      this.fetchInFlight = 0
      if (this.fetchQueue.length == 0) {
        if (this.refreshPending) {
          this.showToast('Forecast refreshed')
          this.refreshPending = 0
        }
        this.synced = 1
      }
    })
  }

  rebuildFetchQueue() {
    this.fetchQueue = []
    for (let i = 0; i < this.cities.length; i++) {
      if (this.cities[i].visible && this.cities[i].cached.length == 0) this.fetchQueue.push(i)
    }
    if (this.fetchQueue.length > 1) {
      for (let i = 0; i < this.fetchQueue.length; i++) {
        if (this.fetchQueue[i] == this.active) {
          const activeId = this.fetchQueue[i]
          for (let j = i; j > 0; j--) this.fetchQueue[j] = this.fetchQueue[j - 1]
          this.fetchQueue[0] = activeId
          break
        }
      }
    }
  }

  dequeueFetchId(): number {
    if (this.fetchQueue.length == 0) return -1
    const id = this.fetchQueue[0]
    for (let i = 0; i < this.fetchQueue.length - 1; i++) this.fetchQueue[i] = this.fetchQueue[i + 1]
    this.fetchQueue.length = this.fetchQueue.length - 1
    return id
  }

  pinnedCitiesNeedFetch(): boolean {
    for (let i = 0; i < this.cities.length; i++) {
      if (this.cities[i].visible && this.cities[i].cached.length == 0) return true
    }
    return false
  }

  // ---- units ----

  tempFromC(celsius: number): string {
    if (this.unit == 'C') return '' + Math.round(celsius)
    return '' + Math.round((celsius * 9) / 5 + 32)
  }

  degreeFromC(celsius: number): string {
    return this.tempFromC(celsius) + '°'
  }

  rangeTextFromC(highC: number, lowC: number): string {
    return 'H ' + this.degreeFromC(highC) + ' L ' + this.degreeFromC(lowC)
  }

  dayTextFromC(highC: number, lowC: number): string {
    return this.degreeFromC(highC) + ' / ' + this.degreeFromC(lowC)
  }

  windTextFromKph(kph: number): string {
    if (this.unit == 'C') return '' + Math.round(kph) + ' km/h'
    return '' + Math.round(kph * 0.621371) + ' mph'
  }

  inchesText(mm: number): string {
    return this.inchesFromHundredths(Math.round(mm * 3.937))
  }

  inchesFromHundredths(hundredths: number): string {
    const whole = Math.floor(hundredths / 100)
    const fraction = hundredths - whole * 100
    return '' + whole + '.' + (fraction < 10 ? '0' : '') + fraction + ' in'
  }

  toggleUnit() {
    this.unit = this.unit == 'C' ? 'F' : 'C'
    this.refreshChipTemps()
    for (let i = 0; i < this.cities.length; i++) this.presentationCacheReady[i] = 0
    this.forecastCacheWarmIndex = 0
    this.setActive(this.active)
    localStorage.setItem('wxUnit', this.unit)
  }

  // ---- code → visual / theme / icon ----

  visualForCode(code: number): string {
    if (code == 0 || code == 1) return 'clear'
    if (code == 45 || code == 48) return 'fog'
    if (code >= 51 && code <= 67) return 'rain'
    if (code >= 71 && code <= 77) return 'snow'
    if (code >= 80 && code <= 86) return code >= 85 ? 'snow' : 'rain'
    if (code >= 95) return 'rain'
    return 'cloud'
  }

  conditionForCode(code: number): string {
    if (code == 0) return 'Clear'
    if (code == 1) return 'Mainly clear'
    if (code == 2) return 'Partly cloudy'
    if (code == 3) return 'Overcast'
    if (code == 45 || code == 48) return 'Fog'
    if (code >= 51 && code <= 57) return 'Drizzle'
    if (code >= 61 && code <= 67) return 'Rain'
    if (code >= 71 && code <= 77) return 'Snow'
    if (code >= 80 && code <= 82) return 'Rain showers'
    if (code >= 95) return 'Thunderstorm'
    return 'Cloudy'
  }

  iconForVisual(visual: string): string {
    // Forecast hour/day icons render at ~30px; use the pre-scaled small copies so
    // the blit is 1:1 (no per-pixel rescale). The hero art uses the full-size files.
    return 'assets/weather/weather-' + visual + '-sm.png'
  }

  // ---- chip temperatures ----

  refreshChipTemps() {
    for (let i = 0; i < this.cities.length; i++) {
      this.cities[i].temp =
        this.cities[i].cached.length > 0 ? this.degreeFromC(this.currentTempC(this.cities[i].cached, 0)) : '--'
    }
  }

  currentTempC(raw: string, fallback: number): number {
    return weatherExtractNumberField(raw, weatherSectionStart(raw, 'current'), 'temperature_2m', fallback)
  }

  // ---- active city ----

  setActive(id: number) {
    // Do not persist on the selection path. Embedded localStorage flushes its
    // complete blob to NVS after the frame; that synchronous flash operation can
    // stall the UI for hundreds of milliseconds (and is especially costly when
    // the NVS partition is full). City-management saveState() still persists the
    // active slot when the durable city list changes.
    // Show '--' placeholders until this city's live forecast lands. If we already
    // cached its forecast (from an earlier fetch), render that immediately.
    if (this.cities[id].cached.length > 0) {
      this.applyApiWeather(id, this.cities[id].cached)
      // Cached — instant switch. Don't re-fetch here; tick() refreshes all pinned
      // cities on boot / explicit refresh.
    } else {
      // Keep the cold path in this method so active city, headline and every
      // placeholder field share one generated notification flush.
      this.active = id
      this.name = this.cities[id].name
      this.subtitle = this.cities[id].detail
      this.temp = '--'
      this.condition = '--'
      this.range = ''
      this.feels = '--'
      this.wind = '--'
      this.rain = '--'
      this.humid = '--'
      this.visual = 'cloud'
      for (let i = 0; i < this.hours.length; i++) {
        this.hours[i].label = ''
        this.hours[i].temp = '--'
        this.hours[i].icon = ''
      }
      for (let i = 0; i < this.days.length; i++) {
        this.days[i].label = ''
        this.days[i].temp = '--'
        this.days[i].icon = ''
      }
    }
    if (this.pinnedCitiesNeedFetch()) {
      this.rebuildFetchQueue()
      this.synced = 0
    } else this.synced = 1
  }

  applyPlaceholder() {
    this.temp = '--'
    this.condition = '--'
    this.range = ''
    this.feels = '--'
    this.wind = '--'
    this.rain = '--'
    this.humid = '--'
    this.visual = 'cloud'
    for (let i = 0; i < this.hours.length; i++) {
      this.hours[i].label = ''
      this.hours[i].temp = '--'
      this.hours[i].icon = ''
    }
    for (let i = 0; i < this.days.length; i++) {
      this.days[i].label = ''
      this.days[i].temp = '--'
      this.days[i].icon = ''
    }
  }

  applyApiWeather(id: number, raw: string) {
    if (!this.forecastIsCached(id)) this.cacheForecast(id, raw)
    if (!this.presentationIsCached(id)) this.prepareWeatherPresentation(id, this.forecastCache[id])
    this.applyWeatherPresentation(id)
  }

  presentationIsCached(id: number): boolean {
    return id < this.presentationCacheReady.length && this.presentationCacheReady[id] == 1
  }

  // Format the immutable typed forecast once, when it is fetched/restored or
  // while the boot cache warmer is idle. None of these writes are observed by
  // the UI, so a later city tap avoids all date/number/icon string construction.
  prepareWeatherPresentation(id: number, data: WxForecast) {
    const cur = data.current
    const visual = this.visualForCode(cur.weather_code)
    const dailyMax = data.daily.temperature_2m_max
    const dailyMin = data.daily.temperature_2m_min
    this.preparedTemp[id] = this.tempFromC(cur.temperature_2m)
    this.preparedCondition[id] = this.conditionForCode(cur.weather_code)
    this.preparedRange[id] = this.rangeTextFromC(
      dailyMax.length > 0 ? dailyMax[0] : cur.temperature_2m,
      dailyMin.length > 0 ? dailyMin[0] : cur.temperature_2m
    )
    this.preparedFeels[id] = this.degreeFromC(cur.apparent_temperature)
    this.preparedWind[id] = this.windTextFromKph(cur.wind_speed_10m)
    this.preparedRain[id] = this.inchesText(cur.precipitation)
    this.preparedHumid[id] = '' + Math.round(cur.relative_humidity_2m) + '%'
    this.preparedVisual[id] = visual

    const baseIcon = this.iconForVisual(visual)
    const hourlyTime = data.hourly.time
    const hourlyTemp = data.hourly.temperature_2m
    const hourlyCode = data.hourly.weather_code
    const dailyTime = data.daily.time
    const dailyCode = data.daily.weather_code
    const currentKey = weatherTimeSortKey(cur.time)
    let start = 0
    while (start < hourlyTime.length && weatherTimeSortKey(hourlyTime[start]) < currentKey) start++
    for (let slot = 0; slot < HOUR_SLOT_COUNT; slot++) {
      const cacheSlot = id * HOUR_SLOT_COUNT + slot
      const source = start + slot
      if (source >= hourlyTime.length) {
        this.preparedHourLabel[cacheSlot] = ''
        this.preparedHourTemp[cacheSlot] = ''
        this.preparedHourIcon[cacheSlot] = ''
        continue
      }
      const code = source < hourlyCode.length ? hourlyCode[source] : -1
      this.preparedHourLabel[cacheSlot] = weatherFormatHourLabel(hourlyTime[source])
      this.preparedHourTemp[cacheSlot] = this.degreeFromC(source < hourlyTemp.length ? hourlyTemp[source] : 0)
      this.preparedHourIcon[cacheSlot] = code < 0 ? baseIcon : this.iconForVisual(this.visualForCode(code))
    }
    for (let slot = 0; slot < DAY_SLOT_COUNT; slot++) {
      const cacheSlot = id * DAY_SLOT_COUNT + slot
      const code = slot < dailyCode.length ? dailyCode[slot] : -1
      if (slot >= dailyTime.length) {
        this.preparedDayLabel[cacheSlot] = ''
        this.preparedDayTemp[cacheSlot] = ''
        this.preparedDayIcon[cacheSlot] = ''
        continue
      }
      this.preparedDayLabel[cacheSlot] = weatherFormatDayLabel(dailyTime[slot])
      this.preparedDayTemp[cacheSlot] = this.dayTextFromC(
        slot < dailyMax.length ? dailyMax[slot] : 0,
        slot < dailyMin.length ? dailyMin[slot] : 0
      )
      this.preparedDayIcon[cacheSlot] = code < 0 ? baseIcon : this.iconForVisual(this.visualForCode(code))
    }
    this.presentationCacheReady[id] = 1
  }

  // Apply every visible field in the same store-method notification batch. The
  // screen never exposes a mixed city: headline, hero, metrics and forecast all
  // become observable together when this method returns.
  applyWeatherPresentation(id: number) {
    this.active = id
    this.name = this.cities[id].name
    this.subtitle = this.cities[id].detail
    this.temp = this.preparedTemp[id]
    this.condition = this.preparedCondition[id]
    this.range = this.preparedRange[id]
    this.feels = this.preparedFeels[id]
    this.wind = this.preparedWind[id]
    this.rain = this.preparedRain[id]
    this.humid = this.preparedHumid[id]
    this.visual = this.preparedVisual[id]
    for (let slot = 0; slot < HOUR_SLOT_COUNT; slot++) {
      const cacheSlot = id * HOUR_SLOT_COUNT + slot
      this.hours[slot].label = this.preparedHourLabel[cacheSlot]
      this.hours[slot].temp = this.preparedHourTemp[cacheSlot]
      this.hours[slot].icon = this.preparedHourIcon[cacheSlot]
    }
    for (let slot = 0; slot < DAY_SLOT_COUNT; slot++) {
      const cacheSlot = id * DAY_SLOT_COUNT + slot
      this.days[slot].label = this.preparedDayLabel[cacheSlot]
      this.days[slot].temp = this.preparedDayTemp[cacheSlot]
      this.days[slot].icon = this.preparedDayIcon[cacheSlot]
    }
  }

  // City-chip updates are independent of the active presentation batch.
  setCityChipTemp(id: number, temp: string) {
    this.cities[id].temp = temp
  }

  forecastIsCached(id: number): boolean {
    return id < this.forecastCacheReady.length && this.forecastCacheReady[id] == 1
  }

  cacheForecast(id: number, raw: string) {
    const data = JSON.parse(raw) as WxForecast
    this.forecastCache[id] = data
    this.forecastCacheReady[id] = 1
    this.prepareWeatherPresentation(id, data)
  }

  // ---- live fetch ----

  async loadActiveWeather(id: number, notify: number) {
    if (!this.cities[id].visible) return
    if (!WiFi.connected()) {
      if (notify) this.showToast('Wi-Fi offline')
      return
    }
    if (notify) this.showToast('Updating forecast')
    try {
      const response = await fetch(this.weatherUrl(id))
      if (!response.ok) {
        if (notify) this.showToast('Using saved forecast')
        return
      }
      const raw = await response.text()
      if (raw.indexOf('"current"') < 0 || raw.indexOf('"hourly"') < 0 || raw.indexOf('"daily"') < 0) {
        if (notify) this.showToast('Using saved forecast')
        return
      }
      this.cities[id].cached = raw
      this.cacheForecast(id, raw)
      this.setCityChipTemp(id, this.degreeFromC(this.currentTempC(raw, 0)))
      // Persist this city's last forecast so it's shown instantly after a reboot.
      localStorage.setItem('wxV' + id, '1')
      localStorage.setItem('wxC' + id, raw)
      if (id != this.active) return
      this.applyApiWeather(id, raw)
      if (notify) this.showToast('Forecast refreshed')
    } catch {
      if (notify) this.showToast('Using saved forecast')
    }
  }

  refreshActive() {
    for (let i = 0; i < this.cities.length; i++) {
      if (this.cities[i].visible) this.cities[i].cached = ''
      this.forecastCacheReady[i] = 0
      this.presentationCacheReady[i] = 0
    }
    if (this.cities[this.active].visible) this.applyPlaceholder()
    this.fetchQueue = []
    this.rebuildFetchQueue()
    this.refreshPending = 1
    this.synced = 0
    this.showToast('Updating forecast')
  }

  weatherUrl(id: number): string {
    return (
      'https://api.open-meteo.com/v1/forecast?latitude=' +
      this.cities[id].latitude +
      '&longitude=' +
      this.cities[id].longitude +
      '&current=temperature_2m,apparent_temperature,precipitation,relative_humidity_2m,wind_speed_10m,weather_code' +
      '&hourly=temperature_2m,weather_code' +
      '&daily=temperature_2m_max,temperature_2m_min,weather_code' +
      // forecast_days=14 for the 14-day panel; cap hourly to 48h since the row
      // only shows the next 12 hours.
      '&timezone=auto&forecast_days=14&forecast_hours=48'
    )
  }

  // ---- forecast tabs / manager / search ----

  setForecastMode(mode: ForecastMode) {
    this.forecastMode = mode
  }

  openManager() {
    this.managing = 1
    this.updateDraft(this.draft)
  }

  closeManager() {
    this.managing = 0
  }

  updateDraft(value: string) {
    this.draft = '' + value
    this.searchResultVisible = 0
    this.searchMessage = ''
    this.searchLatitude = ''
    this.searchLongitude = ''
    if (this.searchTimerId) {
      clearTimeout(this.searchTimerId)
      this.searchTimerId = 0
    }
    this.searchRequestId++
    if (this.draft.length < 2) return
    this.searchTimerId = setTimeout(() => {
      this.searchTimerId = 0
      this.searchCities()
    }, 300)
  }

  geocodeUrl(query: string): string {
    return (
      'https://geocoding-api.open-meteo.com/v1/search?name=' +
      encodeURIComponent(query) +
      '&count=1&language=en&format=json'
    )
  }

  async searchCities() {
    const query = this.draft
    if (query.length < 2) return
    if (!WiFi.connected()) {
      this.searchMessage = 'Wi-Fi offline'
      return
    }
    const requestId = ++this.searchRequestId
    this.searchMessage = 'Searching...'
    try {
      const response = await fetch(this.geocodeUrl(query))
      if (requestId != this.searchRequestId) return
      if (!response.ok) {
        this.searchMessage = 'City search unavailable'
        return
      }
      const raw = await response.text()
      if (requestId != this.searchRequestId) return
      const place = geocodeExtractPlace(raw)
      if (!place) {
        this.searchMessage = 'No matching cities'
        return
      }
      let alreadySaved = 0
      for (let i = 0; i < this.cities.length; i++) {
        if (cityCoordsMatch(this.cities[i], place.latitude, place.longitude) && this.cities[i].visible) {
          alreadySaved = 1
          break
        }
      }
      this.setSearchResult(place.name, place.detail, place.latitude, place.longitude, alreadySaved == 1)
    } catch {
      if (requestId != this.searchRequestId) return
      this.searchMessage = 'City search unavailable'
    }
  }

  setSearchResult(name: string, detail: string, latitude: string, longitude: string, alreadySaved: boolean) {
    this.searchName = name
    this.searchDetail = detail
    this.searchLatitude = latitude
    this.searchLongitude = longitude
    if (alreadySaved) this.searchMessage = name + ' is already saved.'
    else {
      this.searchMessage = ''
      this.searchResultVisible = 1
    }
  }

  clearCitySearch() {
    this.searchResultVisible = 0
    this.searchMessage = ''
    this.searchName = ''
    this.searchDetail = ''
    this.searchLatitude = ''
    this.searchLongitude = ''
  }

  async addSearchResult() {
    if (this.searchTimerId) {
      clearTimeout(this.searchTimerId)
      this.searchTimerId = 0
      if (this.draft.length >= 2 && !this.searchResultVisible) await this.searchCities()
    }
    if (this.draft.length < 2) {
      this.showToast('Type at least two letters')
      return
    }
    if (!this.searchResultVisible) {
      if (this.searchMessage == 'Searching...') this.showToast('Still searching')
      else if (this.searchMessage.length > 0) this.showToast(this.searchMessage)
      else this.showToast('Choose a city from the results')
      return
    }
    this.addCityFromSearch()
  }

  applySearchPlaceToSlot(id: number) {
    this.cities[id].name = this.searchName
    this.cities[id].detail = this.searchDetail
    this.cities[id].latitude = this.searchLatitude
    this.cities[id].longitude = this.searchLongitude
    this.cities[id].cached = ''
    this.cities[id].temp = '--'
    this.forecastCacheReady[id] = 0
    this.presentationCacheReady[id] = 0
  }

  findCitySlotForSearch(): number {
    for (let i = 0; i < this.cities.length; i++) {
      if (cityCoordsMatch(this.cities[i], this.searchLatitude, this.searchLongitude)) return i
    }
    for (let i = 0; i < this.cities.length; i++) {
      if (!this.cities[i].visible) return i
    }
    return -1
  }

  addCityFromSearch() {
    for (let i = 0; i < this.cities.length; i++) {
      if (cityCoordsMatch(this.cities[i], this.searchLatitude, this.searchLongitude) && this.cities[i].visible) {
        this.setActive(i)
        this.draft = ''
        this.clearCitySearch()
        this.managing = 0
        this.showToast(this.cities[i].name + ' is already saved')
        return
      }
    }
    const slot = this.findCitySlotForSearch()
    if (slot < 0) {
      this.showToast('City list full')
      return
    }
    this.applySearchPlaceToSlot(slot)
    this.cities[slot].visible = true
    this.setActive(slot)
    this.draft = ''
    this.clearCitySearch()
    this.managing = 0
    this.fetchQueue = []
    this.rebuildFetchQueue()
    this.synced = 0
    this.saveState()
    this.showToast(this.name + ' added')
  }

  deleteCity(id: number) {
    this.cities[id].visible = false
    this.forecastCacheReady[id] = 0
    this.presentationCacheReady[id] = 0
    // Drop the removed city's persisted forecast so it doesn't linger in storage.
    localStorage.removeItem('wxC' + id)
    localStorage.setItem('wxV' + id, '0')
    for (let i = 0; i < this.cities.length; i++) {
      if (this.cities[i].visible) {
        this.setActive(i)
        this.saveState()
        return
      }
    }
    this.clearActive()
    this.saveState()
  }

  clearActive() {
    this.name = 'Add a city'
    this.subtitle = 'Open Cities to restore one'
    this.temp = '--'
    this.condition = 'No city selected'
    this.range = ''
    this.feels = '--'
    this.wind = '--'
    this.rain = '--'
    this.humid = '--'
    this.visual = 'cloud'
    this.hours = []
    this.days = []
  }
}

export const weather = new WeatherStore()
