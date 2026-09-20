import { Store, Camera } from '@geastack/core'
import type { CameraFacing } from '@geastack/core'

export class CameraShowcaseStore extends Store {
  facing: CameraFacing = 'back'
  status = 'Initializing…'
  opened = false
  capturedImageId = -1
  capturedWidth = 0
  capturedHeight = 0
  showingCapture = false

  start() {
    if (!Camera.isAvailable()) {
      this.status = 'No camera available on this device'
      return
    }
    this.openFacing(this.facing)
  }

  openFacing(facing: CameraFacing) {
    if (this.opened) Camera.close()
    this.facing = facing
    const ok = Camera.open({ facing })
    this.opened = ok
    if (!ok) {
      this.status = 'Failed to open camera (' + facing + ')'
      return
    }
    const w = Camera.width
    const h = Camera.height
    this.status = facing + ' camera • ' + w + '×' + h
    this.showingCapture = false
  }

  toggleFacing() {
    this.openFacing(this.facing === 'back' ? 'front' : 'back')
  }

  capture() {
    if (!this.opened) return
    Camera.capture({ mirror: this.facing === 'front' }).then((photo) => {
      this.capturedImageId = photo.imageId
      this.capturedWidth = photo.width
      this.capturedHeight = photo.height
      this.showingCapture = true
      this.status = 'Captured ' + photo.width + '×' + photo.height
    })
  }

  resumePreview() {
    this.showingCapture = false
    const w = Camera.width
    const h = Camera.height
    this.status = this.facing + ' camera • ' + w + '×' + h
  }
}

export const camera = new CameraShowcaseStore()
