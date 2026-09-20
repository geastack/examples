export type ThreeSceneElement = number[]

export class ThreeGeometryBuffer {
  positions: f32[] = []
  normals: f32[] = []
  indices: f32[] = []
}

function createGeometryBuffer(positions: f32[], normals: f32[], indices: f32[]): ThreeGeometryBuffer {
  const buffer = new ThreeGeometryBuffer()
  buffer.positions = positions
  buffer.normals = normals
  buffer.indices = indices
  return buffer
}

export class ThreeBufferSceneElement {
  demoCode: number = 0
  materialCode: number = 1
  materialColor: number = 0xffffff
  backgroundColor: number = 0
  cameraFov: number = 70
  cameraAspect: number = 1
  cameraNear: number = 0.01
  cameraFar: number = 100
  cameraX: number = 0
  cameraY: number = 0
  cameraZ: number = 4
  cameraLookAtX: number = 0
  cameraLookAtY: number = 0
  cameraLookAtZ: number = 0
  rotationZ: number = 0
  ambientLightColor: number = 0xffffff
  ambientLightIntensity: number = 1
  directionalLightColor: number = 0xffffff
  directionalLightIntensity: number = 0
  directionalLightX: number = 0
  directionalLightY: number = 0
  directionalLightZ: number = 1
  positions: f32[] = []
  normals: f32[] = []
  indices: f32[] = []
  colors: f32[] = []
}

export type ThreeBufferSceneResult = ThreeBufferSceneElement | ThreeBufferSceneElement[]

export interface ThreeCanvasCamera {
  fov?: number
  aspect?: number
  near?: number
  far?: number
  position?: readonly f32[]
  positionX?: number
  positionY?: number
  positionZ?: number
  lookAt?: readonly f32[]
  lookAtX?: number
  lookAtY?: number
  lookAtZ?: number
}

export interface ThreeCanvasProps {
  demoCode?: number
  background?: number
  camera?: ThreeCanvasCamera
  children?: object | readonly object[]
}

export function Canvas(_props: ThreeCanvasProps): ThreeSceneElement {
  throw new Error('Three <Canvas> must be lowered by the three-scene-jsx Vite plugin.')
}

export const THREE_SCENE_DEMO_CODE = 0
export const THREE_SCENE_GEOMETRY_CODE = 1
export const THREE_SCENE_MATERIAL_CODE = 2
export const THREE_SCENE_MATERIAL_COLOR = 3
export const THREE_SCENE_BACKGROUND_COLOR = 4
export const THREE_SCENE_CAMERA_FOV = 5
export const THREE_SCENE_CAMERA_ASPECT = 6
export const THREE_SCENE_CAMERA_NEAR = 7
export const THREE_SCENE_CAMERA_FAR = 8
export const THREE_SCENE_CAMERA_Z = 9
export const THREE_SCENE_ROTATION_X = 10
export const THREE_SCENE_ROTATION_Y = 11
export const THREE_SCENE_ROTATION_Z = 12
export const THREE_SCENE_POSITION_X = 13
export const THREE_SCENE_POSITION_Y = 14
export const THREE_SCENE_POSITION_Z = 15
export const THREE_SCENE_PARAMETER_0 = 16
export const THREE_SCENE_PARAMETER_1 = 17
export const THREE_SCENE_PARAMETER_2 = 18
export const THREE_SCENE_PARAMETER_3 = 19
export const THREE_SCENE_PARAMETER_4 = 20
export const THREE_SCENE_PARAMETER_5 = 21
export const THREE_SCENE_SCALE_X = 22
export const THREE_SCENE_SCALE_Y = 23
export const THREE_SCENE_SCALE_Z = 24
export const THREE_SCENE_AMBIENT_LIGHT_COLOR = 25
export const THREE_SCENE_AMBIENT_LIGHT_INTENSITY = 26
export const THREE_SCENE_DIRECTIONAL_LIGHT_COLOR = 27
export const THREE_SCENE_DIRECTIONAL_LIGHT_INTENSITY = 28
export const THREE_SCENE_DIRECTIONAL_LIGHT_X = 29
export const THREE_SCENE_DIRECTIONAL_LIGHT_Y = 30
export const THREE_SCENE_DIRECTIONAL_LIGHT_Z = 31
export const THREE_SCENE_CAMERA_X = 32
export const THREE_SCENE_CAMERA_Y = 33
export const THREE_SCENE_CAMERA_LOOK_AT_X = 34
export const THREE_SCENE_CAMERA_LOOK_AT_Y = 35
export const THREE_SCENE_CAMERA_LOOK_AT_Z = 36

export class ThreeGeometryElement {
  geometryCode: number = 1
  parameter0: number = 1
  parameter1: number = 1
  parameter2: number = 1
  parameter3: number = 1
  parameter4: number = 1
  parameter5: number = 1
}

export class ThreeMaterialElement {
  materialCode: number = 1
  materialColor: number = 0xffffff
}

export class ThreeCameraElement {
  fov: number = 70
  aspect: number = 1
  near: number = 0.01
  far: number = 100
  positionX: number = 0
  positionY: number = 0
  positionZ: number = 0
  lookAtX: number = 0
  lookAtY: number = 0
  lookAtZ: number = 0
}

export class ThreeMeshElement {
  geometry = new ThreeGeometryElement()
  material = new ThreeMaterialElement()
  positionX: number = 0
  positionY: number = 0
  positionZ: number = 0
  rotationX: number = 0
  rotationY: number = 0
  rotationZ: number = 0
  scaleX: number = 1
  scaleY: number = 1
  scaleZ: number = 1
}

export function createThreeScenePayload(
  demoCode: number,
  geometryCode: number,
  materialCode: number,
  materialColor: number,
  backgroundColor: number,
  cameraFov: number,
  cameraAspect: number,
  cameraNear: number,
  cameraFar: number,
  cameraPositionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  ambientLightColor: number = 0xffffff,
  ambientLightIntensity: number = 1,
  directionalLightColor: number = 0xffffff,
  directionalLightIntensity: number = 0,
  directionalLightX: number = 0,
  directionalLightY: number = 0,
  directionalLightZ: number = 1,
  cameraPositionX: number = 0,
  cameraPositionY: number = 0,
  cameraLookAtX: number = 0,
  cameraLookAtY: number = 0,
  cameraLookAtZ: number = 0,
): ThreeSceneElement {
  return [
    demoCode,
    geometryCode,
    materialCode,
    materialColor,
    backgroundColor,
    cameraFov,
    cameraAspect,
    cameraNear,
    cameraFar,
    cameraPositionZ,
    rotationX,
    rotationY,
    rotationZ,
    positionX,
    positionY,
    positionZ,
    parameter0,
    parameter1,
    parameter2,
    parameter3,
    parameter4,
    parameter5,
    scaleX,
    scaleY,
    scaleZ,
    ambientLightColor,
    ambientLightIntensity,
    directionalLightColor,
    directionalLightIntensity,
    directionalLightX,
    directionalLightY,
    directionalLightZ,
    cameraPositionX,
    cameraPositionY,
    cameraLookAtX,
    cameraLookAtY,
    cameraLookAtZ,
  ]
}

export function createThreeScenePositions(scene: ThreeSceneElement): f32[] {
  const values = createThreeSceneBufferValues(scene, 0)
  return values
}

export function createThreeSceneNormals(scene: ThreeSceneElement): f32[] {
  const values = createThreeSceneBufferValues(scene, 1)
  return values
}

export function createThreeSceneIndices(scene: ThreeSceneElement): f32[] {
  const values = createThreeSceneBufferValues(scene, 2)
  return values
}

export function createThreeSceneColorValues(scene: ThreeSceneElement): f32[] {
  return createThreeSceneBufferValues(scene, 3)
}

export function createThreeSceneTransformedBufferValues(scene: ThreeSceneElement, slot: number): f32[] {
  const source = createThreeSceneScaledBufferValues(scene, createThreeSceneRawBufferValues(scene, slot), slot)
  if (slot === 2 || slot === 3) return source
  const values: f32[] = []
  const rotationX = scene[THREE_SCENE_ROTATION_X]
  const rotationY = scene[THREE_SCENE_ROTATION_Y]
  const rotationZ = scene[THREE_SCENE_ROTATION_Z]
  const cosX = Math.cos(rotationX)
  const sinX = Math.sin(rotationX)
  const cosY = Math.cos(rotationY)
  const sinY = Math.sin(rotationY)
  const cosZ = Math.cos(rotationZ)
  const sinZ = Math.sin(rotationZ)
  for (let i = 0; i < source.length; i += 3) {
    const x = source[i]
    const y = source[i + 1]
    const z = source[i + 2]
    const x1 = x
    const y1 = y * cosX - z * sinX
    const z1 = y * sinX + z * cosX
    const x2 = x1 * cosY + z1 * sinY
    const y2 = y1
    const z2 = z1 * cosY - x1 * sinY
    const x3 = x2 * cosZ - y2 * sinZ
    const y3 = x2 * sinZ + y2 * cosZ
    const z3 = z2
    if (slot === 0) {
      values.push(
        x3 + scene[THREE_SCENE_POSITION_X],
        y3 + scene[THREE_SCENE_POSITION_Y],
        z3 + scene[THREE_SCENE_POSITION_Z],
      )
    } else {
      values.push(x3, y3, z3)
    }
  }
  return values
}

export function createCombinedThreeSceneBufferValues(scenes: ThreeSceneElement[], slot: number): f32[] {
  const values: f32[] = []
  if (slot === 0 || slot === 1) {
    for (let sceneIndex = 0; sceneIndex < scenes.length; sceneIndex++) {
      const meshValues = createThreeSceneTransformedBufferValues(scenes[sceneIndex], slot)
      for (let i = 0; i < meshValues.length; i++) values.push(meshValues[i])
    }
    return values
  }
  if (slot === 3) {
    for (let sceneIndex = 0; sceneIndex < scenes.length; sceneIndex++) {
      const scene = scenes[sceneIndex]
      const meshNormals = createThreeSceneTransformedBufferValues(scene, 1)
      appendBufferColorValues(
        values,
        scene[THREE_SCENE_MATERIAL_CODE],
        scene[THREE_SCENE_MATERIAL_COLOR],
        meshNormals,
        meshNormals.length / 3,
        scene[THREE_SCENE_AMBIENT_LIGHT_COLOR],
        scene[THREE_SCENE_AMBIENT_LIGHT_INTENSITY],
        scene[THREE_SCENE_DIRECTIONAL_LIGHT_COLOR],
        scene[THREE_SCENE_DIRECTIONAL_LIGHT_INTENSITY],
        scene[THREE_SCENE_DIRECTIONAL_LIGHT_X],
        scene[THREE_SCENE_DIRECTIONAL_LIGHT_Y],
        scene[THREE_SCENE_DIRECTIONAL_LIGHT_Z],
      )
    }
    return values
  }
  let vertexOffset = 0
  for (let sceneIndex = 0; sceneIndex < scenes.length; sceneIndex++) {
    const scene = scenes[sceneIndex]
    const meshIndices = createThreeSceneBufferValues(scene, 2)
    for (let i = 0; i < meshIndices.length; i++) values.push(meshIndices[i] + vertexOffset)
    vertexOffset += createThreeSceneBufferValues(scene, 0).length / 3
  }
  return values
}

export function createThreeSceneBufferValues(scene: ThreeSceneElement, slot: number): f32[] {
  const source = createThreeSceneRawBufferValues(scene, slot)
  return createThreeSceneScaledBufferValues(scene, source, slot)
}

function createThreeSceneScaledBufferValues(scene: ThreeSceneElement, source: f32[], slot: number): f32[] {
  if (slot !== 0 && slot !== 1) return source
  const scaleX = scene[THREE_SCENE_SCALE_X]
  const scaleY = scene[THREE_SCENE_SCALE_Y]
  const scaleZ = scene[THREE_SCENE_SCALE_Z]
  if (scaleX === 1 && scaleY === 1 && scaleZ === 1) return source
  const values: f32[] = []
  const normalScaleX = scaleX > 0.0001 || scaleX < -0.0001 ? scaleX : 1
  const normalScaleY = scaleY > 0.0001 || scaleY < -0.0001 ? scaleY : 1
  const normalScaleZ = scaleZ > 0.0001 || scaleZ < -0.0001 ? scaleZ : 1
  for (let i = 0; i < source.length; i += 3) {
    if (slot < 0.5) {
      values.push(source[i] * scaleX, source[i + 1] * scaleY, source[i + 2] * scaleZ)
    } else {
      const nx = source[i] / normalScaleX
      const ny = source[i + 1] / normalScaleY
      const nz = source[i + 2] / normalScaleZ
      const length = Math.sqrt(nx * nx + ny * ny + nz * nz)
      if (length > 0.0001) values.push(nx / length, ny / length, nz / length)
      else values.push(source[i], source[i + 1], source[i + 2])
    }
  }
  return values
}

