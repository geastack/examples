// Material subset. All materials rasterize flat-shaded (one color per
// triangle); Lambert/Phong/Standard all shade as per-face lambert.
// Parameter objects take hex numbers for color (not Color/string unions).

import { Color } from './math'

export const FrontSide = 0
export const BackSide = 1
export const DoubleSide = 2

export interface MeshMaterialParameters {
  color?: number
  vertexColors?: boolean
  side?: number
  transparent?: boolean
  opacity?: number
}

export class Material {
  readonly color: Color
  vertexColors: boolean
  side: number
  transparent: boolean
  opacity: number
  visible: boolean
  // Shading selector used by the renderer: 0 unlit, 1 lambert, 2 normal.
  readonly shadeMode: number

  constructor(shadeMode: number, params?: MeshMaterialParameters) {
    this.color = new Color()
    this.vertexColors = false
    this.side = FrontSide
    this.transparent = false
    this.opacity = 1
    this.visible = true
    this.shadeMode = shadeMode
    if (params !== undefined) {
      const c = params.color
      if (c !== undefined) this.color.setHex(c)
      const vc = params.vertexColors
      if (vc !== undefined) this.vertexColors = vc
      const side = params.side
      if (side !== undefined) this.side = side
      const transparent = params.transparent
      if (transparent !== undefined) this.transparent = transparent
      const opacity = params.opacity
      if (opacity !== undefined) this.opacity = opacity
    }
  }
}

export class MeshBasicMaterial extends Material {
  constructor(params?: MeshMaterialParameters) {
    super(0, params)
  }
}

export class MeshLambertMaterial extends Material {
  constructor(params?: MeshMaterialParameters) {
    super(1, params)
  }
}

export class MeshPhongMaterial extends Material {
  constructor(params?: MeshMaterialParameters) {
    super(1, params)
  }
}

export class MeshStandardMaterial extends Material {
  constructor(params?: MeshMaterialParameters) {
    super(1, params)
  }
}

export class MeshNormalMaterial extends Material {
  constructor(params?: MeshMaterialParameters) {
    super(2, params)
  }
}
