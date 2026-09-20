// LOWERING PROBE — not shipped. Reproduces the two typed-image lowering bugs
// reported against sky-hop so the geatsc fixes can be verified in generated
// C++ without reverting the app's workarounds (src/game.ts drawPlayer if/else,
// src/runtime.ts manual tile loop):
//   1. a ternary over two GeaEmbeddedImage values must lower NATIVE (plain
//      C++ ternary over gea::host::GeaEmbeddedImage), not gea_cpp_key-boxed.
//   2. `typeof ctx.drawImageTiledX === 'function'` over a canvas host method
//      must constant-fold to true, not route through gea_cpp_typeof_is.
// Build:
//   node scripts/build-gea-vite-geatsc.mjs --app-dir apps/sky-hop \
//     --entry index.probe.tsx --out-dir /tmp/probe-out ... (see scripts)
import { Display, loadImage, type GeaEmbeddedImage } from '@geastack/core'
import { heroIdle38Png, heroWalk38Png } from './src/assetBytes'

type ProbeCanvasContext = {
  fillRect(x: number, y: number, w: number, h: number): void
  drawImage(source: GeaEmbeddedImage, dx: number, dy: number): void
  drawImageTiledX?: (source: GeaEmbeddedImage, dx: number, dy: number, width: number) => void
}

const ctx = Display.ctx as unknown as ProbeCanvasContext

class Probe {
  heroWalk: GeaEmbeddedImage
  heroIdle: GeaEmbeddedImage
  frame = 0

  constructor() {
    this.heroWalk = loadImage(heroWalk38Png)
    this.heroIdle = loadImage(heroIdle38Png)
  }

  draw() {
    // Bug 1: conditional over two typed handles.
    const sprite = this.frame % 2 === 0 ? this.heroWalk : this.heroIdle
    ctx.drawImage(sprite, 10, 10)
    // Bug 2: typeof feature-probe on a canvas host method.
    if (typeof ctx.drawImageTiledX === 'function') {
      ctx.drawImageTiledX(this.heroWalk, 0, 100, 200)
    }
  }
}

const probe = new Probe()
probe.draw()