function createThreeSceneRawBufferValues(scene: ThreeSceneElement, slot: number): f32[] {
  if (slot === 3) {
    const positions = createThreeSceneBufferValues(scene, 0)
    const normals = createThreeSceneBufferValues(scene, 1)
    const colors: f32[] = []
    appendBufferColorValues(
      colors,
      scene[THREE_SCENE_MATERIAL_CODE],
      scene[THREE_SCENE_MATERIAL_COLOR],
      normals,
      positions.length / 3,
      scene[THREE_SCENE_AMBIENT_LIGHT_COLOR],
      scene[THREE_SCENE_AMBIENT_LIGHT_INTENSITY],
      scene[THREE_SCENE_DIRECTIONAL_LIGHT_COLOR],
      scene[THREE_SCENE_DIRECTIONAL_LIGHT_INTENSITY],
      scene[THREE_SCENE_DIRECTIONAL_LIGHT_X],
      scene[THREE_SCENE_DIRECTIONAL_LIGHT_Y],
      scene[THREE_SCENE_DIRECTIONAL_LIGHT_Z],
    )
    return colors
  }
  const values: f32[] = []
  const geometryCode = scene[THREE_SCENE_GEOMETRY_CODE]
  if (geometryCode === 2) {
    const radius = scene[THREE_SCENE_PARAMETER_0]
    const tube = scene[THREE_SCENE_PARAMETER_1]
    const tubularSegments = scene[THREE_SCENE_PARAMETER_2]
    const radialSegments = scene[THREE_SCENE_PARAMETER_3]
    const p = scene[THREE_SCENE_PARAMETER_4]
    const q = scene[THREE_SCENE_PARAMETER_5]
    const safeRadius = Math.max(radius, 0.01)
    const safeTube = Math.max(tube, 0.01)
    const safeTubularSegments = Math.max(8, Math.min(192, Math.floor(tubularSegments)))
    const safeRadialSegments = Math.max(3, Math.min(32, Math.floor(radialSegments)))
    const safeP = Math.max(p, 1)
    const safeQ = Math.max(q, 1)
    const twoPi = 6.283185307179586
    let vertexIndex = safeRadius * 0
    for (let i = 0; i < safeTubularSegments; i++) {
      const u0 = twoPi * i / safeTubularSegments
      const u1 = twoPi * (i + 1) / safeTubularSegments
      for (let j = 0; j < safeRadialSegments; j++) {
        const v0 = twoPi * j / safeRadialSegments
        const v1 = twoPi * (j + 1) / safeRadialSegments
        const a = vertexIndex
        vertexIndex += 1
        const cxa = knotCenterX(u0, safeRadius, safeP, safeQ)
        const cya = knotCenterY(u0, safeRadius, safeP, safeQ)
        const cza = knotCenterZ(u0, safeQ)
        const rxa = normalizeComponentX(Math.cos(safeP * u0), Math.sin(safeP * u0), 0)
        const rya = normalizeComponentY(Math.cos(safeP * u0), Math.sin(safeP * u0), 0)
        const ax = cxa + safeTube * rxa * Math.cos(v0)
        const ay = cya + safeTube * rya * Math.cos(v0)
        const az = cza + safeTube * Math.sin(v0)

        const b = vertexIndex
        vertexIndex += 1
        const cxb = knotCenterX(u1, safeRadius, safeP, safeQ)
        const cyb = knotCenterY(u1, safeRadius, safeP, safeQ)
        const czb = knotCenterZ(u1, safeQ)
        const rxb = normalizeComponentX(Math.cos(safeP * u1), Math.sin(safeP * u1), 0)
        const ryb = normalizeComponentY(Math.cos(safeP * u1), Math.sin(safeP * u1), 0)
        const bx = cxb + safeTube * rxb * Math.cos(v0)
        const by = cyb + safeTube * ryb * Math.cos(v0)
        const bz = czb + safeTube * Math.sin(v0)

        const c = vertexIndex
        vertexIndex += 1
        const cx = cxb + safeTube * rxb * Math.cos(v1)
        const cy = cyb + safeTube * ryb * Math.cos(v1)
        const cz = czb + safeTube * Math.sin(v1)

        const d = vertexIndex
        vertexIndex += 1
        const dx = cxa + safeTube * rxa * Math.cos(v1)
        const dy = cya + safeTube * rya * Math.cos(v1)
        const dz = cza + safeTube * Math.sin(v1)

        if (slot === 0) {
          values.push(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz)
        } else if (slot === 1) {
          const anx = normalizeComponentX(ax - cxa, ay - cya, az - cza)
          const anyv = normalizeComponentY(ax - cxa, ay - cya, az - cza)
          const anz = normalizeComponentZ(ax - cxa, ay - cya, az - cza)
          const bnx = normalizeComponentX(bx - cxb, by - cyb, bz - czb)
          const bny = normalizeComponentY(bx - cxb, by - cyb, bz - czb)
          const bnz = normalizeComponentZ(bx - cxb, by - cyb, bz - czb)
          const cnx = normalizeComponentX(cx - cxb, cy - cyb, cz - czb)
          const cny = normalizeComponentY(cx - cxb, cy - cyb, cz - czb)
          const cnz = normalizeComponentZ(cx - cxb, cy - cyb, cz - czb)
          const dnx = normalizeComponentX(dx - cxa, dy - cya, dz - cza)
          const dny = normalizeComponentY(dx - cxa, dy - cya, dz - cza)
          const dnz = normalizeComponentZ(dx - cxa, dy - cya, dz - cza)
          values.push(anx, anyv, anz, bnx, bny, bnz, cnx, cny, cnz, dnx, dny, dnz)
        } else {
          values.push(a, b, c, a, c, d)
        }
      }
    }
    return values
  }
  if (geometryCode === 3) {
    const radius = scene[THREE_SCENE_PARAMETER_0]
    const widthSegments = scene[THREE_SCENE_PARAMETER_1]
    const heightSegments = scene[THREE_SCENE_PARAMETER_2]
    const phiStart = scene[THREE_SCENE_PARAMETER_3]
    const phiLength = scene[THREE_SCENE_PARAMETER_4]
    const thetaStart = scene[THREE_SCENE_PARAMETER_5]
    const safeRadius = Math.max(radius, 0.01)
    const safeWidthSegments = Math.max(3, Math.floor(widthSegments))
    const safeHeightSegments = Math.max(2, Math.floor(heightSegments))
    const thetaLength = 3.141592653589793
    const thetaEnd = Math.min(thetaStart + thetaLength, 3.141592653589793)
    if (slot === 2) {
      for (let iy = 0; iy < safeHeightSegments; iy++) {
        for (let ix = 0; ix < safeWidthSegments; ix++) {
          const row = safeWidthSegments + 1
          const a = iy * row + ix + 1
          const b = iy * row + ix
          const c = (iy + 1) * row + ix
          const d = (iy + 1) * row + ix + 1
          if (iy !== 0 || thetaStart > 0) values.push(a, b, d)
          if (iy !== safeHeightSegments - 1 || thetaEnd < 3.141592653589793) values.push(b, c, d)
        }
      }
      return values
    }
    for (let iy = 0; iy <= safeHeightSegments; iy++) {
      const v = iy / safeHeightSegments
      const theta = thetaStart + v * thetaLength
      const y = safeRadius * Math.cos(theta)
      const ringRadius = Math.sqrt(Math.max(0, safeRadius * safeRadius - y * y))
      for (let ix = 0; ix <= safeWidthSegments; ix++) {
        const u = ix / safeWidthSegments
        const phi = phiStart + u * Math.max(phiLength, 0.0001)
        const x = -ringRadius * Math.cos(phi)
        const z = ringRadius * Math.sin(phi)
        if (slot === 0) values.push(x, y, z)
        else {
          const nx = normalizeComponentX(x, y, z)
          const ny = normalizeComponentY(x, y, z)
          const nz = normalizeComponentZ(x, y, z)
          values.push(nx, ny, nz)
        }
      }
    }
    return values
  }
  if (geometryCode === 4) {
    const width = scene[THREE_SCENE_PARAMETER_0]
    const height = scene[THREE_SCENE_PARAMETER_1]
    const widthSegments = scene[THREE_SCENE_PARAMETER_2]
    const heightSegments = scene[THREE_SCENE_PARAMETER_3]
    const safeWidth = Math.max(width, 0.01)
    const safeHeight = Math.max(height, 0.01)
    const safeWidthSegments = Math.max(1, Math.floor(widthSegments))
    const safeHeightSegments = Math.max(1, Math.floor(heightSegments))
    const widthHalf = safeWidth * 0.5
    const heightHalf = safeHeight * 0.5
    const segmentWidth = safeWidth / safeWidthSegments
    const segmentHeight = safeHeight / safeHeightSegments
    if (slot === 2) {
      for (let iy = 0; iy < safeHeightSegments; iy++) {
        for (let ix = 0; ix < safeWidthSegments; ix++) {
          const row = safeWidthSegments + 1
          const a = ix + row * iy
          const b = ix + row * (iy + 1)
          const c = ix + 1 + row * (iy + 1)
          const d = ix + 1 + row * iy
          values.push(a, b, d, b, c, d)
        }
      }
      return values
    }
    for (let iy = 0; iy <= safeHeightSegments; iy++) {
      const y = iy * segmentHeight - heightHalf
      for (let ix = 0; ix <= safeWidthSegments; ix++) {
        const x = ix * segmentWidth - widthHalf
        if (slot === 0) values.push(x, -y, 0)
        else values.push(0, 0, 1)
      }
    }
    return values
  }
  if (geometryCode === 5) {
    return createTorusBufferValues(
      scene[THREE_SCENE_PARAMETER_0],
      scene[THREE_SCENE_PARAMETER_1],
      scene[THREE_SCENE_PARAMETER_2],
      scene[THREE_SCENE_PARAMETER_3],
      scene[THREE_SCENE_PARAMETER_4],
      scene[THREE_SCENE_PARAMETER_5],
      slot,
    )
  }
  if (geometryCode === 6) {
    return createCylinderBufferValues(
      scene[THREE_SCENE_PARAMETER_0],
      scene[THREE_SCENE_PARAMETER_1],
      scene[THREE_SCENE_PARAMETER_2],
      scene[THREE_SCENE_PARAMETER_3],
      scene[THREE_SCENE_PARAMETER_4],
      scene[THREE_SCENE_PARAMETER_5],
      slot,
    )
  }
  if (geometryCode === 7) {
    return createRingBufferValues(
      scene[THREE_SCENE_PARAMETER_0],
      scene[THREE_SCENE_PARAMETER_1],
      scene[THREE_SCENE_PARAMETER_2],
      scene[THREE_SCENE_PARAMETER_3],
      scene[THREE_SCENE_PARAMETER_4],
      scene[THREE_SCENE_PARAMETER_5],
      slot,
    )
  }
  if (geometryCode === 8) {
    return createCircleBufferValues(
      scene[THREE_SCENE_PARAMETER_0],
      scene[THREE_SCENE_PARAMETER_1],
      scene[THREE_SCENE_PARAMETER_2],
      scene[THREE_SCENE_PARAMETER_3],
      slot,
    )
  }
  const width = scene[THREE_SCENE_PARAMETER_0]
  const height = scene[THREE_SCENE_PARAMETER_1]
  const depth = scene[THREE_SCENE_PARAMETER_2]
  const widthSegments = scene[THREE_SCENE_PARAMETER_3]
  const heightSegments = scene[THREE_SCENE_PARAMETER_4]
  const depthSegments = scene[THREE_SCENE_PARAMETER_5]
  const sx = Math.max(width, 0.01) * 0.5
  const sy = Math.max(height, 0.01) * 0.5
  const sz = Math.max(depth, 0.01) * 0.5
  const safeWidthSegments = Math.max(1, Math.floor(widthSegments))
  const safeHeightSegments = Math.max(1, Math.floor(heightSegments))
  const safeDepthSegments = Math.max(1, Math.floor(depthSegments))
  let vertexOffset = sx * 0
  for (let side = 0; side < 6; side++) {
    let gridX = safeWidthSegments
    let gridY = safeHeightSegments
    if (side === 2 || side === 3) {
      gridX = safeDepthSegments
      gridY = safeHeightSegments
    } else if (side === 4 || side === 5) {
      gridX = safeWidthSegments
      gridY = safeDepthSegments
    }
    const row = gridX + 1
    if (slot !== 2) {
      for (let iy = 0; iy <= gridY; iy++) {
        const v = iy / gridY
        for (let ix = 0; ix <= gridX; ix++) {
          const u = ix / gridX
          let x = sx * 0
          let y = sy * 0
          let z = sz * 0
          let nx = sx * 0
          let ny = sy * 0
          let nz = sz * 0
          if (side === 0) {
            x = -sx + width * u
            y = -sy + height * v
            z = sz
            nz = 1
          } else if (side === 1) {
            x = sx - width * u
            y = -sy + height * v
            z = -sz
            nz = -1
          } else if (side === 2) {
            x = sx
            y = -sy + height * v
            z = sz - depth * u
            nx = 1
          } else if (side === 3) {
            x = -sx
            y = -sy + height * v
            z = -sz + depth * u
            nx = -1
          } else if (side === 4) {
            x = -sx + width * u
            y = sy
            z = sz - depth * v
            ny = 1
          } else {
            x = -sx + width * u
            y = -sy
            z = -sz + depth * v
            ny = -1
          }
          if (slot === 0) values.push(x, y, z)
          else values.push(nx, ny, nz)
        }
      }
    }
    for (let iy = 0; iy < gridY; iy++) {
      for (let ix = 0; ix < gridX; ix++) {
        const a = vertexOffset + iy * row + ix
        const b = vertexOffset + iy * row + ix + 1
        const c = vertexOffset + (iy + 1) * row + ix + 1
        const d = vertexOffset + (iy + 1) * row + ix
        if (slot === 2) values.push(a, b, c, a, c, d)
      }
    }
    vertexOffset += row * (gridY + 1)
  }
  return values
}

