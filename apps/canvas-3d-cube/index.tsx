import { Component, Display, mount } from '@geastack/core'
import type { GeaCanvasElement } from '@geastack/core'
import './fonts.css'
import { createCanvasCubeDemo, type CanvasCubeDemo } from './src/runtime'

Display.setBrightness(50)
Display.setFlushConfig({ rows: 80, depth: 2 })
Display.setFrameRate(20)

let activeDemo: CanvasCubeDemo | null = null

const DISPLAY_W = Math.max(1, Math.floor(window.innerWidth))
const DISPLAY_H = Math.max(1, Math.floor(window.innerHeight))

class App extends Component<GeaCanvasElement> {
  started = false

  template() {
    return (
      <canvas
        width={DISPLAY_W}
        height={DISPLAY_H}
        style={{ width: DISPLAY_W, height: DISPLAY_H }}
      />
    )
  }

  onAfterRender() {
    if (this.started || !this.el) return
    this.started = true

    const demo = createCanvasCubeDemo(this.el)
    activeDemo = demo
    this.el.addEventListener('touchstart', () => activeDemo?.toggleOpaque())
    demo.drawInitialFrame()

    const frame = (timestampMs: number) => {
      demo.renderFrame(timestampMs)
      requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }
}

mount(App)
