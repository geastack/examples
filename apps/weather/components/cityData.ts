// Shared, fully-typed shapes for the reactive arrays the store renders via .map().
// All temperatures are stored in Celsius and converted for display, so there is no
// duplicated C/F data.

export interface CityState {
  id: number // stable identity for setActive/delete (avoid the reserved name `index`)
  name: string
  detail: string
  latitude: string
  longitude: string
  visible: boolean // pinned in the rail
  temp: string // chip temperature, e.g. '18°' or '--' until live data loads
  cached: string // cached raw forecast JSON for this city
}

export interface Forecast {
  label: string
  temp: string
  icon: string
}

// ---- open-meteo API response shapes -------------------------------------------
// We know exactly what the forecast/geocoding endpoints return, so the store
// decodes the response with a single fully-typed `JSON.parse(raw) as T`. The
// geatsc C++ target lowers that to a one-pass decoder that reads straight into
// these structs (nested structs + std::vector<double>/std::vector<std::string>)
// with zero gea_cpp_value boxing — far cheaper on the ESP32 than walking a
// dynamic value tree or re-scanning the string per field. Extra response keys
// (current_units, generationtime_ms, …) we don't declare are skipped.

export interface WxCurrent {
  time: string
  temperature_2m: number
  apparent_temperature: number
  precipitation: number
  relative_humidity_2m: number
  wind_speed_10m: number
  weather_code: number
}

export interface WxHourly {
  time: string[]
  temperature_2m: number[]
  weather_code: number[]
}

export interface WxDaily {
  time: string[]
  temperature_2m_max: number[]
  temperature_2m_min: number[]
  weather_code: number[]
}

export interface WxForecast {
  current: WxCurrent
  hourly: WxHourly
  daily: WxDaily
}

export interface GeoResult {
  name: string
  latitude: number
  longitude: number
  admin1: string
  country_code: string
}

export interface GeoResponse {
  results: GeoResult[]
}