function createBoxBufferValues(width: number, height: number, depth: number, slot: number): f32[] {
  const values: f32[] = []
  const sx = Math.max(width, 0.01) * 0.5
  const sy = Math.max(height, 0.01) * 0.5
  const sz = Math.max(depth, 0.01) * 0.5
  const nsx = sx * -1
  const nsy = sy * -1
  const nsz = sz * -1
  if (slot === 0) {
    values.push(nsx, nsy, sz, sx, nsy, sz, sx, sy, sz, nsx, sy, sz)
    values.push(sx, nsy, nsz, nsx, nsy, nsz, nsx, sy, nsz, sx, sy, nsz)
    values.push(sx, nsy, sz, sx, nsy, nsz, sx, sy, nsz, sx, sy, sz)
    values.push(nsx, nsy, nsz, nsx, nsy, sz, nsx, sy, sz, nsx, sy, nsz)
    values.push(nsx, sy, sz, sx, sy, sz, sx, sy, nsz, nsx, sy, nsz)
    values.push(nsx, nsy, nsz, sx, nsy, nsz, sx, nsy, sz, nsx, nsy, sz)
    return values
  }
  if (slot === 1) {
    values.push(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1)
    values.push(0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1)
    values.push(1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0)
    values.push(-1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0)
    values.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0)
    values.push(0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0)
    return values
  }
  values.push(0, 1, 2, 0, 2, 3)
  values.push(4, 5, 6, 4, 6, 7)
  values.push(8, 9, 10, 8, 10, 11)
  values.push(12, 13, 14, 12, 14, 15)
  values.push(16, 17, 18, 16, 18, 19)
  values.push(20, 21, 22, 20, 22, 23)
  return values
}

function createRingBufferValues(
  innerRadius: number,
  outerRadius: number,
  thetaSegments: number,
  phiSegments: number,
  thetaStart: number,
  thetaLength: number,
  slot: number,
): f32[] {
  const values: f32[] = []
  const safeInnerRadius = Math.max(innerRadius, 0)
  const safeOuterRadius = Math.max(outerRadius, safeInnerRadius + 0.01)
  const safeThetaSegments = Math.max(3, Math.min(192, Math.floor(thetaSegments)))
  const safePhiSegments = Math.max(1, Math.min(32, Math.floor(phiSegments)))
  const safeThetaLength = Math.max(0.0001, Math.min(6.283185307179586, thetaLength))
  if (slot === 2) {
    for (let j = 0; j < safePhiSegments; j++) {
      const thetaSegmentLevel = j * (safeThetaSegments + 1)
      for (let i = 0; i < safeThetaSegments; i++) {
        const segment = i + thetaSegmentLevel
        const a = segment
        const b = segment + safeThetaSegments + 1
        const c = segment + safeThetaSegments + 2
        const d = segment + 1
        values.push(a, b, d, b, c, d)
      }
    }
    return values
  }
  const radiusStep = (safeOuterRadius - safeInnerRadius) / safePhiSegments
  for (let j = 0; j <= safePhiSegments; j++) {
    const radius = safeInnerRadius + radiusStep * j
    for (let i = 0; i <= safeThetaSegments; i++) {
      const segment = thetaStart + i / safeThetaSegments * safeThetaLength
      if (slot === 0) values.push(radius * Math.cos(segment), radius * Math.sin(segment), 0)
      else values.push(0, 0, 1)
    }
  }
  return values
}

function createCircleBufferValues(
  radius: number,
  segments: number,
  thetaStart: number,
  thetaLength: number,
  slot: number,
): f32[] {
  const buffer = createCircleBuffer(radius, segments, thetaStart, thetaLength)
  if (slot === 0) return buffer.positions
  if (slot === 1) return buffer.normals
  return buffer.indices
}

function createCylinderBufferValues(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  radialSegments: number,
  heightSegments: number,
  openEnded: number,
  slot: number,
): f32[] {
  const values: f32[] = []
  const safeRadiusTop = Math.max(radiusTop, 0)
  const safeRadiusBottom = Math.max(radiusBottom, 0)
  const safeHeight = Math.max(height, 0.01)
  const safeRadialSegments = Math.max(3, Math.min(96, Math.floor(radialSegments)))
  const safeHeightSegments = Math.max(1, Math.min(64, Math.floor(heightSegments)))
  const halfHeight = safeHeight * 0.5
  const slope = (safeRadiusBottom - safeRadiusTop) / safeHeight
  const twoPi = 6.283185307179586
  if (slot === 2) {
    const row = safeRadialSegments + 1
    for (let x = 0; x < safeRadialSegments; x++) {
      for (let y = 0; y < safeHeightSegments; y++) {
        const a = row * y + x
        const b = row * (y + 1) + x
        const c = row * (y + 1) + x + 1
        const d = row * y + x + 1
        if (safeRadiusTop > 0 || y !== 0) values.push(a, b, d)
        if (safeRadiusBottom > 0 || y !== safeHeightSegments - 1) values.push(b, c, d)
      }
    }
    if (openEnded < 0.5) {
      let vertexOffset = (safeHeightSegments + 1) * row
      if (safeRadiusTop > 0) {
        const centerIndexStart = vertexOffset
        const centerIndexEnd = centerIndexStart + safeRadialSegments
        for (let x = 0; x < safeRadialSegments; x++) values.push(centerIndexEnd + x, centerIndexEnd + x + 1, centerIndexStart + x)
        vertexOffset += safeRadialSegments + safeRadialSegments + 1
      }
      if (safeRadiusBottom > 0) {
        const centerIndexStart = vertexOffset
        const centerIndexEnd = centerIndexStart + safeRadialSegments
        for (let x = 0; x < safeRadialSegments; x++) values.push(centerIndexEnd + x + 1, centerIndexEnd + x, centerIndexStart + x)
      }
    }
    return values
  }
  for (let y = 0; y <= safeHeightSegments; y++) {
    const v = y / safeHeightSegments
    const radius = v * (safeRadiusBottom - safeRadiusTop) + safeRadiusTop
    const py = -v * safeHeight + halfHeight
    for (let x = 0; x <= safeRadialSegments; x++) {
      const theta = x / safeRadialSegments * twoPi
      const sinTheta = Math.sin(theta)
      const cosTheta = Math.cos(theta)
      if (slot === 0) values.push(radius * sinTheta, py, radius * cosTheta)
      else values.push(
        normalizeComponentX(sinTheta, slope, cosTheta),
        normalizeComponentY(sinTheta, slope, cosTheta),
        normalizeComponentZ(sinTheta, slope, cosTheta),
      )
    }
  }
  if (openEnded < 0.5) {
    if (safeRadiusTop > 0) appendCylinderCapBufferValues(values, slot, safeRadiusTop, halfHeight, safeRadialSegments, 1)
    if (safeRadiusBottom > 0) appendCylinderCapBufferValues(values, slot, safeRadiusBottom, -halfHeight, safeRadialSegments, -1)
  }
  return values
}

function appendCylinderCapBufferValues(
  values: f32[],
  slot: number,
  radius: number,
  y: number,
  radialSegments: number,
  sign: number,
): void {
  const twoPi = 6.283185307179586
  for (let x = 0; x < radialSegments; x++) {
    if (slot === 0) values.push(0, y, 0)
    else values.push(0, sign, 0)
  }
  for (let x = 0; x <= radialSegments; x++) {
    const theta = x / radialSegments * twoPi
    if (slot === 0) values.push(radius * Math.sin(theta), y, radius * Math.cos(theta))
    else values.push(0, sign, 0)
  }
}

function createTorusBufferValues(
  radius: number,
  tube: number,
  radialSegments: number,
  tubularSegments: number,
  arc: number,
  thetaStart: number,
  slot: number,
): f32[] {
  const values: f32[] = []
  const safeRadius = Math.max(radius, 0.01)
  const safeTube = Math.max(tube, 0.01)
  const safeRadialSegments = Math.max(3, Math.min(64, Math.floor(radialSegments)))
  const safeTubularSegments = Math.max(3, Math.min(192, Math.floor(tubularSegments)))
  const safeArc = Math.max(0.0001, Math.min(6.283185307179586, arc))
  const thetaLength = 6.283185307179586
  if (slot === 2) {
    for (let j = 1; j <= safeRadialSegments; j++) {
      for (let i = 1; i <= safeTubularSegments; i++) {
        const a = (safeTubularSegments + 1) * j + i - 1
        const b = (safeTubularSegments + 1) * (j - 1) + i - 1
        const c = (safeTubularSegments + 1) * (j - 1) + i
        const d = (safeTubularSegments + 1) * j + i
        values.push(a, b, d, b, c, d)
      }
    }
    return values
  }
  for (let j = 0; j <= safeRadialSegments; j++) {
    const v = thetaStart + (j / safeRadialSegments) * thetaLength
    const cosV = Math.cos(v)
    const sinV = Math.sin(v)
    for (let i = 0; i <= safeTubularSegments; i++) {
      const u = i / safeTubularSegments * safeArc
      const cosU = Math.cos(u)
      const sinU = Math.sin(u)
      const x = (safeRadius + safeTube * cosV) * cosU
      const y = (safeRadius + safeTube * cosV) * sinU
      const z = safeTube * sinV
      if (slot === 0) values.push(x, y, z)
      else {
        const centerX = safeRadius * cosU
        const centerY = safeRadius * sinU
        values.push(
          normalizeComponentX(x - centerX, y - centerY, z),
          normalizeComponentY(x - centerX, y - centerY, z),
          normalizeComponentZ(x - centerX, y - centerY, z),
        )
      }
    }
  }
  return values
}

