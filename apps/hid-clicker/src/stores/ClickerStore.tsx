import { BLE, Store } from '@geastack/core'
import { AirMouse } from './AirMouse'

export class ClickerStore extends Store {
  status = 'idle'
  screen = 0
  lastX = -1
  lastY = -1
  residualX = 0
  residualY = 0
  hidMouseButtons = 0
  private airMouse = new AirMouse()

  markConnected() {
    this.status = 'connected'
  }

  markAdvertising() {
    this.status = 'advertising'
  }

  markBound() {
    this.status = 'bound'
  }

  switchScreen(id: number) {
    if (this.screen === 1 && id !== 1) {
      this.airMouse.stop()
    }

    this.screen = id
    this.releaseMouseButtons()
    this.resetTouch()
    this.resetMouseMotion()

    if (id === 1) {
      this.airMouse.start()
    }
  }

  nextSlide() {
    BLE.keyboard.tap(0x4e)
  }

  prevSlide() {
    BLE.keyboard.tap(0x4b)
  }

  mouseLeftDown() {
    this.setMouseButton(1, true)
  }

  mouseLeftUp() {
    this.setMouseButton(1, false)
  }

  mouseRightDown() {
    this.setMouseButton(2, true)
  }

  mouseRightUp() {
    this.setMouseButton(2, false)
  }

  recaptureBias() {
    this.resetMouseMotion()
    this.airMouse.calibrate()
  }

  leftClick() {
    BLE.mouse.click(1)
  }

  rightClick() {
    BLE.mouse.click(2)
  }

  initTouch(x: number, y: number) {
    this.lastX = x
    this.lastY = y
    this.residualX = 0
    this.residualY = 0
  }

  resetTouch() {
    this.lastX = -1
    this.lastY = -1
    this.residualX = 0
    this.residualY = 0
  }

  scrollMove(x: number, y: number) {
    if (this.lastY < 0) return
    const dy = this.lastY - y
    this.lastY = y
    if (dy > 1 || dy < -1) {
      BLE.mouse.move(0, 0, this.hidMouseButtons, dy > 0 ? 1 : -1)
    }
  }

  trackpadMove(x: number, y: number) {
    if (this.lastX < 0) return
    const dx = (x - this.lastX) * 1.5
    const dy = (y - this.lastY) * 1.5
    this.lastX = x
    this.lastY = y
    this.residualX += dx
    this.residualY += dy
    const idx = this.residualX | 0
    const idy = this.residualY | 0
    this.residualX -= idx
    this.residualY -= idy
    if (idx !== 0 || idy !== 0) {
      BLE.mouse.move(idx, idy, this.hidMouseButtons, 0)
    }
  }

  setMouseButton(mask: number, pressed: boolean) {
    if (pressed) {
      this.hidMouseButtons = mask
    } else {
      this.hidMouseButtons = 0
    }
    if (this.screen === 1) {
      this.airMouse.setButtons(this.hidMouseButtons)
    } else {
      BLE.mouse.move(0, 0, this.hidMouseButtons, 0)
    }
  }

  resetMouseMotion() {
    this.residualX = 0
    this.residualY = 0
  }

  private releaseMouseButtons() {
    if (this.hidMouseButtons !== 0) {
      BLE.mouse.move(0, 0, 0, 0)
    }
    this.hidMouseButtons = 0
    this.airMouse.setButtons(0)
  }
}

export const store = new ClickerStore()
