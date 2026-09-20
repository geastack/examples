// Typed ports of the three.js geometry generators (same parameterization,
// same vertex layouts). Dynamic component indexing from upstream buildPlane
// is replaced with explicit axis dispatch.

import { BufferGeometry, Float32BufferAttribute } from './core'

class PlaneBuilder {
  readonly positions: number[]
  readonly normals: number[]
  readonly uvs: number[]
  readonly indices: number[]
  vertexCount: number

  constructor() {
    this.positions = []
    this.normals = []
    this.uvs = []
    this.indices = []
    this.vertexCount = 0
  }

  // u, v, w: axis indices (0=x, 1=y, 2=z) receiving the plane's U, V and
  // normal components — the typed replacement for three's vector['x'] trick.
  buildPlane(
    u: number,
    v: number,
    w: number,
    udir: number,
    vdir: number,
    width: number,
    height: number,
    depth: number,
    gridX: number,
    gridY: number,
  ): void {
    const segmentWidth = width / gridX
    const segmentHeight = height / gridY
    const widthHalf = width / 2
    const heightHalf = height / 2
    const depthHalf = depth / 2
    const gridX1 = gridX + 1
    const gridY1 = gridY + 1
    const vertexStart = this.vertexCount

    for (let iy = 0; iy < gridY1; iy++) {
      const y = iy * segmentHeight - heightHalf
      for (let ix = 0; ix < gridX1; ix++) {
        const x = ix * segmentWidth - widthHalf
        const cu = x * udir
        const cv = y * vdir
        const cw = depthHalf
        // component vector: value into axis slot
        let px = 0
        let py = 0
        let pz = 0
        if (u === 0) px = cu
        else if (u === 1) py = cu
        else pz = cu
        if (v === 0) px = cv
        else if (v === 1) py = cv
        else pz = cv
        if (w === 0) px = cw
        else if (w === 1) py = cw
        else pz = cw
        this.positions.push(px, py, pz)

        let nx = 0
        let ny = 0
        let nz = 0
        const nw = depth > 0 ? 1 : -1
        if (w === 0) nx = nw
        else if (w === 1) ny = nw
        else nz = nw
        this.normals.push(nx, ny, nz)

        this.uvs.push(ix / gridX, 1 - iy / gridY)
        this.vertexCount++
      }
    }

    for (let iy = 0; iy < gridY; iy++) {
      for (let ix = 0; ix < gridX; ix++) {
        const a = vertexStart + ix + gridX1 * iy
        const b = vertexStart + ix + gridX1 * (iy + 1)
        const c = vertexStart + (ix + 1) + gridX1 * (iy + 1)
        const d = vertexStart + (ix + 1) + gridX1 * iy
        this.indices.push(a, b, d)
        this.indices.push(b, c, d)
      }
    }
  }
}

export class BoxGeometry extends BufferGeometry {
  constructor(
    width: number = 1,
    height: number = 1,
    depth: number = 1,
    widthSegments: number = 1,
    heightSegments: number = 1,
    depthSegments: number = 1,
  ) {
    super()
    const ws = Math.floor(widthSegments)
    const hs = Math.floor(heightSegments)
    const ds = Math.floor(depthSegments)
    const b = new PlaneBuilder()
    // axis mapping mirrors three.js BoxGeometry: (u, v, w, udir, vdir, w, h, d)
    b.buildPlane(2, 1, 0, -1, -1, depth, height, width, ds, hs) // px
    b.buildPlane(2, 1, 0, 1, -1, depth, height, -width, ds, hs) // nx
    b.buildPlane(0, 2, 1, 1, 1, width, depth, height, ws, ds) // py
    b.buildPlane(0, 2, 1, 1, -1, width, depth, -height, ws, ds) // ny
    b.buildPlane(0, 1, 2, 1, -1, width, height, depth, ws, hs) // pz
    b.buildPlane(0, 1, 2, -1, -1, width, height, -depth, ws, hs) // nz
    this.setIndex(b.indices)
    this.setAttribute('position', new Float32BufferAttribute(b.positions, 3))
    this.setAttribute('normal', new Float32BufferAttribute(b.normals, 3))
    this.setAttribute('uv', new Float32BufferAttribute(b.uvs, 2))
  }
}