function createTorusKnotBufferValues(
  radius: number,
  tube: number,
  tubularSegments: number,
  radialSegments: number,
  p: number,
  q: number,
  slot: number,
): f32[] {
  const values: f32[] = []
  const safeRadius = Math.max(radius, 0.01)
  const safeTube = Math.max(tube, 0.01)
  const safeTubularSegments = Math.max(8, Math.min(192, Math.floor(tubularSegments)))
  const safeRadialSegments = Math.max(3, Math.min(32, Math.floor(radialSegments)))
  const safeP = Math.max(p, 1)
  const safeQ = Math.max(q, 1)
  const twoPi = 6.283185307179586
  let vertexIndex = safeRadius * 0
  for (let i = 0; i < safeTubularSegments; i++) {
    const u0 = twoPi * i / safeTubularSegments
    const u1 = twoPi * (i + 1) / safeTubularSegments
    for (let j = 0; j < safeRadialSegments; j++) {
      const v0 = twoPi * j / safeRadialSegments
      const v1 = twoPi * (j + 1) / safeRadialSegments
      const a = vertexIndex
      vertexIndex += 1
      const cxa = knotCenterX(u0, safeRadius, safeP, safeQ)
      const cya = knotCenterY(u0, safeRadius, safeP, safeQ)
      const cza = knotCenterZ(u0, safeQ)
      const rxa = normalizeComponentX(Math.cos(safeP * u0), Math.sin(safeP * u0), 0)
      const rya = normalizeComponentY(Math.cos(safeP * u0), Math.sin(safeP * u0), 0)
      const ax = cxa + safeTube * rxa * Math.cos(v0)
      const ay = cya + safeTube * rya * Math.cos(v0)
      const az = cza + safeTube * Math.sin(v0)

      const b = vertexIndex
      vertexIndex += 1
      const cxb = knotCenterX(u1, safeRadius, safeP, safeQ)
      const cyb = knotCenterY(u1, safeRadius, safeP, safeQ)
      const czb = knotCenterZ(u1, safeQ)
      const rxb = normalizeComponentX(Math.cos(safeP * u1), Math.sin(safeP * u1), 0)
      const ryb = normalizeComponentY(Math.cos(safeP * u1), Math.sin(safeP * u1), 0)
      const bx = cxb + safeTube * rxb * Math.cos(v0)
      const by = cyb + safeTube * ryb * Math.cos(v0)
      const bz = czb + safeTube * Math.sin(v0)

      const c = vertexIndex
      vertexIndex += 1
      const cx = cxb + safeTube * rxb * Math.cos(v1)
      const cy = cyb + safeTube * ryb * Math.cos(v1)
      const cz = czb + safeTube * Math.sin(v1)

      const d = vertexIndex
      vertexIndex += 1
      const dx = cxa + safeTube * rxa * Math.cos(v1)
      const dy = cya + safeTube * rya * Math.cos(v1)
      const dz = cza + safeTube * Math.sin(v1)

      if (slot === 0) {
        values.push(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz)
      } else if (slot === 1) {
        const anx = normalizeComponentX(ax - cxa, ay - cya, az - cza)
        const anyv = normalizeComponentY(ax - cxa, ay - cya, az - cza)
        const anz = normalizeComponentZ(ax - cxa, ay - cya, az - cza)
        const bnx = normalizeComponentX(bx - cxb, by - cyb, bz - czb)
        const bny = normalizeComponentY(bx - cxb, by - cyb, bz - czb)
        const bnz = normalizeComponentZ(bx - cxb, by - cyb, bz - czb)
        const cnx = normalizeComponentX(cx - cxb, cy - cyb, cz - czb)
        const cny = normalizeComponentY(cx - cxb, cy - cyb, cz - czb)
        const cnz = normalizeComponentZ(cx - cxb, cy - cyb, cz - czb)
        const dnx = normalizeComponentX(dx - cxa, dy - cya, dz - cza)
        const dny = normalizeComponentY(dx - cxa, dy - cya, dz - cza)
        const dnz = normalizeComponentZ(dx - cxa, dy - cya, dz - cza)
        values.push(anx, anyv, anz, bnx, bny, bnz, cnx, cny, cnz, dnx, dny, dnz)
      } else {
        values.push(a, b, c, a, c, d)
      }
    }
  }
  return values
}

function createSphereBufferValues(
  radius: number,
  widthSegments: number,
  heightSegments: number,
  phiStart: number,
  phiLength: number,
  thetaStart: number,
  slot: number,
): f32[] {
  const values: f32[] = []
  const safeRadius = Math.max(radius, 0.01)
  const safeWidthSegments = Math.max(3, Math.floor(widthSegments))
  const safeHeightSegments = Math.max(2, Math.floor(heightSegments))
  const thetaLength = 3.141592653589793
  const thetaEnd = Math.min(thetaStart + thetaLength, 3.141592653589793)
  if (slot === 2) {
    for (let iy = 0; iy < safeHeightSegments; iy++) {
      for (let ix = 0; ix < safeWidthSegments; ix++) {
        const row = safeWidthSegments + 1
        const a = iy * row + ix + 1
        const b = iy * row + ix
        const c = (iy + 1) * row + ix
        const d = (iy + 1) * row + ix + 1
        if (iy !== 0 || thetaStart > 0) values.push(a, b, d)
        if (iy !== safeHeightSegments - 1 || thetaEnd < 3.141592653589793) values.push(b, c, d)
      }
    }
    return values
  }
  for (let iy = 0; iy <= safeHeightSegments; iy++) {
    const v = iy / safeHeightSegments
    const theta = thetaStart + v * thetaLength
    const y = safeRadius * Math.cos(theta)
    const ringRadius = Math.sqrt(Math.max(0, safeRadius * safeRadius - y * y))
    for (let ix = 0; ix <= safeWidthSegments; ix++) {
      const u = ix / safeWidthSegments
      const phi = phiStart + u * Math.max(phiLength, 0.0001)
      const x = -ringRadius * Math.cos(phi)
      const z = ringRadius * Math.sin(phi)
      if (slot === 0) values.push(x, y, z)
      else {
        const nx = normalizeComponentX(x, y, z)
        const ny = normalizeComponentY(x, y, z)
        const nz = normalizeComponentZ(x, y, z)
        values.push(nx, ny, nz)
      }
    }
  }
  return values
}

export function createBufferColorValues(
  materialCode: number,
  materialColor: number,
  normals: f32[],
  vertexCount: number,
  ambientLightColor: number,
  ambientLightIntensity: number,
  directionalLightColor: number,
  directionalLightIntensity: number,
  directionalLightX: number,
  directionalLightY: number,
  directionalLightZ: number,
): f32[] {
  const values: f32[] = []
  appendBufferColorValues(
    values,
    materialCode,
    materialColor,
    normals,
    vertexCount,
    ambientLightColor,
    ambientLightIntensity,
    directionalLightColor,
    directionalLightIntensity,
    directionalLightX,
    directionalLightY,
    directionalLightZ,
  )
  return values
}

function appendBufferColorValues(
  values: f32[],
  materialCode: number,
  materialColor: number,
  normals: f32[],
  vertexCount: number,
  ambientLightColor: number,
  ambientLightIntensity: number,
  directionalLightColor: number,
  directionalLightIntensity: number,
  directionalLightX: number,
  directionalLightY: number,
  directionalLightZ: number,
): void {
  if (materialCode === 2) {
    for (let base = 0; base < normals.length; base += 3) {
      values.push(
        normals[base] * 0.5 + 0.5,
        normals[base + 1] * 0.5 + 0.5,
        normals[base + 2] * 0.5 + 0.5,
      )
    }
    return
  }
  const red = Math.floor(materialColor / 65536) % 256 / 255
  const green = Math.floor(materialColor / 256) % 256 / 255
  const blue = Math.floor(materialColor) % 256 / 255
  if (materialCode === 3) {
    appendLitBufferColorValues(
      values,
      red,
      green,
      blue,
      normals,
      vertexCount,
      ambientLightColor,
      ambientLightIntensity,
      directionalLightColor,
      directionalLightIntensity,
      directionalLightX,
      directionalLightY,
      directionalLightZ,
    )
    return
  }
  for (let i = 0; i < vertexCount; i++) {
    values.push(red, green, blue)
  }
}

function appendLitBufferColorValues(
  values: f32[],
  materialRed: number,
  materialGreen: number,
  materialBlue: number,
  normals: f32[],
  vertexCount: number,
  ambientLightColor: number,
  ambientLightIntensity: number,
  directionalLightColor: number,
  directionalLightIntensity: number,
  directionalLightX: number,
  directionalLightY: number,
  directionalLightZ: number,
): void {
  const ambientRed = Math.floor(ambientLightColor / 65536) % 256 / 255
  const ambientGreen = Math.floor(ambientLightColor / 256) % 256 / 255
  const ambientBlue = Math.floor(ambientLightColor) % 256 / 255
  const directionalRed = Math.floor(directionalLightColor / 65536) % 256 / 255
  const directionalGreen = Math.floor(directionalLightColor / 256) % 256 / 255
  const directionalBlue = Math.floor(directionalLightColor) % 256 / 255
  const directionLength = Math.sqrt(
    directionalLightX * directionalLightX +
    directionalLightY * directionalLightY +
    directionalLightZ * directionalLightZ,
  )
  const safeDirectionLength = directionLength > 0.0001 ? directionLength : 1
  const lightX = directionalLightX / safeDirectionLength
  const lightY = directionalLightY / safeDirectionLength
  const lightZ = directionalLightZ / safeDirectionLength
  for (let base = 0; base < normals.length; base += 3) {
    const normalX = normals[base]
    const normalY = normals[base + 1]
    const normalZ = normals[base + 2]
    const lightAmount = Math.max(0, normalX * lightX + normalY * lightY + normalZ * lightZ)
    values.push(
      clampColorComponent(materialRed * (ambientRed * ambientLightIntensity + directionalRed * directionalLightIntensity * lightAmount)),
      clampColorComponent(materialGreen * (ambientGreen * ambientLightIntensity + directionalGreen * directionalLightIntensity * lightAmount)),
      clampColorComponent(materialBlue * (ambientBlue * ambientLightIntensity + directionalBlue * directionalLightIntensity * lightAmount)),
    )
  }
}

