import { Component } from '@geastack/core'
import { temperature } from '../stores/TemperatureStore'
import './App.css'

function TemperatureTicks() {
  return (
    <div class="temperature-dial-ring">
      {temperature.ticks.map(tick => (
        <div
          class="temperature-dial-tick"
          style={{
            left: tick.left,
            top: tick.top,
            width: tick.width,
            height: tick.height,
            transform: tick.transform,
            backgroundColor: tick.index < temperature.filledTicks ? '#ffffff' : '#0a1626',
          }}
          onClick={() => temperature.setFromTick(tick.index)}
        />
      ))}
    </div>
  )
}

export class App extends Component {
  template() {
    return (
      <div
        class="temperature-dial-root"
        onRotary={event => temperature.adjustByRotary(event.delta)}
        onTouchStart={event => temperature.beginDrag(event.clientX)}
        onTouchMove={event => temperature.dragTo(event.clientX)}
        onTouchEnd={() => temperature.endDrag()}
      >
        <div class="temperature-dial-shell">
          <div class="temperature-dial-orbit">
            <div class="temperature-dial-climate" style={{ backgroundColor: temperature.backgroundColor }} />
            <TemperatureTicks />
            <div class="temperature-dial-face">
              <span class="temperature-dial-kicker" style={{ color: temperature.mutedTextColor }}>AC CONTROL</span>
              <span class="temperature-dial-value" style={{ color: temperature.textColor }}>{temperature.temperatureDisplay}</span>
              <span class="temperature-dial-mode" style={{ color: temperature.textColor }}>{temperature.modeLabel}</span>
              <span class="temperature-dial-subtitle" style={{ color: temperature.mutedTextColor }}>{temperature.comfortText}</span>
              <div class="temperature-dial-fan">
                <div class="temperature-dial-fan-dot" />
                <span class="temperature-dial-fan-text">{temperature.fanLevel}</span>
              </div>
            </div>
          </div>
          <span class="temperature-dial-range-label temperature-dial-range-left" style={{ color: temperature.textColor }}>16</span>
          <span class="temperature-dial-range-label temperature-dial-range-right" style={{ color: temperature.textColor }}>30</span>
          <div class="temperature-dial-controls">
            <button class="temperature-dial-control temperature-dial-control-minus" onClick={() => temperature.decrease()}>
              <div class="temperature-dial-control-mark temperature-dial-control-mark-minus">
                <div class="temperature-dial-control-bar temperature-dial-control-bar-horizontal" />
              </div>
            </button>
            <button class="temperature-dial-preset" onClick={() => temperature.setPreset(22)}>
              <span class="temperature-dial-preset-label">ECO</span>
            </button>
            <button class="temperature-dial-control temperature-dial-control-plus" onClick={() => temperature.increase()}>
              <div class="temperature-dial-control-mark temperature-dial-control-mark-plus">
                <div class="temperature-dial-control-bar temperature-dial-control-bar-horizontal" />
                <div class="temperature-dial-control-bar temperature-dial-control-bar-vertical" />
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }
}
