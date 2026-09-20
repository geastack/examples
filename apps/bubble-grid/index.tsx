import { Component, Display, mount } from '@geastack/core'
import type { GeaCanvasElement } from '@geastack/core'
import { initBubbleGrid, bubbleFrame, bubblePointerDown, bubblePointerMove, bubblePointerUp } from './src/grid'
import './styles.css'
import './fonts.css'

// Cap the present cadence at 60fps.
Display.setFrameRate(60)
// Fewer, BIGGER chunks: the per-chunk esp_lcd DMA-kick overhead (~160–275µs each)
// dominates the full-screen flush, so cutting chunk count beats chasing raster/DMA overlap.
// 24-row chunks (30+ chunks) ballooned txkick to ~8ms; 96-row chunks (~5 chunks) keep it ~1ms.
// depth 3, not 2: with two buffers the rasteriser cannot run far enough ahead
// of the panel DMA, so ~1.6ms of raster stays EXPOSED on the critical path.
// Frames are TE-quantised at 16.67ms and the work sits at ~16.6ms, so that
// exposure is the whole difference between landing on one VBlank and two.
Display.setFlushConfig({ rows: 96, depth: 3 })
// Opt into tearing sync: align each frame to the panel's VBlank (TE) edge so the
// pan presents without tearing. The scheduler gates the whole frame on TE, so the
// draw+flush stays inside the VBlank lead window without stalling the frame loop.
Display.setVSync(true)

const W = Math.max(1, Math.floor(window.innerWidth))
const H = Math.max(1, Math.floor(window.innerHeight))

let started = false

class App extends Component<GeaCanvasElement> {
  template() {
    return (
      <canvas
        width={W}
        height={H}
        style={{ width: W, height: H }}
        onTouchStart={e => bubblePointerDown(e.clientX, e.clientY)}
        onTouchMove={e => bubblePointerMove(e.clientX, e.clientY)}
        onTouchEnd={e => bubblePointerUp(e.clientX, e.clientY)}
      />
    )
  }

  onAfterRender() {
    if (started || !this.el) return
    started = true
    initBubbleGrid(this.el)
    const loop = (timestampMs: number) => {
      bubbleFrame(timestampMs)
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  }
}

mount(App)