function clampColorComponent(value: number): number {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

export function createThreeBufferScenePayload(
  demoCode: number,
  geometryCode: number,
  materialCode: number,
  materialColor: number,
  backgroundColor: number,
  cameraFov: number,
  cameraAspect: number,
  cameraNear: number,
  cameraFar: number,
  cameraPositionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  ambientLightColor: number = 0xffffff,
  ambientLightIntensity: number = 1,
  directionalLightColor: number = 0xffffff,
  directionalLightIntensity: number = 0,
  directionalLightX: number = 0,
  directionalLightY: number = 0,
  directionalLightZ: number = 1,
  cameraPositionX: number = 0,
  cameraPositionY: number = 0,
  cameraLookAtX: number = 0,
  cameraLookAtY: number = 0,
  cameraLookAtZ: number = 0,
): ThreeBufferSceneElement {
  const geometry = createThreeGeometryBuffer(
    geometryCode,
    parameter0,
    parameter1,
    parameter2,
    parameter3,
    parameter4,
    parameter5,
  )
  const transformedGeometry = createTransformedGeometryBuffer(
    geometry,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
  const colors = createBufferColorValues(
    materialCode,
    materialColor,
    transformedGeometry.normals,
    transformedGeometry.positions.length / 3,
    ambientLightColor,
    ambientLightIntensity,
    directionalLightColor,
    directionalLightIntensity,
    directionalLightX,
    directionalLightY,
    directionalLightZ,
  )
  return createBufferSceneElement(
    demoCode,
    materialCode,
    materialColor,
    backgroundColor,
    cameraFov,
    cameraAspect,
    cameraNear,
    cameraFar,
    cameraPositionX,
    cameraPositionY,
    cameraPositionZ,
    cameraLookAtX,
    cameraLookAtY,
    cameraLookAtZ,
    rotationZ,
    ambientLightColor,
    ambientLightIntensity,
    directionalLightColor,
    directionalLightIntensity,
    directionalLightX,
    directionalLightY,
    directionalLightZ,
    transformedGeometry.positions,
    transformedGeometry.normals,
    transformedGeometry.indices,
    colors,
  )
}

function createBufferSceneElement(
  demoCode: number,
  materialCode: number,
  materialColor: number,
  backgroundColor: number,
  cameraFov: number,
  cameraAspect: number,
  cameraNear: number,
  cameraFar: number,
  cameraX: number,
  cameraY: number,
  cameraZ: number,
  cameraLookAtX: number,
  cameraLookAtY: number,
  cameraLookAtZ: number,
  rotationZ: number,
  ambientLightColor: number,
  ambientLightIntensity: number,
  directionalLightColor: number,
  directionalLightIntensity: number,
  directionalLightX: number,
  directionalLightY: number,
  directionalLightZ: number,
  positions: f32[],
  normals: f32[],
  indices: f32[],
  colors: f32[],
): ThreeBufferSceneElement {
  const scene = new ThreeBufferSceneElement()
  scene.demoCode = demoCode
  scene.materialCode = materialCode
  scene.materialColor = materialColor
  scene.backgroundColor = backgroundColor
  scene.cameraFov = cameraFov
  scene.cameraAspect = cameraAspect
  scene.cameraNear = cameraNear
  scene.cameraFar = cameraFar
  scene.cameraX = cameraX
  scene.cameraY = cameraY
  scene.cameraZ = cameraZ
  scene.cameraLookAtX = cameraLookAtX
  scene.cameraLookAtY = cameraLookAtY
  scene.cameraLookAtZ = cameraLookAtZ
  scene.rotationZ = rotationZ
  scene.ambientLightColor = ambientLightColor
  scene.ambientLightIntensity = ambientLightIntensity
  scene.directionalLightColor = directionalLightColor
  scene.directionalLightIntensity = directionalLightIntensity
  scene.directionalLightX = directionalLightX
  scene.directionalLightY = directionalLightY
  scene.directionalLightZ = directionalLightZ
  scene.positions = positions
  scene.normals = normals
  scene.indices = indices
  scene.colors = colors
  return scene
}

function createTransformedGeometryBuffer(
  geometry: ThreeGeometryBuffer,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
): ThreeGeometryBuffer {
  const positions: f32[] = []
  const normals: f32[] = []
  const cosX = Math.cos(rotationX)
  const sinX = Math.sin(rotationX)
  const cosY = Math.cos(rotationY)
  const sinY = Math.sin(rotationY)
  const cosZ = Math.cos(rotationZ)
  const sinZ = Math.sin(rotationZ)

  for (let i = 0; i < geometry.positions.length; i += 3) {
    const x = geometry.positions[i] * scaleX
    const y = geometry.positions[i + 1] * scaleY
    const z = geometry.positions[i + 2] * scaleZ
    const y1 = y * cosX - z * sinX
    const z1 = y * sinX + z * cosX
    const x2 = x * cosY + z1 * sinY
    const z2 = z1 * cosY - x * sinY
    const x3 = x2 * cosZ - y1 * sinZ
    const y3 = x2 * sinZ + y1 * cosZ
    positions.push(x3 + positionX, y3 + positionY, z2 + positionZ)
  }

  const normalScaleX = scaleX > 0.0001 || scaleX < -0.0001 ? scaleX : 1
  const normalScaleY = scaleY > 0.0001 || scaleY < -0.0001 ? scaleY : 1
  const normalScaleZ = scaleZ > 0.0001 || scaleZ < -0.0001 ? scaleZ : 1
  for (let i = 0; i < geometry.normals.length; i += 3) {
    const nx = geometry.normals[i] / normalScaleX
    const ny = geometry.normals[i + 1] / normalScaleY
    const nz = geometry.normals[i + 2] / normalScaleZ
    const length = Math.sqrt(nx * nx + ny * ny + nz * nz)
    const safeLength = length > 0.0001 ? length : 1
    const x = nx / safeLength
    const y = ny / safeLength
    const z = nz / safeLength
    const y1 = y * cosX - z * sinX
    const z1 = y * sinX + z * cosX
    const x2 = x * cosY + z1 * sinY
    const z2 = z1 * cosY - x * sinY
    const x3 = x2 * cosZ - y1 * sinZ
    const y3 = x2 * sinZ + y1 * cosZ
    normals.push(x3, y3, z2)
  }

  return createGeometryBuffer(positions, normals, geometry.indices)
}

function createPlaneBufferScenePayload(
  demoCode: number,
  materialCode: number,
  materialColor: number,
  backgroundColor: number,
  cameraFov: number,
  cameraAspect: number,
  cameraNear: number,
  cameraFar: number,
  cameraZ: number,
  rotationZ: number,
  width: number,
  height: number,
  widthSegments: number,
  heightSegments: number,
  ambientLightColor: number = 0xffffff,
  ambientLightIntensity: number = 1,
  directionalLightColor: number = 0xffffff,
  directionalLightIntensity: number = 0,
  directionalLightX: number = 0,
  directionalLightY: number = 0,
  directionalLightZ: number = 1,
): ThreeBufferSceneElement {
  const geometry = createPlaneBuffer(width, height, widthSegments, heightSegments)
  const colors = createBufferColorValues(
    materialCode,
    materialColor,
    geometry.normals,
    geometry.positions.length / 3,
    ambientLightColor,
    ambientLightIntensity,
    directionalLightColor,
    directionalLightIntensity,
    directionalLightX,
    directionalLightY,
    directionalLightZ,
  )
  return {
    demoCode,
    materialCode,
    materialColor,
    backgroundColor,
    cameraFov,
    cameraAspect,
    cameraNear,
    cameraFar,
    cameraX: 0,
    cameraY: 0,
    cameraZ,
    cameraLookAtX: 0,
    cameraLookAtY: 0,
    cameraLookAtZ: 0,
    rotationZ,
    ambientLightColor,
    ambientLightIntensity,
    directionalLightColor,
    directionalLightIntensity,
    directionalLightX,
    directionalLightY,
    directionalLightZ,
    positions: geometry.positions,
    normals: geometry.normals,
    indices: geometry.indices,
    colors,
  }
}

function createTorusBufferScenePayload(
  demoCode: number,
  materialCode: number,
  materialColor: number,
  backgroundColor: number,
  cameraFov: number,
  cameraAspect: number,
  cameraNear: number,
  cameraFar: number,
  cameraZ: number,
  rotationZ: number,
  radius: number,
  tube: number,
  radialSegments: number,
  tubularSegments: number,
  arc: number,
  thetaStart: number,
  ambientLightColor: number = 0xffffff,
  ambientLightIntensity: number = 1,
  directionalLightColor: number = 0xffffff,
  directionalLightIntensity: number = 0,
  directionalLightX: number = 0,
  directionalLightY: number = 0,
  directionalLightZ: number = 1,
): ThreeBufferSceneElement {
  const geometry = createTorusBuffer(radius, tube, radialSegments, tubularSegments, arc, thetaStart)
  const colors = createBufferColorValues(
    materialCode,
    materialColor,
    geometry.normals,
    geometry.positions.length / 3,
    ambientLightColor,
    ambientLightIntensity,
    directionalLightColor,
    directionalLightIntensity,
    directionalLightX,
    directionalLightY,
    directionalLightZ,
  )
  return {
    demoCode,
    materialCode,
    materialColor,
    backgroundColor,
    cameraFov,
    cameraAspect,
    cameraNear,
    cameraFar,
    cameraX: 0,
    cameraY: 0,
    cameraZ,
    cameraLookAtX: 0,
    cameraLookAtY: 0,
    cameraLookAtZ: 0,
    rotationZ,
    ambientLightColor,
    ambientLightIntensity,
    directionalLightColor,
    directionalLightIntensity,
    directionalLightX,
    directionalLightY,
    directionalLightZ,
    positions: geometry.positions,
    normals: geometry.normals,
    indices: geometry.indices,
    colors,
  }
}

function createCylinderBufferScenePayload(
  demoCode: number,
  materialCode: number,
  materialColor: number,
  backgroundColor: number,
  cameraFov: number,
  cameraAspect: number,
  cameraNear: number,
  cameraFar: number,
  cameraZ: number,
  rotationZ: number,
  radiusTop: number,
  radiusBottom: number,
  height: number,
  radialSegments: number,
  heightSegments: number,
  openEnded: number,
  ambientLightColor: number = 0xffffff,
  ambientLightIntensity: number = 1,
  directionalLightColor: number = 0xffffff,
  directionalLightIntensity: number = 0,
  directionalLightX: number = 0,
  directionalLightY: number = 0,
  directionalLightZ: number = 1,
): ThreeBufferSceneElement {
  const geometry = createCylinderBuffer(radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded)
  const colors = createBufferColorValues(
    materialCode,
    materialColor,
    geometry.normals,
    geometry.positions.length / 3,
    ambientLightColor,
    ambientLightIntensity,
    directionalLightColor,
    directionalLightIntensity,
    directionalLightX,
    directionalLightY,
    directionalLightZ,
  )
  return {
    demoCode,
    materialCode,
    materialColor,
    backgroundColor,
    cameraFov,
    cameraAspect,
    cameraNear,
    cameraFar,
    cameraX: 0,
    cameraY: 0,
    cameraZ,
    cameraLookAtX: 0,
    cameraLookAtY: 0,
    cameraLookAtZ: 0,
    rotationZ,
    ambientLightColor,
    ambientLightIntensity,
    directionalLightColor,
    directionalLightIntensity,
    directionalLightX,
    directionalLightY,
    directionalLightZ,
    positions: geometry.positions,
    normals: geometry.normals,
    indices: geometry.indices,
    colors,
  }
}

function createRingBufferScenePayload(
  demoCode: number,
  materialCode: number,
  materialColor: number,
  backgroundColor: number,
  cameraFov: number,
  cameraAspect: number,
  cameraNear: number,
  cameraFar: number,
  cameraZ: number,
  rotationZ: number,
  innerRadius: number,
  outerRadius: number,
  thetaSegments: number,
  phiSegments: number,
  thetaStart: number,
  thetaLength: number,
  ambientLightColor: number = 0xffffff,
  ambientLightIntensity: number = 1,
  directionalLightColor: number = 0xffffff,
  directionalLightIntensity: number = 0,
  directionalLightX: number = 0,
  directionalLightY: number = 0,
  directionalLightZ: number = 1,
): ThreeBufferSceneElement {
  const geometry = createRingBuffer(innerRadius, outerRadius, thetaSegments, phiSegments, thetaStart, thetaLength)
  const colors = createBufferColorValues(
    materialCode,
    materialColor,
    geometry.normals,
    geometry.positions.length / 3,
    ambientLightColor,
    ambientLightIntensity,
    directionalLightColor,
    directionalLightIntensity,
    directionalLightX,
    directionalLightY,
    directionalLightZ,
  )
  return {
    demoCode,
    materialCode,
    materialColor,
    backgroundColor,
    cameraFov,
    cameraAspect,
    cameraNear,
    cameraFar,
    cameraX: 0,
    cameraY: 0,
    cameraZ,
    cameraLookAtX: 0,
    cameraLookAtY: 0,
    cameraLookAtZ: 0,
    rotationZ,
    ambientLightColor,
    ambientLightIntensity,
    directionalLightColor,
    directionalLightIntensity,
    directionalLightX,
    directionalLightY,
    directionalLightZ,
    positions: geometry.positions,
    normals: geometry.normals,
    indices: geometry.indices,
    colors,
  }
}

function createBoxBufferScenePayload(
  demoCode: number,
  materialCode: number,
  materialColor: number,
  backgroundColor: number,
  cameraFov: number,
  cameraAspect: number,
  cameraNear: number,
  cameraFar: number,
  cameraZ: number,
  rotationZ: number,
  width: number,
  height: number,
  depth: number,
  ambientLightColor: number = 0xffffff,
  ambientLightIntensity: number = 1,
  directionalLightColor: number = 0xffffff,
  directionalLightIntensity: number = 0,
  directionalLightX: number = 0,
  directionalLightY: number = 0,
  directionalLightZ: number = 1,
): ThreeBufferSceneElement {
  const positions: f32[] = []
  const normals: f32[] = []
  const indices: f32[] = []
  const sx = Math.max(width, 0.01) * 0.5
  const sy = Math.max(height, 0.01) * 0.5
  const sz = Math.max(depth, 0.01) * 0.5

  positions.push(-sx, -sy, sz, sx, -sy, sz, sx, sy, sz, -sx, sy, sz)
  normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1)
  positions.push(sx, -sy, -sz, -sx, -sy, -sz, -sx, sy, -sz, sx, sy, -sz)
  normals.push(0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1)
  positions.push(sx, -sy, sz, sx, -sy, -sz, sx, sy, -sz, sx, sy, sz)
  normals.push(1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0)
  positions.push(-sx, -sy, -sz, -sx, -sy, sz, -sx, sy, sz, -sx, sy, -sz)
  normals.push(-1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0)
  positions.push(-sx, sy, sz, sx, sy, sz, sx, sy, -sz, -sx, sy, -sz)
  normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0)
  positions.push(-sx, -sy, -sz, sx, -sy, -sz, sx, -sy, sz, -sx, -sy, sz)
  normals.push(0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0)

  indices.push(0, 1, 2, 0, 2, 3)
  indices.push(4, 5, 6, 4, 6, 7)
  indices.push(8, 9, 10, 8, 10, 11)
  indices.push(12, 13, 14, 12, 14, 15)
  indices.push(16, 17, 18, 16, 18, 19)
  indices.push(20, 21, 22, 20, 22, 23)
  const colors = createBufferColorValues(
    materialCode,
    materialColor,
    normals,
    positions.length / 3,
    ambientLightColor,
    ambientLightIntensity,
    directionalLightColor,
    directionalLightIntensity,
    directionalLightX,
    directionalLightY,
    directionalLightZ,
  )
  return {
    demoCode,
    materialCode,
    materialColor,
    backgroundColor,
    cameraFov,
    cameraAspect,
    cameraNear,
    cameraFar,
    cameraX: 0,
    cameraY: 0,
    cameraZ,
    cameraLookAtX: 0,
    cameraLookAtY: 0,
    cameraLookAtZ: 0,
    rotationZ,
    ambientLightColor,
    ambientLightIntensity,
    directionalLightColor,
    directionalLightIntensity,
    directionalLightX,
    directionalLightY,
    directionalLightZ,
    positions,
    normals,
    indices,
    colors,
  }
}

