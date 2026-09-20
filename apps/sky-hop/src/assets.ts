import { loadImage, type GeaEmbeddedImage } from '@geastack/core'
import { crate36Png, dirt36Png, drone32Png, grassTop36Png, heroIdle38Png, heroWalk38Png } from './assetBytes'

export class GameAssets {
  grassTop: GeaEmbeddedImage = null as unknown as GeaEmbeddedImage
  dirt: GeaEmbeddedImage = null as unknown as GeaEmbeddedImage
  crate: GeaEmbeddedImage = null as unknown as GeaEmbeddedImage
  heroIdle: GeaEmbeddedImage = null as unknown as GeaEmbeddedImage
  heroWalk: GeaEmbeddedImage = null as unknown as GeaEmbeddedImage
  drone: GeaEmbeddedImage = null as unknown as GeaEmbeddedImage
}

function loadSprite(bytes: Uint8Array) {
  return loadImage(bytes, { opaque: true })
}

// Synchronous, because `loadImage` is: it is declared
// `loadImage(src, options?): GeaEmbeddedImage` (index.d.ts:622) and decodes on
// the calling thread. The six calls were wrapped in `await Promise.all([...])`,
// which awaited six values that were never promises -- ceremony that bought no
// concurrency and cost a `Promise.all` the host states no spelling for, so
// emission refused the app on `PromiseConstructor.all`.
//
// A failed decode is not an exception either: `loadImage` always answers with a
// handle and reports failure as `width === 0` (the same rule `image-demo`'s
// loader states). So the `catch` that returned `null` could never fire, and the
// check that actually detects a bad sprite is the one below.
export function loadAssets(): GameAssets | null {
  const assets = new GameAssets()
  assets.grassTop = loadSprite(grassTop36Png)
  assets.dirt = loadSprite(dirt36Png)
  assets.crate = loadSprite(crate36Png)
  assets.heroIdle = loadSprite(heroIdle38Png)
  assets.heroWalk = loadSprite(heroWalk38Png)
  assets.drone = loadSprite(drone32Png)

  const decoded =
    assets.grassTop.width > 0 &&
    assets.dirt.width > 0 &&
    assets.crate.width > 0 &&
    assets.heroIdle.width > 0 &&
    assets.heroWalk.width > 0 &&
    assets.drone.width > 0
  return decoded ? assets : null
}