export class PlaneGeometry extends BufferGeometry {
  constructor(width: number = 1, height: number = 1, widthSegments: number = 1, heightSegments: number = 1) {
    super()
    const widthHalf = width / 2
    const heightHalf = height / 2
    const gridX = Math.floor(widthSegments)
    const gridY = Math.floor(heightSegments)
    const gridX1 = gridX + 1
    const gridY1 = gridY + 1
    const segmentWidth = width / gridX
    const segmentHeight = height / gridY

    const indices: number[] = []
    const positions: number[] = []
    const normals: number[] = []
    const uvs: number[] = []

    for (let iy = 0; iy < gridY1; iy++) {
      const y = iy * segmentHeight - heightHalf
      for (let ix = 0; ix < gridX1; ix++) {
        const x = ix * segmentWidth - widthHalf
        positions.push(x, -y, 0)
        normals.push(0, 0, 1)
        uvs.push(ix / gridX, 1 - iy / gridY)
      }
    }
    for (let iy = 0; iy < gridY; iy++) {
      for (let ix = 0; ix < gridX; ix++) {
        const a = ix + gridX1 * iy
        const b = ix + gridX1 * (iy + 1)
        const c = ix + 1 + gridX1 * (iy + 1)
        const d = ix + 1 + gridX1 * iy
        indices.push(a, b, d)
        indices.push(b, c, d)
      }
    }
    this.setIndex(indices)
    this.setAttribute('position', new Float32BufferAttribute(positions, 3))
    this.setAttribute('normal', new Float32BufferAttribute(normals, 3))
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  }
}

export class SphereGeometry extends BufferGeometry {
  constructor(
    radius: number = 1,
    widthSegments: number = 32,
    heightSegments: number = 16,
    phiStart: number = 0,
    phiLength: number = Math.PI * 2,
    thetaStart: number = 0,
    thetaLength: number = Math.PI,
  ) {
    super()
    const ws = Math.max(3, Math.floor(widthSegments))
    const hs = Math.max(2, Math.floor(heightSegments))
    const thetaEnd = Math.min(thetaStart + thetaLength, Math.PI)

    const indices: number[] = []
    const positions: number[] = []
    const normals: number[] = []
    const uvs: number[] = []
    const grid: number[][] = []
    let index = 0

    for (let iy = 0; iy <= hs; iy++) {
      const verticesRow: number[] = []
      const v = iy / hs
      let uOffset = 0
      if (iy === 0 && thetaStart === 0) uOffset = 0.5 / ws
      else if (iy === hs && thetaEnd === Math.PI) uOffset = -0.5 / ws
      for (let ix = 0; ix <= ws; ix++) {
        const u = ix / ws
        const px = -radius * Math.cos(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength)
        const py = radius * Math.cos(thetaStart + v * thetaLength)
        const pz = radius * Math.sin(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength)
        positions.push(px, py, pz)
        const len = Math.sqrt(px * px + py * py + pz * pz)
        const inv = len > 0 ? 1 / len : 0
        normals.push(px * inv, py * inv, pz * inv)
        uvs.push(u + uOffset, 1 - v)
        verticesRow.push(index)
        index++
      }
      grid.push(verticesRow)
    }

    for (let iy = 0; iy < hs; iy++) {
      for (let ix = 0; ix < ws; ix++) {
        const a = grid[iy][ix + 1]
        const b = grid[iy][ix]
        const c = grid[iy + 1][ix]
        const d = grid[iy + 1][ix + 1]
        if (iy !== 0 || thetaStart > 0) indices.push(a, b, d)
        if (iy !== hs - 1 || thetaEnd < Math.PI) indices.push(b, c, d)
      }
    }

    this.setIndex(indices)
    this.setAttribute('position', new Float32BufferAttribute(positions, 3))
    this.setAttribute('normal', new Float32BufferAttribute(normals, 3))
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  }
}

export class TorusGeometry extends BufferGeometry {
  constructor(
    radius: number = 1,
    tube: number = 0.4,
    radialSegments: number = 12,
    tubularSegments: number = 48,
    arc: number = Math.PI * 2,
  ) {
    super()
    const rs = Math.floor(radialSegments)
    const ts = Math.floor(tubularSegments)

    const indices: number[] = []
    const positions: number[] = []
    const normals: number[] = []
    const uvs: number[] = []

    for (let j = 0; j <= rs; j++) {
      for (let i = 0; i <= ts; i++) {
        const u = (i / ts) * arc
        const v = (j / rs) * Math.PI * 2
        const px = (radius + tube * Math.cos(v)) * Math.cos(u)
        const py = (radius + tube * Math.cos(v)) * Math.sin(u)
        const pz = tube * Math.sin(v)
        positions.push(px, py, pz)
        const cx = radius * Math.cos(u)
        const cy = radius * Math.sin(u)
        let nx = px - cx
        let ny = py - cy
        let nz = pz
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz)
        const inv = len > 0 ? 1 / len : 0
        nx *= inv
        ny *= inv
        nz *= inv
        normals.push(nx, ny, nz)
        uvs.push(i / ts, j / rs)
      }
    }

