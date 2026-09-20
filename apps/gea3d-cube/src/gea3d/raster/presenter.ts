// The presenter is the seam between the fixed-function pipeline and whatever
// actually puts pixels on screen. Today the only implementation records
// flat-color triangles into the gea present-command stream. A future native
// backend (banded z-buffer, gouraud, PIE/SIMD spans) implements the same
// interface via `gea.nativeSources` + `declare function __gea3d_*` bindings
// without touching the pipeline above it.

import type { CanvasRenderingContext2D } from '@geastack/core'

export interface TrianglePresenter {
  fillTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, color: number): void
}

export class CtxPresenter implements TrianglePresenter {
  private readonly ctx: CanvasRenderingContext2D

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx
  }

  fillTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, color: number): void {
    this.ctx.fillTriangleRgb565(x0, y0, x1, y1, x2, y2, color)
  }
}
