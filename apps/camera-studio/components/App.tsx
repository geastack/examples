import { Component } from '@geastack/core'
import { studio } from '../stores/CameraStudioStore'
import './App.css'

export class App extends Component {
  template() {
    return (
      <div class="studio-root">
        <div class={studio.fullscreen ? 'studio-shell fullscreen' : 'studio-shell'}>
          <div class="stage">
            <div class="viewfinder-frame" onClick={() => studio.toggleFullscreen()}>
              <camera class="viewfinder" facing="back" fit="cover" />
            </div>
          </div>

          <div class="panel">
            <span class="title">gea camera</span>
            <span class="status">{studio.status}</span>

            <div class="row">
              <button class={studio.exposureLevel === 0 ? 'chip' : 'chip chip-on'} onClick={() => studio.cycleExposure()}>
                <span>{studio.aeLabel}</span>
              </button>
              <button class={studio.zoom === 1 ? 'chip' : 'chip chip-on'} onClick={() => studio.cycleZoom()}>
                <span>{studio.zoomLabel}</span>
              </button>
            </div>

            <div class="row">
              <button class="shutter" onClick={() => studio.capture()}>
                <span>CAP</span>
              </button>
              <button class={studio.recording ? 'rec rec-on' : 'rec'} onClick={() => studio.toggleRecording()}>
                <span>{studio.recording ? 'STOP' : 'REC'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