    for (let j = 1; j <= rs; j++) {
      for (let i = 1; i <= ts; i++) {
        const a = (ts + 1) * j + i - 1
        const b = (ts + 1) * (j - 1) + i - 1
        const c = (ts + 1) * (j - 1) + i
        const d = (ts + 1) * j + i
        indices.push(a, b, d)
        indices.push(b, c, d)
      }
    }

    this.setIndex(indices)
    this.setAttribute('position', new Float32BufferAttribute(positions, 3))
    this.setAttribute('normal', new Float32BufferAttribute(normals, 3))
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  }
}

export class TorusKnotGeometry extends BufferGeometry {
  constructor(
    radius: number = 1,
    tube: number = 0.4,
    tubularSegments: number = 64,
    radialSegments: number = 8,
    p: number = 2,
    q: number = 3,
  ) {
    super()
    const ts = Math.floor(tubularSegments)
    const rs = Math.floor(radialSegments)

    const indices: number[] = []
    const positions: number[] = []
    const normals: number[] = []
    const uvs: number[] = []

    for (let i = 0; i <= ts; i++) {
      const u = (i / ts) * p * Math.PI * 2
      // curve point and a slightly advanced point for the frame
      const p1x = knotX(u, p, q, radius)
      const p1y = knotY(u, p, q, radius)
      const p1z = knotZ(u, p, q, radius)
      const u2 = u + 0.01
      const p2x = knotX(u2, p, q, radius)
      const p2y = knotY(u2, p, q, radius)
      const p2z = knotZ(u2, p, q, radius)

      // Frenet-ish frame
      let tx = p2x - p1x
      let ty = p2y - p1y
      let tz = p2z - p1z
      let nx = p2x + p1x
      let ny = p2y + p1y
      let nz = p2z + p1z
      // B = T x N
      let bx = ty * nz - tz * ny
      let by = tz * nx - tx * nz
      let bz = tx * ny - ty * nx
      // N = B x T
      nx = by * tz - bz * ty
      ny = bz * tx - bx * tz
      nz = bx * ty - by * tx
      let len = Math.sqrt(bx * bx + by * by + bz * bz)
      let inv = len > 0 ? 1 / len : 0
      bx *= inv
      by *= inv
      bz *= inv
      len = Math.sqrt(nx * nx + ny * ny + nz * nz)
      inv = len > 0 ? 1 / len : 0
      nx *= inv
      ny *= inv
      nz *= inv

      for (let j = 0; j <= rs; j++) {
        const v = (j / rs) * Math.PI * 2
        const cx = -tube * Math.cos(v)
        const cy = tube * Math.sin(v)
        const px = p1x + (cx * nx + cy * bx)
        const py = p1y + (cx * ny + cy * by)
        const pz = p1z + (cx * nz + cy * bz)
        positions.push(px, py, pz)
        let vnx = px - p1x
        let vny = py - p1y
        let vnz = pz - p1z
        const vlen = Math.sqrt(vnx * vnx + vny * vny + vnz * vnz)
        const vinv = vlen > 0 ? 1 / vlen : 0
        normals.push(vnx * vinv, vny * vinv, vnz * vinv)
        uvs.push(i / ts, j / rs)
      }
    }

    for (let j = 1; j <= ts; j++) {
      for (let i = 1; i <= rs; i++) {
        const a = (rs + 1) * (j - 1) + (i - 1)
        const b = (rs + 1) * j + (i - 1)
        const c = (rs + 1) * j + i
        const d = (rs + 1) * (j - 1) + i
        indices.push(a, b, d)
        indices.push(b, c, d)
      }
    }

    this.setIndex(indices)
    this.setAttribute('position', new Float32BufferAttribute(positions, 3))
    this.setAttribute('normal', new Float32BufferAttribute(normals, 3))
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  }
}

function knotX(u: number, p: number, q: number, radius: number): number {
  const cu = Math.cos(u)
  const quOverP = (q / p) * u
  const cs = Math.cos(quOverP)
  return radius * (2 + cs) * 0.5 * cu
}

function knotY(u: number, p: number, q: number, radius: number): number {
  const su = Math.sin(u)
  const quOverP = (q / p) * u
  const cs = Math.cos(quOverP)
  return radius * (2 + cs) * su * 0.5
}

