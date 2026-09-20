import { loadImage } from '@geastack/core'
import {
  crateBytes,
  dirtBytes,
  droneBytes,
  goalFlagBytes,
  grassTopBytes,
  heroIdleBytes,
  heroWalkBytes,
  hillBackgroundBytes
} from './src/assetBytes'

// Tiles + background are opaque solids: snap any AA at decode so blits hit the
// row-memcpy fast path instead of per-pixel alpha blending.
export const grassTopImage = loadImage(grassTopBytes, { opaque: true })
export const dirtImage = loadImage(dirtBytes, { opaque: true })
export const crateImage = loadImage(crateBytes, { opaque: true })
export const hillBackgroundImage = loadImage(hillBackgroundBytes, { opaque: true })
// Sprites with transparent backgrounds keep their alpha buffer.
export const heroIdleImage = loadImage(heroIdleBytes)
export const heroWalkImage = loadImage(heroWalkBytes)
export const droneImage = loadImage(droneBytes)
export const goalFlagImage = loadImage(goalFlagBytes)
