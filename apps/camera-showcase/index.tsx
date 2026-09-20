import { mount, Camera, Display, imageFromId } from '@geastack/core'
import { App } from './components/App'
import { camera } from './stores/CameraStore'

Display.setFrameRate(30)
camera.start()
mount(App)

// Drive the preview from the main RAF loop so dirty-rect re-renders of the
// surrounding UI don't fight with us repainting underneath them. The shutter
// freeze-frame is drawn by wrapping the captured slot in its GeaEmbeddedImage
// handle (imageFromId) and blitting it through the display's own canvas
// context — there is no per-app <canvas> ref to draw through here.
// Camera viewfinder occupies the screen between the status bar at top and the
// shutter controls at bottom. Hard-coded margins keep the user code simple;
// production apps would read the <canvas> ref's bounding box.
const STATUS_BAR_HEIGHT = 120
const CONTROLS_HEIGHT = 240

const ctx = Display.ctx

requestAnimationFrame(function loop(_timestampMs) {
  const w = Display.width
  const h = Display.height
  const viewfinderY = STATUS_BAR_HEIGHT
  const viewfinderH = h - STATUS_BAR_HEIGHT - CONTROLS_HEIGHT
  if (camera.showingCapture && camera.capturedImageId >= 0) {
    ctx.drawImage(imageFromId(camera.capturedImageId), 0, viewfinderY, w, viewfinderH)
  } else if (camera.opened) {
    Camera.draw(0, viewfinderY, w, viewfinderH)
  }
  requestAnimationFrame(loop)
})
