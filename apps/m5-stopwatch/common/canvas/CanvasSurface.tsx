import { system } from '../../stores/SystemStore'
import { Component } from '@geastack/core'
import type { CanvasRenderingContext2D, GeaCanvasElement } from '@geastack/core'
import './CanvasSurface.css'

let context: CanvasRenderingContext2D | null = null
let generation = 0

export function canvasContext(): CanvasRenderingContext2D | null {
  return context
}

export function canvasGeneration(): number {
  return generation
}

export class CanvasSurface extends Component<GeaCanvasElement> {
  template() {
    return (
      <canvas
        class={system.screen === 'fft' ? 'graphic fft-graphic' : 'graphic'}
        width={system.screen === 'fft' ? 332 : 466}
        height={system.screen === 'fft' ? 332 : 466}
      />
    )
  }

  onAfterRender() {
    if (this.el) {
      context = this.el.getContext('2d')
      generation++
    }
  }

  onDestroy() {
    context = null
    generation++
  }
}