function knotZ(u: number, p: number, q: number, radius: number): number {
  return radius * Math.sin((q / p) * u) * 0.5
}

export class CylinderGeometry extends BufferGeometry {
  constructor(
    radiusTop: number = 1,
    radiusBottom: number = 1,
    height: number = 1,
    radialSegments: number = 32,
    heightSegments: number = 1,
    openEnded: boolean = false,
    thetaStart: number = 0,
    thetaLength: number = Math.PI * 2,
  ) {
    super()
    const rs = Math.floor(radialSegments)
    const hs = Math.floor(heightSegments)

    const indices: number[] = []
    const positions: number[] = []
    const normals: number[] = []
    const uvs: number[] = []
    let index = 0
    const halfHeight = height / 2

    // torso
    const indexRows: number[][] = []
    const slope = (radiusBottom - radiusTop) / height
    for (let y = 0; y <= hs; y++) {
      const indexRow: number[] = []
      const v = y / hs
      const radius = v * (radiusBottom - radiusTop) + radiusTop
      for (let x = 0; x <= rs; x++) {
        const u = x / rs
        const theta = u * thetaLength + thetaStart
        const sinTheta = Math.sin(theta)
        const cosTheta = Math.cos(theta)
        positions.push(radius * sinTheta, -v * height + halfHeight, radius * cosTheta)
        let nx = sinTheta
        let ny = slope
        let nz = cosTheta
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz)
        const inv = len > 0 ? 1 / len : 0
        normals.push(nx * inv, ny * inv, nz * inv)
        uvs.push(u, 1 - v)
        indexRow.push(index)
        index++
      }
      indexRows.push(indexRow)
    }
    for (let x = 0; x < rs; x++) {
      for (let y = 0; y < hs; y++) {
        const a = indexRows[y][x]
        const b = indexRows[y + 1][x]
        const c = indexRows[y + 1][x + 1]
        const d = indexRows[y][x + 1]
        // skip only the degenerate apex rows (three.js semantics)
        if (radiusTop > 0 || y !== 0) indices.push(a, b, d)
        if (radiusBottom > 0 || y !== hs - 1) indices.push(b, c, d)
      }
    }

    // caps
    if (!openEnded) {
      if (radiusTop > 0) {
        index = generateCap(true, radiusTop, halfHeight, rs, thetaStart, thetaLength, positions, normals, uvs, indices, index)
      }
      if (radiusBottom > 0) {
        index = generateCap(false, radiusBottom, halfHeight, rs, thetaStart, thetaLength, positions, normals, uvs, indices, index)
      }
    }

    this.setIndex(indices)
    this.setAttribute('position', new Float32BufferAttribute(positions, 3))
    this.setAttribute('normal', new Float32BufferAttribute(normals, 3))
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  }
}

function generateCap(
  top: boolean,
  radius: number,
  halfHeight: number,
  radialSegments: number,
  thetaStart: number,
  thetaLength: number,
  positions: number[],
  normals: number[],
  uvs: number[],
  indices: number[],
  startIndex: number,
): number {
  let index = startIndex
  const sign = top ? 1 : -1
  const centerIndexStart = index
  for (let x = 1; x <= radialSegments; x++) {
    positions.push(0, halfHeight * sign, 0)
    normals.push(0, sign, 0)
    uvs.push(0.5, 0.5)
    index++
  }
  const centerIndexEnd = index
  for (let x = 0; x <= radialSegments; x++) {
    const u = x / radialSegments
    const theta = u * thetaLength + thetaStart
    const cosTheta = Math.cos(theta)
    const sinTheta = Math.sin(theta)
    positions.push(radius * sinTheta, halfHeight * sign, radius * cosTheta)
    normals.push(0, sign, 0)
    uvs.push(cosTheta * 0.5 + 0.5, sinTheta * 0.5 * sign + 0.5)
    index++
  }
  for (let x = 0; x < radialSegments; x++) {
    const c = centerIndexStart + x
    const i = centerIndexEnd + x
    if (top) {
      indices.push(i, i + 1, c)
    } else {
      indices.push(i + 1, i, c)
    }
  }
  return index
}

export class ConeGeometry extends CylinderGeometry {
  constructor(
    radius: number = 1,
    height: number = 1,
    radialSegments: number = 32,
    heightSegments: number = 1,
    openEnded: boolean = false,
    thetaStart: number = 0,
    thetaLength: number = Math.PI * 2,
  ) {
    super(0, radius, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength)
  }
}
