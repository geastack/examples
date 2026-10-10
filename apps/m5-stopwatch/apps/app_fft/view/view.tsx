import { Component } from '@geastack/core'
import type { CanvasRenderingContext2D } from '@geastack/core'
import { fft } from '../store'
import { system } from '../../../stores/SystemStore'
import { fftBarColor, fillFftBarRadii } from '../../../lib/model'
import { CanvasSurface } from '../../../common/canvas/CanvasSurface'
import './view.css'

export class FFTView extends Component {
  template() {
    return (
      <div
        class="fft"
        onClick={() => {
          if (!system.navigationBlocked) {
            fft.tapScreen()
          }
        }}
      >
        <CanvasSurface />
        {fft.fftLabels && (
          <div class="frequency">
            <span>{fft.peakHz}</span>
            <span class="unit">Hz</span>
          </div>
        )}
      </div>
    )
  }
}

const wedgeCosine = new Float32Array(40)
const wedgeSine = new Float32Array(40)
const triangleX0 = new Float32Array(80)
const triangleY0 = new Float32Array(80)
const triangleX1 = new Float32Array(80)
const triangleY1 = new Float32Array(80)
const triangleX2 = new Float32Array(80)
const triangleY2 = new Float32Array(80)
const triangleColors = new Uint32Array(80)
const triangleOrder = new Uint16Array(80)
const fftRadii = new Uint16Array(20)
const fftRandom = new Uint16Array([994, 285, 553, 11, 792, 707, 966, 641, 852, 827])

for (let index = 0; index < 80; index++) {
  triangleOrder[index] = index
}

for (let index = 0; index < 20; index++) {
  const start = ((index * 9 + 91) * Math.PI) / 180
  const end = ((index * 9 + 98) * Math.PI) / 180

  wedgeCosine[index * 2] = Math.cos(start)
  wedgeCosine[index * 2 + 1] = Math.cos(end)
  wedgeSine[index * 2] = Math.sin(start)
  wedgeSine[index * 2 + 1] = Math.sin(end)
}

export function drawFft(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#1f1528'
  ctx.fillRect(0, 0, 332, 332)

  const radii = fftRadii

  fillFftBarRadii(fft.fftReduced, radii)

  const rotation = fft.fftRotation | 0
  const offset = fft.fftOffset | 0
  const firstBase = (rotation + fftRandom[offset]) % 20
  const secondBase = (rotation + fftRandom[offset === 9 ? 0 : offset + 1]) % 20
  const blend = fft.fftBlend
  const inverseBlend = 1 - blend
  const inner = Math.fround(fft.fftDiscSize / 2 - 1)
  const center = Math.fround(166)

  for (let n = 0; n < 20; n++) {
    const firstIndex = n + firstBase
    const secondIndex = n + secondBase
    const j = firstIndex >= 20 ? firstIndex - 20 : firstIndex
    const k = secondIndex >= 20 ? secondIndex - 20 : secondIndex
    const radius = Math.trunc(radii[k] * blend + radii[j] * inverseBlend) | 0
    const ax = Math.fround(wedgeCosine[n * 2])
    const ay = Math.fround(wedgeSine[n * 2])
    const bx = Math.fround(wedgeCosine[n * 2 + 1])
    const by = Math.fround(wedgeSine[n * 2 + 1])
    const color = fftBarColor(radius)
    const outer = Math.fround(radius)

    for (let mirror = -1; mirror <= 1; mirror += 2) {
      const triangle = n * 4 + (mirror === -1 ? 0 : 2)
      const direction = Math.fround(mirror)

      triangleX0[triangle] = Math.fround(center + Math.fround(Math.fround(ax * inner) * direction))
      triangleY0[triangle] = Math.fround(center + Math.fround(ay * inner))
      triangleX1[triangle] = Math.fround(center + Math.fround(Math.fround(ax * outer) * direction))
      triangleY1[triangle] = Math.fround(center + Math.fround(ay * outer))
      triangleX2[triangle] = Math.fround(center + Math.fround(Math.fround(bx * outer) * direction))
      triangleY2[triangle] = Math.fround(center + Math.fround(by * outer))
      triangleColors[triangle] = color
      triangleX0[triangle + 1] = triangleX0[triangle]
      triangleY0[triangle + 1] = triangleY0[triangle]
      triangleX1[triangle + 1] = triangleX2[triangle]
      triangleY1[triangle + 1] = triangleY2[triangle]
      triangleX2[triangle + 1] = Math.fround(
        center + Math.fround(Math.fround(bx * inner) * direction),
      )
      triangleY2[triangle + 1] = Math.fround(center + Math.fround(by * inner))
      triangleColors[triangle + 1] = color
    }
  }

  ctx.fillTrianglesRgb565Sorted(
    triangleX0,
    triangleY0,
    triangleX1,
    triangleY1,
    triangleX2,
    triangleY2,
    triangleColors,
    triangleOrder,
    80,
  )

  ctx.fillCircle(166, 166, Math.floor(fft.fftDiscSize / 2), '#f8c6e7')
}