function createTorusKnotBufferScenePayload(
  demoCode: number,
  materialCode: number,
  materialColor: number,
  backgroundColor: number,
  cameraFov: number,
  cameraAspect: number,
  cameraNear: number,
  cameraFar: number,
  cameraZ: number,
  rotationZ: number,
  radius: number,
  tube: number,
  tubularSegments: number,
  radialSegments: number,
  p: number,
  q: number,
  ambientLightColor: number = 0xffffff,
  ambientLightIntensity: number = 1,
  directionalLightColor: number = 0xffffff,
  directionalLightIntensity: number = 0,
  directionalLightX: number = 0,
  directionalLightY: number = 0,
  directionalLightZ: number = 1,
): ThreeBufferSceneElement {
  const positions: f32[] = []
  const normals: f32[] = []
  const indices: f32[] = []
  const safeRadius = Math.max(radius, 0.01)
  const safeTube = Math.max(tube, 0.01)
  const safeTubularSegments = Math.max(8, Math.min(192, Math.floor(tubularSegments)))
  const safeRadialSegments = Math.max(3, Math.min(32, Math.floor(radialSegments)))
  const safeP = Math.max(p, 1)
  const safeQ = Math.max(q, 1)
  const twoPi = 6.283185307179586
  for (let i = 0; i < safeTubularSegments; i++) {
    const u0 = twoPi * i / safeTubularSegments
    const u1 = twoPi * (i + 1) / safeTubularSegments
    for (let j = 0; j < safeRadialSegments; j++) {
      const v0 = twoPi * j / safeRadialSegments
      const v1 = twoPi * (j + 1) / safeRadialSegments
      const a = positions.length / 3
      const cxa = knotCenterX(u0, safeRadius, safeP, safeQ)
      const cya = knotCenterY(u0, safeRadius, safeP, safeQ)
      const cza = knotCenterZ(u0, safeQ)
      const rxa = normalizeComponentX(Math.cos(safeP * u0), Math.sin(safeP * u0), 0)
      const rya = normalizeComponentY(Math.cos(safeP * u0), Math.sin(safeP * u0), 0)
      const ax = cxa + safeTube * rxa * Math.cos(v0)
      const ay = cya + safeTube * rya * Math.cos(v0)
      const az = cza + safeTube * Math.sin(v0)
      positions.push(ax, ay, az)
      normals.push(normalizeComponentX(ax - cxa, ay - cya, az - cza), normalizeComponentY(ax - cxa, ay - cya, az - cza), normalizeComponentZ(ax - cxa, ay - cya, az - cza))

      const b = positions.length / 3
      const cxb = knotCenterX(u1, safeRadius, safeP, safeQ)
      const cyb = knotCenterY(u1, safeRadius, safeP, safeQ)
      const czb = knotCenterZ(u1, safeQ)
      const rxb = normalizeComponentX(Math.cos(safeP * u1), Math.sin(safeP * u1), 0)
      const ryb = normalizeComponentY(Math.cos(safeP * u1), Math.sin(safeP * u1), 0)
      const bx = cxb + safeTube * rxb * Math.cos(v0)
      const by = cyb + safeTube * ryb * Math.cos(v0)
      const bz = czb + safeTube * Math.sin(v0)
      positions.push(bx, by, bz)
      normals.push(normalizeComponentX(bx - cxb, by - cyb, bz - czb), normalizeComponentY(bx - cxb, by - cyb, bz - czb), normalizeComponentZ(bx - cxb, by - cyb, bz - czb))

      const c = positions.length / 3
      const cx = cxb + safeTube * rxb * Math.cos(v1)
      const cy = cyb + safeTube * ryb * Math.cos(v1)
      const cz = czb + safeTube * Math.sin(v1)
      positions.push(cx, cy, cz)
      normals.push(normalizeComponentX(cx - cxb, cy - cyb, cz - czb), normalizeComponentY(cx - cxb, cy - cyb, cz - czb), normalizeComponentZ(cx - cxb, cy - cyb, cz - czb))

      const d = positions.length / 3
      const dx = cxa + safeTube * rxa * Math.cos(v1)
      const dy = cya + safeTube * rya * Math.cos(v1)
      const dz = cza + safeTube * Math.sin(v1)
      positions.push(dx, dy, dz)
      normals.push(normalizeComponentX(dx - cxa, dy - cya, dz - cza), normalizeComponentY(dx - cxa, dy - cya, dz - cza), normalizeComponentZ(dx - cxa, dy - cya, dz - cza))
      indices.push(a, b, c, a, c, d)
    }
  }
  const colors = createBufferColorValues(
    materialCode,
    materialColor,
    normals,
    positions.length / 3,
    ambientLightColor,
    ambientLightIntensity,
    directionalLightColor,
    directionalLightIntensity,
    directionalLightX,
    directionalLightY,
    directionalLightZ,
  )
  return {
    demoCode,
    materialCode,
    materialColor,
    backgroundColor,
    cameraFov,
    cameraAspect,
    cameraNear,
    cameraFar,
    cameraX: 0,
    cameraY: 0,
    cameraZ,
    cameraLookAtX: 0,
    cameraLookAtY: 0,
    cameraLookAtZ: 0,
    rotationZ,
    ambientLightColor,
    ambientLightIntensity,
    directionalLightColor,
    directionalLightIntensity,
    directionalLightX,
    directionalLightY,
    directionalLightZ,
    positions,
    normals,
    indices,
    colors,
  }
}

function createSphereBufferScenePayload(
  demoCode: number,
  materialCode: number,
  materialColor: number,
  backgroundColor: number,
  cameraFov: number,
  cameraAspect: number,
  cameraNear: number,
  cameraFar: number,
  cameraZ: number,
  rotationZ: number,
  radius: number,
  widthSegments: number,
  heightSegments: number,
  phiStart: number,
  phiLength: number,
  thetaStart: number,
  ambientLightColor: number = 0xffffff,
  ambientLightIntensity: number = 1,
  directionalLightColor: number = 0xffffff,
  directionalLightIntensity: number = 0,
  directionalLightX: number = 0,
  directionalLightY: number = 0,
  directionalLightZ: number = 1,
): ThreeBufferSceneElement {
  const positions: f32[] = []
  const normals: f32[] = []
  const indices: f32[] = []
  const safeRadius = Math.max(radius, 0.01)
  const safeWidthSegments = Math.max(3, Math.floor(widthSegments))
  const safeHeightSegments = Math.max(2, Math.floor(heightSegments))
  const thetaLength = 3.141592653589793
  const thetaEnd = Math.min(thetaStart + thetaLength, 3.141592653589793)
  for (let iy = 0; iy <= safeHeightSegments; iy++) {
    const v = iy / safeHeightSegments
    const theta = thetaStart + v * thetaLength
    const y = safeRadius * Math.cos(theta)
    const ringRadius = Math.sqrt(Math.max(0, safeRadius * safeRadius - y * y))
    for (let ix = 0; ix <= safeWidthSegments; ix++) {
      const u = ix / safeWidthSegments
      const phi = phiStart + u * Math.max(phiLength, 0.0001)
      const x = -ringRadius * Math.cos(phi)
      const z = ringRadius * Math.sin(phi)
      positions.push(x, y, z)
      normals.push(normalizeComponentX(x, y, z), normalizeComponentY(x, y, z), normalizeComponentZ(x, y, z))
    }
  }
  for (let iy = 0; iy < safeHeightSegments; iy++) {
    for (let ix = 0; ix < safeWidthSegments; ix++) {
      const row = safeWidthSegments + 1
      const a = iy * row + ix + 1
      const b = iy * row + ix
      const c = (iy + 1) * row + ix
      const d = (iy + 1) * row + ix + 1
      if (iy !== 0 || thetaStart > 0) indices.push(a, b, d)
      if (iy !== safeHeightSegments - 1 || thetaEnd < 3.141592653589793) indices.push(b, c, d)
    }
  }
  const colors = createBufferColorValues(
    materialCode,
    materialColor,
    normals,
    positions.length / 3,
    ambientLightColor,
    ambientLightIntensity,
    directionalLightColor,
    directionalLightIntensity,
    directionalLightX,
    directionalLightY,
    directionalLightZ,
  )
  return {
    demoCode,
    materialCode,
    materialColor,
    backgroundColor,
    cameraFov,
    cameraAspect,
    cameraNear,
    cameraFar,
    cameraX: 0,
    cameraY: 0,
    cameraZ,
    cameraLookAtX: 0,
    cameraLookAtY: 0,
    cameraLookAtZ: 0,
    rotationZ,
    ambientLightColor,
    ambientLightIntensity,
    directionalLightColor,
    directionalLightIntensity,
    directionalLightX,
    directionalLightY,
    directionalLightZ,
    positions,
    normals,
    indices,
    colors,
  }
}

function createThreeGeometryBuffer(
  geometryCode: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): ThreeGeometryBuffer {
  if (geometryCode === 2) {
    return createTorusKnotBuffer(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5)
  }
  if (geometryCode === 3) {
    return createSphereBuffer(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5)
  }
  if (geometryCode === 4) {
    return createPlaneBuffer(parameter0, parameter1, parameter2, parameter3)
  }
  if (geometryCode === 5) {
    return createTorusBuffer(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5)
  }
  if (geometryCode === 6) {
    return createCylinderBuffer(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5)
  }
  if (geometryCode === 7) {
    return createRingBuffer(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5)
  }
  if (geometryCode === 8) {
    return createCircleBuffer(parameter0, parameter1, parameter2, parameter3)
  }
  return createBoxBuffer(parameter0, parameter1, parameter2)
}

function createCircleBuffer(
  radius: number,
  segments: number,
  thetaStart: number,
  thetaLength: number,
): ThreeGeometryBuffer {
  const positions: f32[] = []
  const normals: f32[] = []
  const indices: f32[] = []
  const safeRadius = Math.max(radius, 0.01)
  const safeSegments = Math.max(3, Math.min(192, Math.floor(segments)))
  const safeThetaLength = Math.max(0.0001, Math.min(6.283185307179586, thetaLength))

  positions.push(0, 0, 0)
  normals.push(0, 0, 1)

  for (let s = 0; s <= safeSegments; s++) {
    const segment = thetaStart + s / safeSegments * safeThetaLength
    positions.push(safeRadius * Math.cos(segment), safeRadius * Math.sin(segment), 0)
    normals.push(0, 0, 1)
  }

  for (let i = 1; i <= safeSegments; i++) {
    indices.push(i, i + 1, 0)
  }

  return createGeometryBuffer(positions, normals, indices)
}

