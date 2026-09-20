import { Store, Camera, type CameraExposureMode } from '@geastack/core'

// Drives the unified camera surface. The <camera> JSX element (App.tsx) owns
// the live preview; this store holds control state + status and issues the
// imperative Camera.* operations (capture / record / AE / WB / zoom).
export class CameraStudioStore extends Store {
  status = 'Tap a control'
  exposureLevel = 0 // 0 = auto, 1 = bright, 2 = dark
  zoom = 1
  recording = false
  lastCaptureId = -1
  // Reactive labels shown ON the control buttons so their state is visible and
  // sticks across taps (the status line alone is easy to miss).
  aeLabel = 'Auto'
  zoomLabel = '1x'
  // true = full-screen viewfinder (no chrome); false = framed viewfinder + controls.
  // The app launches full-screen; a tap on the viewfinder toggles between the two.
  fullscreen = true

  start() {
    this.status = Camera.isAvailable() ? 'Ready' : 'No camera on this device'
  }

  // Tapping the viewfinder swaps between the full-screen preview and the framed
  // preview + controls. (Full-screen is also the cheaper render: the camera owns
  // the whole panel, so there's no chrome to compose around it.)
  toggleFullscreen() {
    this.fullscreen = !this.fullscreen
  }

  cycleExposure() {
    this.exposureLevel = (this.exposureLevel + 1) % 3
    let mode: CameraExposureMode = 'continuous'
    let bias = 0
    let label = 'Auto'
    if (this.exposureLevel === 1) {
      bias = 2
      label = 'Bright'
    } else if (this.exposureLevel === 2) {
      bias = -2
      label = 'Dark'
    }
    Camera.setExposure({ mode, bias })
    this.aeLabel = label
    this.status = 'AE ' + label
  }

  cycleZoom() {
    this.zoom = this.zoom >= 3 ? 1 : this.zoom + 1
    Camera.setZoom(this.zoom)
    this.zoomLabel = this.zoom + 'x'
    this.status = 'Zoom ' + this.zoom + 'x'
  }

  capture() {
    Camera.capturePhoto().then(photo => {
      this.lastCaptureId = photo.imageId
      this.status = 'Captured ' + photo.width + 'x' + photo.height
    })
  }

  toggleRecording() {
    if (this.recording) {
      this.recording = false
      Camera.stopRecording().then(clip => {
        this.status = 'Saved ' + Math.round(clip.durationMs) + ' ms'
      })
    } else {
      this.recording = true
      this.status = 'Recording…'
      Camera.startRecording({ path: '/sdcard/gea-clip.mjpeg', fps: 15 })
    }
  }
}

export const studio = new CameraStudioStore()
