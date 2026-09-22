import './WeatherBackground.css'
import { weather } from '../stores/WeatherStore'

// Pre-rendered shell gradients as a full-screen image layer. The images were
// captured from the gea engine itself (WASM simulator), so they are pixel-identical
// to the old CSS `.weather-shell` gradient — same radial glow, 158deg ramp, and
// dither. The win: re-rasterizing this backdrop when content changes is a 1:1
// decoded-image blit (on the 410x502 panel the images are exactly panel-sized)
// instead of recomputing a 3-layer linear+radial gradient per pixel (~114ms, the
// bulk of a city switch). Inactive layers stay decoded (display:none) so switching
// visuals is instant — same pattern as WeatherVisual's hero art. Visual mapping is
// clear, cloud/fog, rain and snow; the root shell itself stays static.
//
// Fit comes from WeatherBackground.css, NOT a `fit` attribute: the attribute is an
// INLINE style, and inline styles replay after class rules, so it would override the
// taller-than-the-panel rule the phone/desktop targets need.
export function WeatherBackground() {
  return (
    <div class="weather-bg">
      <img class={{ 'weather-bg-img': true, 'is-hidden': weather.visual != 'clear' }} src="assets/weather/weather-bg-clear.png" />
      <img
        class={{ 'weather-bg-img': true, 'is-hidden': weather.visual != 'cloud' && weather.visual != 'fog' }}
        src="assets/weather/weather-bg-cloud.png"
      />
      <img class={{ 'weather-bg-img': true, 'is-hidden': weather.visual != 'rain' }} src="assets/weather/weather-bg-rain.png" />
      <img class={{ 'weather-bg-img': true, 'is-hidden': weather.visual != 'snow' }} src="assets/weather/weather-bg-snow.png" />
    </div>
  )
}