function createRingBuffer(
  innerRadius: number,
  outerRadius: number,
  thetaSegments: number,
  phiSegments: number,
  thetaStart: number,
  thetaLength: number,
): ThreeGeometryBuffer {
  const positions: f32[] = []
  const normals: f32[] = []
  const indices: f32[] = []
  const safeInnerRadius = Math.max(innerRadius, 0)
  const safeOuterRadius = Math.max(outerRadius, safeInnerRadius + 0.01)
  const safeThetaSegments = Math.max(3, Math.min(192, Math.floor(thetaSegments)))
  const safePhiSegments = Math.max(1, Math.min(32, Math.floor(phiSegments)))
  const safeThetaLength = Math.max(0.0001, Math.min(6.283185307179586, thetaLength))
  const radiusStep = (safeOuterRadius - safeInnerRadius) / safePhiSegments

  for (let j = 0; j <= safePhiSegments; j++) {
    const radius = safeInnerRadius + radiusStep * j
    for (let i = 0; i <= safeThetaSegments; i++) {
      const segment = thetaStart + i / safeThetaSegments * safeThetaLength
      positions.push(radius * Math.cos(segment), radius * Math.sin(segment), 0)
      normals.push(0, 0, 1)
    }
  }

  for (let j = 0; j < safePhiSegments; j++) {
    const thetaSegmentLevel = j * (safeThetaSegments + 1)
    for (let i = 0; i < safeThetaSegments; i++) {
      const segment = i + thetaSegmentLevel
      const a = segment
      const b = segment + safeThetaSegments + 1
      const c = segment + safeThetaSegments + 2
      const d = segment + 1
      indices.push(a, b, d, b, c, d)
    }
  }

  return createGeometryBuffer(positions, normals, indices)
}

function createCylinderBuffer(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  radialSegments: number,
  heightSegments: number,
  openEnded: number,
): ThreeGeometryBuffer {
  const positions: f32[] = []
  const normals: f32[] = []
  const indices: f32[] = []
  const safeRadiusTop = Math.max(radiusTop, 0)
  const safeRadiusBottom = Math.max(radiusBottom, 0)
  const safeHeight = Math.max(height, 0.01)
  const safeRadialSegments = Math.max(3, Math.min(96, Math.floor(radialSegments)))
  const safeHeightSegments = Math.max(1, Math.min(64, Math.floor(heightSegments)))
  const halfHeight = safeHeight * 0.5
  const slope = (safeRadiusBottom - safeRadiusTop) / safeHeight
  const twoPi = 6.283185307179586

  for (let y = 0; y <= safeHeightSegments; y++) {
    const v = y / safeHeightSegments
    const radius = v * (safeRadiusBottom - safeRadiusTop) + safeRadiusTop
    const py = -v * safeHeight + halfHeight
    for (let x = 0; x <= safeRadialSegments; x++) {
      const u = x / safeRadialSegments
      const theta = u * twoPi
      const sinTheta = Math.sin(theta)
      const cosTheta = Math.cos(theta)
      positions.push(radius * sinTheta, py, radius * cosTheta)
      normals.push(
        normalizeComponentX(sinTheta, slope, cosTheta),
        normalizeComponentY(sinTheta, slope, cosTheta),
        normalizeComponentZ(sinTheta, slope, cosTheta),
      )
    }
  }

  const row = safeRadialSegments + 1
  for (let x = 0; x < safeRadialSegments; x++) {
    for (let y = 0; y < safeHeightSegments; y++) {
      const a = row * y + x
      const b = row * (y + 1) + x
      const c = row * (y + 1) + x + 1
      const d = row * y + x + 1
      if (safeRadiusTop > 0 || y !== 0) indices.push(a, b, d)
      if (safeRadiusBottom > 0 || y !== safeHeightSegments - 1) indices.push(b, c, d)
    }
  }

  if (openEnded < 0.5) {
    if (safeRadiusTop > 0) appendCylinderCap(positions, normals, indices, safeRadiusTop, halfHeight, safeRadialSegments, 1)
    if (safeRadiusBottom > 0) appendCylinderCap(positions, normals, indices, safeRadiusBottom, -halfHeight, safeRadialSegments, -1)
  }

  return createGeometryBuffer(positions, normals, indices)
}

function appendCylinderCap(
  positions: f32[],
  normals: f32[],
  indices: f32[],
  radius: number,
  y: number,
  radialSegments: number,
  sign: number,
): void {
  const twoPi = 6.283185307179586
  const centerIndexStart = positions.length / 3
  for (let x = 0; x < radialSegments; x++) {
    positions.push(0, y, 0)
    normals.push(0, sign, 0)
  }
  const centerIndexEnd = positions.length / 3
  for (let x = 0; x <= radialSegments; x++) {
    const theta = x / radialSegments * twoPi
    positions.push(radius * Math.sin(theta), y, radius * Math.cos(theta))
    normals.push(0, sign, 0)
  }
  for (let x = 0; x < radialSegments; x++) {
    const c = centerIndexStart + x
    const i = centerIndexEnd + x
    if (sign > 0) indices.push(i, i + 1, c)
    else indices.push(i + 1, i, c)
  }
}

function createTorusBuffer(
  radius: number,
  tube: number,
  radialSegments: number,
  tubularSegments: number,
  arc: number,
  thetaStart: number,
): ThreeGeometryBuffer {
  const positions: f32[] = []
  const normals: f32[] = []
  const indices: f32[] = []
  const safeRadius = Math.max(radius, 0.01)
  const safeTube = Math.max(tube, 0.01)
  const safeRadialSegments = Math.max(3, Math.min(64, Math.floor(radialSegments)))
  const safeTubularSegments = Math.max(3, Math.min(192, Math.floor(tubularSegments)))
  const safeArc = Math.max(0.0001, Math.min(6.283185307179586, arc))
  const thetaLength = 6.283185307179586

  for (let j = 0; j <= safeRadialSegments; j++) {
    const v = thetaStart + (j / safeRadialSegments) * thetaLength
    const cosV = Math.cos(v)
    const sinV = Math.sin(v)
    for (let i = 0; i <= safeTubularSegments; i++) {
      const u = i / safeTubularSegments * safeArc
      const cosU = Math.cos(u)
      const sinU = Math.sin(u)
      const x = (safeRadius + safeTube * cosV) * cosU
      const y = (safeRadius + safeTube * cosV) * sinU
      const z = safeTube * sinV
      const centerX = safeRadius * cosU
      const centerY = safeRadius * sinU
      positions.push(x, y, z)
      normals.push(
        normalizeComponentX(x - centerX, y - centerY, z),
        normalizeComponentY(x - centerX, y - centerY, z),
        normalizeComponentZ(x - centerX, y - centerY, z),
      )
    }
  }

  for (let j = 1; j <= safeRadialSegments; j++) {
    for (let i = 1; i <= safeTubularSegments; i++) {
      const a = (safeTubularSegments + 1) * j + i - 1
      const b = (safeTubularSegments + 1) * (j - 1) + i - 1
      const c = (safeTubularSegments + 1) * (j - 1) + i
      const d = (safeTubularSegments + 1) * j + i
      indices.push(a, b, d, b, c, d)
    }
  }

  return createGeometryBuffer(positions, normals, indices)
}

function createPlaneBuffer(
  width: number,
  height: number,
  widthSegments: number,
  heightSegments: number,
): ThreeGeometryBuffer {
  const positions: f32[] = []
  const normals: f32[] = []
  const indices: f32[] = []
  const safeWidth = Math.max(width, 0.01)
  const safeHeight = Math.max(height, 0.01)
  const safeWidthSegments = Math.max(1, Math.floor(widthSegments))
  const safeHeightSegments = Math.max(1, Math.floor(heightSegments))
  const widthHalf = safeWidth * 0.5
  const heightHalf = safeHeight * 0.5
  const segmentWidth = safeWidth / safeWidthSegments
  const segmentHeight = safeHeight / safeHeightSegments

  for (let iy = 0; iy <= safeHeightSegments; iy++) {
    const y = iy * segmentHeight - heightHalf
    for (let ix = 0; ix <= safeWidthSegments; ix++) {
      const x = ix * segmentWidth - widthHalf
      positions.push(x, -y, 0)
      normals.push(0, 0, 1)
    }
  }
  for (let iy = 0; iy < safeHeightSegments; iy++) {
    for (let ix = 0; ix < safeWidthSegments; ix++) {
      const row = safeWidthSegments + 1
      const a = ix + row * iy
      const b = ix + row * (iy + 1)
      const c = ix + 1 + row * (iy + 1)
      const d = ix + 1 + row * iy
      indices.push(a, b, d, b, c, d)
    }
  }
  return createGeometryBuffer(positions, normals, indices)
}

function createBoxBuffer(width: number, height: number, depth: number): ThreeGeometryBuffer {
  const positions: f32[] = []
  const normals: f32[] = []
  const indices: f32[] = []
  const sx = Math.max(width, 0.01) * 0.5
  const sy = Math.max(height, 0.01) * 0.5
  const sz = Math.max(depth, 0.01) * 0.5

  positions.push(-sx, -sy, sz, sx, -sy, sz, sx, sy, sz, -sx, sy, sz)
  normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1)
  positions.push(sx, -sy, -sz, -sx, -sy, -sz, -sx, sy, -sz, sx, sy, -sz)
  normals.push(0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1)
  positions.push(sx, -sy, sz, sx, -sy, -sz, sx, sy, -sz, sx, sy, sz)
  normals.push(1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0)
  positions.push(-sx, -sy, -sz, -sx, -sy, sz, -sx, sy, sz, -sx, sy, -sz)
  normals.push(-1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0)
  positions.push(-sx, sy, sz, sx, sy, sz, sx, sy, -sz, -sx, sy, -sz)
  normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0)
  positions.push(-sx, -sy, -sz, sx, -sy, -sz, sx, -sy, sz, -sx, -sy, sz)
  normals.push(0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0)

  indices.push(0, 1, 2, 0, 2, 3)
  indices.push(4, 5, 6, 4, 6, 7)
  indices.push(8, 9, 10, 8, 10, 11)
  indices.push(12, 13, 14, 12, 14, 15)
  indices.push(16, 17, 18, 16, 18, 19)
  indices.push(20, 21, 22, 20, 22, 23)
  return createGeometryBuffer(positions, normals, indices)
}

function normalizeComponentX(x: number, y: number, z: number): number {
  const length = Math.sqrt(x * x + y * y + z * z)
  let value = 0
  if (length > 0) {
    value = x / length
  }
  return value
}

function normalizeComponentY(x: number, y: number, z: number): number {
  const length = Math.sqrt(x * x + y * y + z * z)
  let value = 0
  if (length > 0) {
    value = y / length
  }
  return value
}

function normalizeComponentZ(x: number, y: number, z: number): number {
  const length = Math.sqrt(x * x + y * y + z * z)
  let value = 1
  if (length > 0) {
    value = z / length
  }
  return value
}

function knotCenterX(u: number, radius: number, p: number, q: number): number {
  const r = radius * (1 + 0.32 * Math.cos(q * u))
  let value = 0
  value = r * Math.cos(p * u)
  return value
}

function knotCenterY(u: number, radius: number, p: number, q: number): number {
  const r = radius * (1 + 0.32 * Math.cos(q * u))
  let value = 0
  value = r * Math.sin(p * u)
  return value
}

function knotCenterZ(u: number, q: number): number {
  let value = 0
  value = 0.36 * Math.sin(q * u)
  return value
}

