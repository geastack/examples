import { Component, Camera } from '@geastack/core'
import { camera } from '../stores/CameraStore'
import './App.css'

// Single full-screen component. The camera preview lives in the canvas and
// gets blitted by Camera.draw() each frame in a separate animation loop
// driven from index.tsx (so this component just lays out the overlay UI).
export class App extends Component {
  template() {
    return (
      <div class="camera-app">
        <canvas class="camera-canvas" width={720} height={1280} />
        <div class="overlay">
          <div class="status-bar">
            <span class="status-text">{camera.status}</span>
          </div>
          <div class="controls">
            <button class="ctrl-button" onClick={() => camera.toggleFacing()}>
              <span>FLIP</span>
            </button>
            <button class="ctrl-button shutter" onClick={() => camera.capture()}>
              <span>CAP</span>
            </button>
            <button class="ctrl-button" onClick={() => camera.resumePreview()}>
              <span>LIVE</span>
            </button>
          </div>
        </div>
      </div>
    )
  }
}