function createTorusKnotBuffer(
  radius: number,
  tube: number,
  tubularSegments: number,
  radialSegments: number,
  p: number,
  q: number,
): ThreeGeometryBuffer {
  const positions: f32[] = []
  const normals: f32[] = []
  const indices: f32[] = []
  const safeRadius = Math.max(radius, 0.01)
  const safeTube = Math.max(tube, 0.01)
  const safeTubularSegments = Math.max(8, Math.min(192, Math.floor(tubularSegments)))
  const safeRadialSegments = Math.max(3, Math.min(32, Math.floor(radialSegments)))
  const safeP = Math.max(p, 1)
  const safeQ = Math.max(q, 1)
  const twoPi = 6.283185307179586
  for (let i = 0; i < safeTubularSegments; i++) {
    const u0 = twoPi * i / safeTubularSegments
    const u1 = twoPi * (i + 1) / safeTubularSegments
    for (let j = 0; j < safeRadialSegments; j++) {
      const v0 = twoPi * j / safeRadialSegments
      const v1 = twoPi * (j + 1) / safeRadialSegments
      const a = positions.length / 3
      const cxa = knotCenterX(u0, safeRadius, safeP, safeQ)
      const cya = knotCenterY(u0, safeRadius, safeP, safeQ)
      const cza = knotCenterZ(u0, safeQ)
      const rxa = normalizeComponentX(Math.cos(safeP * u0), Math.sin(safeP * u0), 0)
      const rya = normalizeComponentY(Math.cos(safeP * u0), Math.sin(safeP * u0), 0)
      const ax = cxa + safeTube * rxa * Math.cos(v0)
      const ay = cya + safeTube * rya * Math.cos(v0)
      const az = cza + safeTube * Math.sin(v0)
      positions.push(ax, ay, az)
      normals.push(normalizeComponentX(ax - cxa, ay - cya, az - cza), normalizeComponentY(ax - cxa, ay - cya, az - cza), normalizeComponentZ(ax - cxa, ay - cya, az - cza))

      const b = positions.length / 3
      const cxb = knotCenterX(u1, safeRadius, safeP, safeQ)
      const cyb = knotCenterY(u1, safeRadius, safeP, safeQ)
      const czb = knotCenterZ(u1, safeQ)
      const rxb = normalizeComponentX(Math.cos(safeP * u1), Math.sin(safeP * u1), 0)
      const ryb = normalizeComponentY(Math.cos(safeP * u1), Math.sin(safeP * u1), 0)
      const bx = cxb + safeTube * rxb * Math.cos(v0)
      const by = cyb + safeTube * ryb * Math.cos(v0)
      const bz = czb + safeTube * Math.sin(v0)
      positions.push(bx, by, bz)
      normals.push(normalizeComponentX(bx - cxb, by - cyb, bz - czb), normalizeComponentY(bx - cxb, by - cyb, bz - czb), normalizeComponentZ(bx - cxb, by - cyb, bz - czb))

      const c = positions.length / 3
      const cx = cxb + safeTube * rxb * Math.cos(v1)
      const cy = cyb + safeTube * ryb * Math.cos(v1)
      const cz = czb + safeTube * Math.sin(v1)
      positions.push(cx, cy, cz)
      normals.push(normalizeComponentX(cx - cxb, cy - cyb, cz - czb), normalizeComponentY(cx - cxb, cy - cyb, cz - czb), normalizeComponentZ(cx - cxb, cy - cyb, cz - czb))

      const d = positions.length / 3
      const dx = cxa + safeTube * rxa * Math.cos(v1)
      const dy = cya + safeTube * rya * Math.cos(v1)
      const dz = cza + safeTube * Math.sin(v1)
      positions.push(dx, dy, dz)
      normals.push(normalizeComponentX(dx - cxa, dy - cya, dz - cza), normalizeComponentY(dx - cxa, dy - cya, dz - cza), normalizeComponentZ(dx - cxa, dy - cya, dz - cza))
      indices.push(a, b, c, a, c, d)
    }
  }
  return createGeometryBuffer(positions, normals, indices)
}

function createSphereBuffer(
  radius: number,
  widthSegments: number,
  heightSegments: number,
  phiStart: number,
  phiLength: number,
  thetaStart: number,
): ThreeGeometryBuffer {
  const positions: f32[] = []
  const normals: f32[] = []
  const indices: f32[] = []
  const safeRadius = Math.max(radius, 0.01)
  const safeWidthSegments = Math.max(3, Math.floor(widthSegments))
  const safeHeightSegments = Math.max(2, Math.floor(heightSegments))
  const thetaLength = 3.141592653589793
  const thetaEnd = Math.min(thetaStart + thetaLength, 3.141592653589793)
  for (let iy = 0; iy <= safeHeightSegments; iy++) {
    const v = iy / safeHeightSegments
    const theta = thetaStart + v * thetaLength
    const y = safeRadius * Math.cos(theta)
    const ringRadius = Math.sqrt(Math.max(0, safeRadius * safeRadius - y * y))
    for (let ix = 0; ix <= safeWidthSegments; ix++) {
      const u = ix / safeWidthSegments
      const phi = phiStart + u * Math.max(phiLength, 0.0001)
      const x = -ringRadius * Math.cos(phi)
      const z = ringRadius * Math.sin(phi)
      positions.push(x, y, z)
      normals.push(normalizeComponentX(x, y, z), normalizeComponentY(x, y, z), normalizeComponentZ(x, y, z))
    }
  }
  for (let iy = 0; iy < safeHeightSegments; iy++) {
    for (let ix = 0; ix < safeWidthSegments; ix++) {
      const row = safeWidthSegments + 1
      const a = iy * row + ix + 1
      const b = iy * row + ix
      const c = (iy + 1) * row + ix
      const d = (iy + 1) * row + ix + 1
      if (iy !== 0 || thetaStart > 0) indices.push(a, b, d)
      if (iy !== safeHeightSegments - 1 || thetaEnd < 3.141592653589793) indices.push(b, c, d)
    }
  }
  return createGeometryBuffer(positions, normals, indices)
}

export function createBoxGeometry(
  width: number,
  height: number,
  depth: number,
  widthSegments: number,
  heightSegments: number,
  depthSegments: number,
): ThreeGeometryElement {
  const element = new ThreeGeometryElement()
  element.geometryCode = 1
  element.parameter0 = width
  element.parameter1 = height
  element.parameter2 = depth
  element.parameter3 = widthSegments
  element.parameter4 = heightSegments
  element.parameter5 = depthSegments
  return element
}

export function createCircleGeometry(
  radius: number,
  segments: number,
  thetaStart: number,
  thetaLength: number,
): ThreeGeometryElement {
  const element = new ThreeGeometryElement()
  element.geometryCode = 8
  element.parameter0 = radius
  element.parameter1 = segments
  element.parameter2 = thetaStart
  element.parameter3 = thetaLength
  element.parameter4 = 0
  element.parameter5 = 0
  return element
}

export function createPlaneGeometry(
  width: number,
  height: number,
  widthSegments: number,
  heightSegments: number,
): ThreeGeometryElement {
  const element = new ThreeGeometryElement()
  element.geometryCode = 4
  element.parameter0 = width
  element.parameter1 = height
  element.parameter2 = widthSegments
  element.parameter3 = heightSegments
  element.parameter4 = 0
  element.parameter5 = 0
  return element
}

export function createCylinderGeometry(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  radialSegments: number,
  heightSegments: number,
  openEnded: number,
): ThreeGeometryElement {
  const element = new ThreeGeometryElement()
  element.geometryCode = 6
  element.parameter0 = radiusTop
  element.parameter1 = radiusBottom
  element.parameter2 = height
  element.parameter3 = radialSegments
  element.parameter4 = heightSegments
  element.parameter5 = openEnded
  return element
}

export function createConeGeometry(
  radius: number,
  height: number,
  radialSegments: number,
  heightSegments: number,
  openEnded: number,
): ThreeGeometryElement {
  const element = new ThreeGeometryElement()
  element.geometryCode = 6
  element.parameter0 = 0
  element.parameter1 = radius
  element.parameter2 = height
  element.parameter3 = radialSegments
  element.parameter4 = heightSegments
  element.parameter5 = openEnded
  return element
}

export function createRingGeometry(
  innerRadius: number,
  outerRadius: number,
  thetaSegments: number,
  phiSegments: number,
  thetaStart: number,
  thetaLength: number,
): ThreeGeometryElement {
  const element = new ThreeGeometryElement()
  element.geometryCode = 7
  element.parameter0 = innerRadius
  element.parameter1 = outerRadius
  element.parameter2 = thetaSegments
  element.parameter3 = phiSegments
  element.parameter4 = thetaStart
  element.parameter5 = thetaLength
  return element
}

export function createTorusGeometry(
  radius: number,
  tube: number,
  radialSegments: number,
  tubularSegments: number,
  arc: number,
  thetaStart: number,
): ThreeGeometryElement {
  const element = new ThreeGeometryElement()
  element.geometryCode = 5
  element.parameter0 = radius
  element.parameter1 = tube
  element.parameter2 = radialSegments
  element.parameter3 = tubularSegments
  element.parameter4 = arc
  element.parameter5 = thetaStart
  return element
}

export function createTorusKnotGeometry(
  radius: number,
  tube: number,
  tubularSegments: number,
  radialSegments: number,
  p: number,
  q: number,
): ThreeGeometryElement {
  const element = new ThreeGeometryElement()
  element.geometryCode = 2
  element.parameter0 = radius
  element.parameter1 = tube
  element.parameter2 = tubularSegments
  element.parameter3 = radialSegments
  element.parameter4 = p
  element.parameter5 = q
  return element
}

export function createSphereGeometry(
  radius: number,
  widthSegments: number,
  heightSegments: number,
  phiStart: number,
  phiLength: number,
  thetaStart: number,
): ThreeGeometryElement {
  const element = new ThreeGeometryElement()
  element.geometryCode = 3
  element.parameter0 = radius
  element.parameter1 = widthSegments
  element.parameter2 = heightSegments
  element.parameter3 = phiStart
  element.parameter4 = phiLength
  element.parameter5 = thetaStart
  return element
}

export function createMeshBasicMaterial(color: number): ThreeMaterialElement {
  const element = new ThreeMaterialElement()
  element.materialCode = 1
  element.materialColor = color
  return element
}

export function createMeshLambertMaterial(color: number): ThreeMaterialElement {
  const element = new ThreeMaterialElement()
  element.materialCode = 4
  element.materialColor = color
  return element
}

export function createMeshPhongMaterial(color: number): ThreeMaterialElement {
  const element = new ThreeMaterialElement()
  element.materialCode = 5
  element.materialColor = color
  return element
}

export function createMeshStandardMaterial(color: number): ThreeMaterialElement {
  const element = new ThreeMaterialElement()
  element.materialCode = 3
  element.materialColor = color
  return element
}

export function createMeshNormalMaterial(): ThreeMaterialElement {
  const element = new ThreeMaterialElement()
  element.materialCode = 2
  element.materialColor = 0xffffff
  return element
}

export function createPerspectiveCamera(
  fov: number,
  aspect: number,
  near: number,
  far: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  lookAtX: number,
  lookAtY: number,
  lookAtZ: number,
): ThreeCameraElement {
  const camera = new ThreeCameraElement()
  camera.fov = fov
  camera.aspect = aspect
  camera.near = near
  camera.far = far
  camera.positionX = positionX
  camera.positionY = positionY
  camera.positionZ = positionZ
  camera.lookAtX = lookAtX
  camera.lookAtY = lookAtY
  camera.lookAtZ = lookAtZ
  return camera
}

export function createThreeMesh(
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  geometry: ThreeGeometryElement,
  material: ThreeMaterialElement,
): ThreeMeshElement {
  const mesh = new ThreeMeshElement()
  mesh.positionX = positionX
  mesh.positionY = positionY
  mesh.positionZ = positionZ
  mesh.rotationX = rotationX
  mesh.rotationY = rotationY
  mesh.rotationZ = rotationZ
  mesh.scaleX = scaleX
  mesh.scaleY = scaleY
  mesh.scaleZ = scaleZ
  mesh.geometry = geometry
  mesh.material = material
  return mesh
}

export function createThreeScene(
  demoCode: number,
  backgroundColor: number,
  camera: ThreeCameraElement,
  mesh: ThreeMeshElement,
  ambientLightColor: number = 0xffffff,
  ambientLightIntensity: number = 1,
  directionalLightColor: number = 0xffffff,
  directionalLightIntensity: number = 0,
  directionalLightX: number = 0,
  directionalLightY: number = 0,
  directionalLightZ: number = 1,
): ThreeSceneElement {
  return [
    demoCode,
    mesh.geometry.geometryCode,
    mesh.material.materialCode,
    mesh.material.materialColor,
    backgroundColor,
    camera.fov,
    camera.aspect,
    camera.near,
    camera.far,
    camera.positionZ,
    mesh.rotationX,
    mesh.rotationY,
    mesh.rotationZ,
    mesh.positionX,
    mesh.positionY,
    mesh.positionZ,
    mesh.geometry.parameter0,
    mesh.geometry.parameter1,
    mesh.geometry.parameter2,
    mesh.geometry.parameter3,
    mesh.geometry.parameter4,
    mesh.geometry.parameter5,
    mesh.scaleX,
    mesh.scaleY,
    mesh.scaleZ,
    ambientLightColor,
    ambientLightIntensity,
    directionalLightColor,
    directionalLightIntensity,
    directionalLightX,
    directionalLightY,
    directionalLightZ,
    camera.positionX,
    camera.positionY,
    camera.lookAtX,
    camera.lookAtY,
    camera.lookAtZ,
  ]
}
