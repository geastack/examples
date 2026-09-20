import {
  ThreeBufferSceneElement,
  createThreeSceneBufferValues,
  createThreeSceneColorValues,
  createThreeScenePayload,
  type ThreeSceneElement,
} from './threeJsx'
import {
  logAngleHostSmoke,
} from './angleHost'
import {
  BufferGeometry,
  Material,
  Mesh,
  Object3D,
  PerspectiveCamera,
  Scene,
} from './threeGeometryRuntime'

class ThreeNativeSceneMesh {
  readonly geometry: BufferGeometry
  readonly material: Material
  readonly positionX: number
  readonly positionY: number
  readonly positionZ: number
  readonly rotationX: number
  readonly rotationY: number
  readonly rotationZ: number
  readonly scaleX: number
  readonly scaleY: number
  readonly scaleZ: number

  constructor(
    geometry: BufferGeometry,
    material: Material,
    positionX: number,
    positionY: number,
    positionZ: number,
    rotationX: number,
    rotationY: number,
    rotationZ: number,
    scaleX: number,
    scaleY: number,
    scaleZ: number,
  ) {
    this.geometry = geometry
    this.material = material
    this.positionX = positionX
    this.positionY = positionY
    this.positionZ = positionZ
    this.rotationX = rotationX
    this.rotationY = rotationY
    this.rotationZ = rotationZ
    this.scaleX = scaleX
    this.scaleY = scaleY
    this.scaleZ = scaleZ
  }
}

/**
 * @param {number} demoCode
 * @param {number} backgroundColor
 * @param {Scene} scene
 * @param {PerspectiveCamera} camera
 * @returns {ThreeSceneElement}
 */
export function createThreeNativeScenePayload(
  demoCode: number,
  backgroundColor: number,
  scene: Scene,
  camera: PerspectiveCamera,
): ThreeSceneElement {
  const meshes = sceneMeshes(scene)
  return createThreeNativeMeshPayload(demoCode, backgroundColor, meshes[0], camera)
}

/**
 * @param {number} demoCode
 * @param {number} backgroundColor
 * @param {Scene} scene
 * @param {PerspectiveCamera} camera
 * @returns {ThreeSceneElement[]}
 */
export function createThreeNativeScenePayloads(
  demoCode: number,
  backgroundColor: number,
  scene: Scene,
  camera: PerspectiveCamera,
): ThreeSceneElement[] {
  const meshes = sceneMeshes(scene)
  const payloads: ThreeSceneElement[] = []
  for (let i = 0; i < meshes.length; i++) {
    payloads.push(createThreeNativeMeshPayload(demoCode, backgroundColor, meshes[i], camera))
  }
  return payloads
}

/**
 * @param {number} demoCode
 * @param {number} backgroundColor
 * @param {Scene} scene
 * @param {PerspectiveCamera} camera
 * @returns {ThreeBufferSceneElement}
 */
export function createThreeNativeSceneBuffer(
  demoCode: number,
  backgroundColor: number,
  scene: Scene,
  camera: PerspectiveCamera,
): ThreeBufferSceneElement {
  logAngleHostSmoke('upstream Three adapter: scanning scene')
  const positions: f32[] = []
  const normals: f32[] = []
  const indices: f32[] = []
  const colors: f32[] = []
  const materialCode = 1
  const materialColor = 0xffffff
  let meshCount = 0
  if (scene.children.length > 0) {
    meshCount += appendSceneObjectMeshBuffer(positions, normals, indices, colors, scene, 0, 0, 0, 0, 0, 0, 1, 1, 1)
  }
  if (meshCount === 0 && scene.meshes.length > 0) {
    for (let i = 0; i < scene.meshes.length; i++) {
      const mesh = scene.meshes[i]
      appendSceneMeshBuffer(positions, normals, indices, colors, mesh, mesh.position.x, mesh.position.y, mesh.position.z, mesh.rotation.x, mesh.rotation.y, mesh.rotation.z, mesh.scale.x, mesh.scale.y, mesh.scale.z)
      meshCount++
    }
  }
  if (meshCount === 0) {
    appendSceneMeshBuffer(positions, normals, indices, colors, scene.mesh, scene.mesh.position.x, scene.mesh.position.y, scene.mesh.position.z, scene.mesh.rotation.x, scene.mesh.rotation.y, scene.mesh.rotation.z, scene.mesh.scale.x, scene.mesh.scale.y, scene.mesh.scale.z)
    meshCount = 1
  }

  logAngleHostSmoke('upstream Three adapter: meshes ' + meshCount)
  logAngleHostSmoke('upstream Three adapter: buffers ' + positions.length + '/' + normals.length + '/' + indices.length)
  return createThreeNativeBuffer(
    demoCode,
    materialCode,
    materialColor,
    backgroundColor,
    camera.fov,
    camera.aspect,
    camera.near,
    camera.far,
    camera.position.z,
    positions,
    normals,
    indices,
    colors,
    camera.position.x,
    camera.position.y,
    camera.target.x,
    camera.target.y,
    camera.target.z,
  )
}

/**
 * @param {number} demoCode
 * @param {number} materialCode
 * @param {number} materialColor
 * @param {number} backgroundColor
 * @param {number} cameraFov
 * @param {number} cameraAspect
 * @param {number} cameraNear
 * @param {number} cameraFar
 * @param {number} cameraZ
 * @param {number} positionX
 * @param {number} positionY
 * @param {number} positionZ
 * @param {number} rotationX
 * @param {number} rotationY
 * @param {number} rotationZ
 * @param {number} scaleX
 * @param {number} scaleY
 * @param {number} scaleZ
 * @param {f32[]} sourcePositions
 * @param {f32[]} sourceNormals
 * @param {f32[]} sourceIndices
 * @param {number} cameraX
 * @param {number} cameraY
 * @param {number} cameraLookAtX
 * @param {number} cameraLookAtY
 * @param {number} cameraLookAtZ
 */
export function createThreeNativeMeshBuffer(
  demoCode: number,
  materialCode: number,
  materialColor: number,
  backgroundColor: number,
  cameraFov: number,
  cameraAspect: number,
  cameraNear: number,
  cameraFar: number,
  cameraZ: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  sourcePositions: f32[],
  sourceNormals: f32[],
  sourceIndices: f32[],
  cameraX: number = 0,
  cameraY: number = 0,
  cameraLookAtX: number = 0,
  cameraLookAtY: number = 0,
  cameraLookAtZ: number = 0,
): ThreeBufferSceneElement {
  /** @type {f32[]} */
  const positions: f32[] = []
  /** @type {f32[]} */
  const normals: f32[] = []
  /** @type {f32[]} */
  const indices: f32[] = []
  /** @type {f32[]} */
  const colors: f32[] = []
  appendThreeNativeMeshBuffer(
    positions,
    normals,
    indices,
    colors,
    materialCode,
    materialColor,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
    sourcePositions,
    sourceNormals,
    sourceIndices,
  )
  return createThreeNativeBuffer(
    demoCode,
    materialCode,
    materialColor,
    backgroundColor,
    cameraFov,
    cameraAspect,
    cameraNear,
    cameraFar,
    cameraZ,
    positions,
    normals,
    indices,
    colors,
    cameraX,
    cameraY,
    cameraLookAtX,
    cameraLookAtY,
    cameraLookAtZ,
  )
}

/**
 * @param {number} demoCode
 * @param {number} materialCode
 * @param {number} materialColor
 * @param {number} backgroundColor
 * @param {number} cameraFov
 * @param {number} cameraAspect
 * @param {number} cameraNear
 * @param {number} cameraFar
 * @param {number} cameraZ
 * @param {f32[]} positions
 * @param {f32[]} normals
 * @param {f32[]} indices
 * @param {f32[]} colors
 * @param {number} cameraX
 * @param {number} cameraY
 * @param {number} cameraLookAtX
 * @param {number} cameraLookAtY
 * @param {number} cameraLookAtZ
 */
export function createThreeNativeBuffer(
  demoCode: number,
  materialCode: number,
  materialColor: number,
  backgroundColor: number,
  cameraFov: number,
  cameraAspect: number,
  cameraNear: number,
  cameraFar: number,
  cameraZ: number,
  positions: f32[],
  normals: f32[],
  indices: f32[],
  colors: f32[],
  cameraX: number = 0,
  cameraY: number = 0,
  cameraLookAtX: number = 0,
  cameraLookAtY: number = 0,
  cameraLookAtZ: number = 0,
): ThreeBufferSceneElement {
  const buffer = new ThreeBufferSceneElement()
  buffer.demoCode = demoCode
  buffer.materialCode = materialCode
  buffer.materialColor = materialColor
  buffer.backgroundColor = backgroundColor
  buffer.cameraFov = cameraFov
  buffer.cameraAspect = cameraAspect
  buffer.cameraNear = cameraNear
  buffer.cameraFar = cameraFar
  buffer.cameraX = cameraX
  buffer.cameraY = cameraY
  buffer.cameraZ = cameraZ
  buffer.cameraLookAtX = cameraLookAtX
  buffer.cameraLookAtY = cameraLookAtY
  buffer.cameraLookAtZ = cameraLookAtZ
  buffer.rotationZ = 0
  buffer.positions = positions
  buffer.normals = normals
  buffer.indices = indices
  buffer.colors = colors
  return buffer
}

/**
 * @param {number} demoCode
 * @param {number} materialCode
 * @param {number} materialColor
 * @param {number} backgroundColor
 * @param {number} cameraFov
 * @param {number} cameraAspect
 * @param {number} cameraNear
 * @param {number} cameraFar
 * @param {number} cameraZ
 * @param {number} cameraX
 * @param {number} cameraY
 * @param {number} cameraLookAtX
 * @param {number} cameraLookAtY
 * @param {number} cameraLookAtZ
 */
export function createThreeNativeEmptyBuffer(
  demoCode: number,
  materialCode: number,
  materialColor: number,
  backgroundColor: number,
  cameraFov: number,
  cameraAspect: number,
  cameraNear: number,
  cameraFar: number,
  cameraZ: number,
  cameraX: number = 0,
  cameraY: number = 0,
  cameraLookAtX: number = 0,
  cameraLookAtY: number = 0,
  cameraLookAtZ: number = 0,
): ThreeBufferSceneElement {
  const buffer = new ThreeBufferSceneElement()
  buffer.demoCode = demoCode
  buffer.materialCode = materialCode
  buffer.materialColor = materialColor
  buffer.backgroundColor = backgroundColor
  buffer.cameraFov = cameraFov
  buffer.cameraAspect = cameraAspect
  buffer.cameraNear = cameraNear
  buffer.cameraFar = cameraFar
  buffer.cameraX = cameraX
  buffer.cameraY = cameraY
  buffer.cameraZ = cameraZ
  buffer.cameraLookAtX = cameraLookAtX
  buffer.cameraLookAtY = cameraLookAtY
  buffer.cameraLookAtZ = cameraLookAtZ
  buffer.rotationZ = 0
  return buffer
}

/**
 * @param {f32[]} positions
 * @param {f32[]} normals
 * @param {f32[]} indices
 * @param {f32[]} colors
 * @param {Object3D} object
 * @param {number} parentPositionX
 * @param {number} parentPositionY
 * @param {number} parentPositionZ
 * @param {number} parentRotationX
 * @param {number} parentRotationY
 * @param {number} parentRotationZ
 * @param {number} parentScaleX
 * @param {number} parentScaleY
 * @param {number} parentScaleZ
 * @returns {number}
 */
function appendSceneObjectMeshBuffer(
  positions: f32[],
  normals: f32[],
  indices: f32[],
  colors: f32[],
  object: Object3D,
  parentPositionX: number,
  parentPositionY: number,
  parentPositionZ: number,
  parentRotationX: number,
  parentRotationY: number,
  parentRotationZ: number,
  parentScaleX: number,
  parentScaleY: number,
  parentScaleZ: number,
): number {
  const localPositionX = object.position.x * parentScaleX
  const localPositionY = object.position.y * parentScaleY
  const localPositionZ = object.position.z * parentScaleZ
  const cosX = Math.cos(parentRotationX)
  const sinX = Math.sin(parentRotationX)
  const cosY = Math.cos(parentRotationY)
  const sinY = Math.sin(parentRotationY)
  const cosZ = Math.cos(parentRotationZ)
  const sinZ = Math.sin(parentRotationZ)
  const rotatedX1 = localPositionX
  const rotatedY1 = localPositionY * cosX - localPositionZ * sinX
  const rotatedZ1 = localPositionY * sinX + localPositionZ * cosX
  const rotatedX2 = rotatedX1 * cosY + rotatedZ1 * sinY
  const rotatedY2 = rotatedY1
  const rotatedZ2 = rotatedZ1 * cosY - rotatedX1 * sinY
  const rotatedX3 = rotatedX2 * cosZ - rotatedY2 * sinZ
  const rotatedY3 = rotatedX2 * sinZ + rotatedY2 * cosZ
  const rotatedZ3 = rotatedZ2
  const positionX = parentPositionX + rotatedX3
  const positionY = parentPositionY + rotatedY3
  const positionZ = parentPositionZ + rotatedZ3
  const rotationX = parentRotationX + object.rotation.x
  const rotationY = parentRotationY + object.rotation.y
  const rotationZ = parentRotationZ + object.rotation.z
  const scaleX = parentScaleX * object.scale.x
  const scaleY = parentScaleY * object.scale.y
  const scaleZ = parentScaleZ * object.scale.z
  let meshCount = 0

  if (object.nativeObjectKind === 1) {
    appendSceneMeshBuffer(positions, normals, indices, colors, object, positionX, positionY, positionZ, rotationX, rotationY, rotationZ, scaleX, scaleY, scaleZ)
    meshCount++
  }

  for (let i = 0; i < object.children.length; i++) {
    meshCount += appendSceneObjectMeshBuffer(positions, normals, indices, colors, object.children[i], positionX, positionY, positionZ, rotationX, rotationY, rotationZ, scaleX, scaleY, scaleZ)
  }
  return meshCount
}

/**
 * @param {f32[]} positions
 * @param {f32[]} normals
 * @param {f32[]} indices
 * @param {f32[]} colors
 * @param {Object3D} mesh
 * @param {number} positionX
 * @param {number} positionY
 * @param {number} positionZ
 * @param {number} rotationX
 * @param {number} rotationY
 * @param {number} rotationZ
 * @param {number} scaleX
 * @param {number} scaleY
 * @param {number} scaleZ
 * @returns {void}
 */
function appendSceneMeshBuffer(
  positions: f32[],
  normals: f32[],
  indices: f32[],
  colors: f32[],
  mesh: Object3D,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
): void {
  const meshMaterialCode = mesh.material.nativeMaterialCode
  let meshMaterialColor = 0xffffff
  if (meshMaterialCode !== 2) meshMaterialColor = mesh.material.colorValue
  appendThreeNativeMeshBuffer(
    positions,
    normals,
    indices,
    colors,
    meshMaterialCode,
    meshMaterialColor,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
    mesh.geometry.positionArray(),
    mesh.geometry.normalArray(),
    mesh.geometry.indexArray(),
  )
}

/**
 * @param {f32[]} positions
 * @param {f32[]} normals
 * @param {f32[]} indices
 * @param {f32[]} colors
 * @param {number} materialCode
 * @param {number} materialColor
 * @param {number} positionX
 * @param {number} positionY
 * @param {number} positionZ
 * @param {number} rotationX
 * @param {number} rotationY
 * @param {number} rotationZ
 * @param {number} scaleX
 * @param {number} scaleY
 * @param {number} scaleZ
 * @param {f32[]} sourcePositions
 * @param {f32[]} sourceNormals
 * @param {f32[]} sourceIndices
 * @returns {void}
 */
export function appendThreeNativeMeshBuffer(
  positions: f32[],
  normals: f32[],
  indices: f32[],
  colors: f32[],
  materialCode: number,
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  sourcePositions: f32[],
  sourceNormals: f32[],
  sourceIndices: f32[],
): void {
  const vertexOffset = positions.length / 3
  appendTransformedNativeMeshBufferValues(
    positions,
    sourcePositions,
    0,
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
  appendTransformedNativeMeshNormalsAndColors(
    normals,
    colors,
    materialCode,
    materialColor,
    sourceNormals,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
  for (let i = 0; i < sourceIndices.length; i++) indices.push(sourceIndices[i] + vertexOffset)
}

/**
 * @param {number} demoCode
 * @param {number} backgroundColor
 * @param {ThreeNativeSceneMesh} mesh
 * @param {PerspectiveCamera} camera
 * @returns {ThreeSceneElement}
 */
function createThreeNativeMeshPayload(
  demoCode: number,
  backgroundColor: number,
  mesh: ThreeNativeSceneMesh,
  camera: PerspectiveCamera,
): ThreeSceneElement {
  const geometry = mesh.geometry
  const material = mesh.material
  const materialCode = material.nativeMaterialCode
  const materialColor = materialCode === 2 ? 0xffffff : material.colorValue
  const parameters = geometryParameters(geometry)
  const geometryCode = parameters[0]
  logAngleHostSmoke('upstream Three adapter: mesh geometry ' + geometryCode + ' / material ' + materialCode)
  return createThreeScenePayload(
    demoCode,
    geometryCode,
    materialCode,
    materialColor,
    backgroundColor,
    camera.fov,
    camera.aspect,
    camera.near,
    camera.far,
    camera.position.z,
    mesh.rotationX,
    mesh.rotationY,
    mesh.rotationZ,
    mesh.positionX,
    mesh.positionY,
    mesh.positionZ,
    parameters[1],
    parameters[2],
    parameters[3],
    parameters[4],
    parameters[5],
    parameters[6],
    mesh.scaleX,
    mesh.scaleY,
    mesh.scaleZ,
    0xffffff,
    1,
    0xffffff,
    0,
    0,
    0,
    1,
    camera.position.x,
    camera.position.y,
    camera.target.x,
    camera.target.y,
    camera.target.z,
  )
}

/**
 * @param {Scene} scene
 * @returns {ThreeNativeSceneMesh[]}
 */
function sceneMeshes(scene: Scene): ThreeNativeSceneMesh[] {
  const meshes: ThreeNativeSceneMesh[] = []
  if (scene.children.length > 0) {
    appendSceneObjectMeshes(meshes, scene, 0, 0, 0, 0, 0, 0, 1, 1, 1)
    if (meshes.length > 0) return meshes
  }
  if (scene.meshes.length > 0) {
    for (let i = 0; i < scene.meshes.length; i++) {
      appendSceneMesh(meshes, scene.meshes[i], scene.meshes[i].position.x, scene.meshes[i].position.y, scene.meshes[i].position.z, scene.meshes[i].rotation.x, scene.meshes[i].rotation.y, scene.meshes[i].rotation.z, scene.meshes[i].scale.x, scene.meshes[i].scale.y, scene.meshes[i].scale.z)
    }
    return meshes
  }
  appendSceneMesh(meshes, scene.mesh, scene.mesh.position.x, scene.mesh.position.y, scene.mesh.position.z, scene.mesh.rotation.x, scene.mesh.rotation.y, scene.mesh.rotation.z, scene.mesh.scale.x, scene.mesh.scale.y, scene.mesh.scale.z)
  return meshes
}

/**
 * @param {ThreeNativeSceneMesh[]} target
 * @param {Object3D} object
 * @param {number} parentPositionX
 * @param {number} parentPositionY
 * @param {number} parentPositionZ
 * @param {number} parentRotationX
 * @param {number} parentRotationY
 * @param {number} parentRotationZ
 * @param {number} parentScaleX
 * @param {number} parentScaleY
 * @param {number} parentScaleZ
 * @returns {void}
 */
function appendSceneObjectMeshes(
  target: ThreeNativeSceneMesh[],
  object: Object3D,
  parentPositionX: number,
  parentPositionY: number,
  parentPositionZ: number,
  parentRotationX: number,
  parentRotationY: number,
  parentRotationZ: number,
  parentScaleX: number,
  parentScaleY: number,
  parentScaleZ: number,
): void {
  const localPositionX = object.position.x * parentScaleX
  const localPositionY = object.position.y * parentScaleY
  const localPositionZ = object.position.z * parentScaleZ
  const cosX = Math.cos(parentRotationX)
  const sinX = Math.sin(parentRotationX)
  const cosY = Math.cos(parentRotationY)
  const sinY = Math.sin(parentRotationY)
  const cosZ = Math.cos(parentRotationZ)
  const sinZ = Math.sin(parentRotationZ)
  const rotatedX1 = localPositionX
  const rotatedY1 = localPositionY * cosX - localPositionZ * sinX
  const rotatedZ1 = localPositionY * sinX + localPositionZ * cosX
  const rotatedX2 = rotatedX1 * cosY + rotatedZ1 * sinY
  const rotatedY2 = rotatedY1
  const rotatedZ2 = rotatedZ1 * cosY - rotatedX1 * sinY
  const rotatedX3 = rotatedX2 * cosZ - rotatedY2 * sinZ
  const rotatedY3 = rotatedX2 * sinZ + rotatedY2 * cosZ
  const rotatedZ3 = rotatedZ2
  const positionX = parentPositionX + rotatedX3
  const positionY = parentPositionY + rotatedY3
  const positionZ = parentPositionZ + rotatedZ3
  const rotationX = parentRotationX + object.rotation.x
  const rotationY = parentRotationY + object.rotation.y
  const rotationZ = parentRotationZ + object.rotation.z
  const scaleX = parentScaleX * object.scale.x
  const scaleY = parentScaleY * object.scale.y
  const scaleZ = parentScaleZ * object.scale.z

  if (object instanceof Mesh) {
    appendSceneMesh(target, object, positionX, positionY, positionZ, rotationX, rotationY, rotationZ, scaleX, scaleY, scaleZ)
  }

  for (let i = 0; i < object.children.length; i++) {
    appendSceneObjectMeshes(target, object.children[i], positionX, positionY, positionZ, rotationX, rotationY, rotationZ, scaleX, scaleY, scaleZ)
  }
}

/**
 * @param {ThreeNativeSceneMesh[]} target
 * @param {Object3D} mesh
 * @param {number} positionX
 * @param {number} positionY
 * @param {number} positionZ
 * @param {number} rotationX
 * @param {number} rotationY
 * @param {number} rotationZ
 * @param {number} scaleX
 * @param {number} scaleY
 * @param {number} scaleZ
 * @returns {void}
 */
function appendSceneMesh(
  target: ThreeNativeSceneMesh[],
  mesh: Object3D,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
): void {
  target.push(new ThreeNativeSceneMesh(mesh.geometry, mesh.material, positionX, positionY, positionZ, rotationX, rotationY, rotationZ, scaleX, scaleY, scaleZ))
}

/**
 * @param {Mesh} mesh
 * @param {ThreeSceneElement} payload
 * @param {number} slot
 * @returns {f32[]}
 */
function meshBufferValues(mesh: Mesh, payload: ThreeSceneElement, slot: number): f32[] {
  const geometry = mesh.geometry
  const realValues = realGeometryBufferValues(geometry, slot)
  if (realValues.length > 0) {
    if (slot === 2) return realValues
    return transformMeshBufferValues(realValues, mesh, slot)
  }
  if (slot === 3) return createThreeSceneColorValues(payload)
  if (slot === 2) return createThreeSceneBufferValues(payload, slot)
  return transformMeshBufferValues(createThreeSceneBufferValues(payload, slot), mesh, slot)
}

/**
 * @param {BufferGeometry} geometry
 * @param {number} slot
 * @returns {f32[]}
 */
function realGeometryBufferValues(geometry: BufferGeometry, slot: number): f32[] {
  if (slot === 0) return geometry.positionArray()
  if (slot === 1) return geometry.normalArray()
  if (slot === 2) return geometry.indexArray()
  return []
}

/**
 * @param {f32[]} target
 * @param {f32[]} source
 * @param {number} slot
 * @param {number} positionX
 * @param {number} positionY
 * @param {number} positionZ
 * @param {number} rotationX
 * @param {number} rotationY
 * @param {number} rotationZ
 * @param {number} scaleX
 * @param {number} scaleY
 * @param {number} scaleZ
 * @returns {void}
 */
function appendTransformedNativeMeshBufferValues(
  target: f32[],
  source: f32[],
  slot: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
): void {
  const cosX = Math.cos(rotationX)
  const sinX = Math.sin(rotationX)
  const cosY = Math.cos(rotationY)
  const sinY = Math.sin(rotationY)
  const cosZ = Math.cos(rotationZ)
  const sinZ = Math.sin(rotationZ)
  const normalScaleX = scaleX > 0.0001 || scaleX < -0.0001 ? scaleX : 1
  const normalScaleY = scaleY > 0.0001 || scaleY < -0.0001 ? scaleY : 1
  const normalScaleZ = scaleZ > 0.0001 || scaleZ < -0.0001 ? scaleZ : 1
  for (let i = 0; i < source.length; i += 3) {
    let x = source[i]
    let y = source[i + 1]
    let z = source[i + 2]
    if (slot < 0.5) {
      x *= scaleX
      y *= scaleY
      z *= scaleZ
    } else {
      const nx = x / normalScaleX
      const ny = y / normalScaleY
      const nz = z / normalScaleZ
      const length = Math.sqrt(nx * nx + ny * ny + nz * nz)
      if (length > 0.0001) {
        x = nx / length
        y = ny / length
        z = nz / length
      }
    }
    const x1 = x
    const y1 = y * cosX - z * sinX
    const z1 = y * sinX + z * cosX
    const x2 = x1 * cosY + z1 * sinY
    const y2 = y1
    const z2 = z1 * cosY - x1 * sinY
    const x3 = x2 * cosZ - y2 * sinZ
    const y3 = x2 * sinZ + y2 * cosZ
    const z3 = z2
    if (slot < 0.5) target.push(x3 + positionX, y3 + positionY, z3 + positionZ)
    else target.push(x3, y3, z3)
  }
}

/**
 * @param {f32[]} normals
 * @param {f32[]} colors
 * @param {number} materialCode
 * @param {number} materialColor
 * @param {f32[]} sourceNormals
 * @param {number} rotationX
 * @param {number} rotationY
 * @param {number} rotationZ
 * @param {number} scaleX
 * @param {number} scaleY
 * @param {number} scaleZ
 * @returns {void}
 */
function appendTransformedNativeMeshNormalsAndColors(
  normals: f32[],
  colors: f32[],
  materialCode: number,
  materialColor: number,
  sourceNormals: f32[],
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
): void {
  const red = Math.floor(materialColor / 65536) % 256 / 255
  const green = Math.floor(materialColor / 256) % 256 / 255
  const blue = Math.floor(materialColor) % 256 / 255
  const cosX = Math.cos(rotationX)
  const sinX = Math.sin(rotationX)
  const cosY = Math.cos(rotationY)
  const sinY = Math.sin(rotationY)
  const cosZ = Math.cos(rotationZ)
  const sinZ = Math.sin(rotationZ)
  const normalScaleX = scaleX > 0.0001 || scaleX < -0.0001 ? scaleX : 1
  const normalScaleY = scaleY > 0.0001 || scaleY < -0.0001 ? scaleY : 1
  const normalScaleZ = scaleZ > 0.0001 || scaleZ < -0.0001 ? scaleZ : 1
  for (let i = 0; i < sourceNormals.length; i += 3) {
    const nx = sourceNormals[i] / normalScaleX
    const ny = sourceNormals[i + 1] / normalScaleY
    const nz = sourceNormals[i + 2] / normalScaleZ
    const length = Math.sqrt(nx * nx + ny * ny + nz * nz)
    let x = sourceNormals[i]
    let y = sourceNormals[i + 1]
    let z = sourceNormals[i + 2]
    if (length > 0.0001) {
      x = nx / length
      y = ny / length
      z = nz / length
    }
    const x1 = x
    const y1 = y * cosX - z * sinX
    const z1 = y * sinX + z * cosX
    const x2 = x1 * cosY + z1 * sinY
    const y2 = y1
    const z2 = z1 * cosY - x1 * sinY
    const x3 = x2 * cosZ - y2 * sinZ
    const y3 = x2 * sinZ + y2 * cosZ
    const z3 = z2
    normals.push(x3, y3, z3)
    if (materialCode === 2) colors.push(x3 * 0.5 + 0.5, y3 * 0.5 + 0.5, z3 * 0.5 + 0.5)
    else colors.push(red, green, blue)
  }
}

/**
 * @param {f32[]} source
 * @param {Mesh} mesh
 * @param {number} slot
 * @returns {f32[]}
 */
function transformMeshBufferValues(source: f32[], mesh: Mesh, slot: number): f32[] {
  const values: f32[] = []
  const rotationX = mesh.rotation.x
  const rotationY = mesh.rotation.y
  const rotationZ = mesh.rotation.z
  const scaleX = mesh.scale.x
  const scaleY = mesh.scale.y
  const scaleZ = mesh.scale.z
  const cosX = Math.cos(rotationX)
  const sinX = Math.sin(rotationX)
  const cosY = Math.cos(rotationY)
  const sinY = Math.sin(rotationY)
  const cosZ = Math.cos(rotationZ)
  const sinZ = Math.sin(rotationZ)
  const normalScaleX = scaleX > 0.0001 || scaleX < -0.0001 ? scaleX : 1
  const normalScaleY = scaleY > 0.0001 || scaleY < -0.0001 ? scaleY : 1
  const normalScaleZ = scaleZ > 0.0001 || scaleZ < -0.0001 ? scaleZ : 1
  for (let i = 0; i < source.length; i += 3) {
    let x = source[i]
    let y = source[i + 1]
    let z = source[i + 2]
    if (slot < 0.5) {
      x *= scaleX
      y *= scaleY
      z *= scaleZ
    } else {
      const nx = x / normalScaleX
      const ny = y / normalScaleY
      const nz = z / normalScaleZ
      const length = Math.sqrt(nx * nx + ny * ny + nz * nz)
      if (length > 0.0001) {
        x = nx / length
        y = ny / length
        z = nz / length
      }
    }
    const x1 = x
    const y1 = y * cosX - z * sinX
    const z1 = y * sinX + z * cosX
    const x2 = x1 * cosY + z1 * sinY
    const y2 = y1
    const z2 = z1 * cosY - x1 * sinY
    const x3 = x2 * cosZ - y2 * sinZ
    const y3 = x2 * sinZ + y2 * cosZ
    const z3 = z2
    if (slot < 0.5) values.push(x3 + mesh.position.x, y3 + mesh.position.y, z3 + mesh.position.z)
    else values.push(x3, y3, z3)
  }
  return values
}

/**
 * @param {BufferGeometry} geometry
 * @returns {number[]}
 */
function geometryParameters(geometry: BufferGeometry): number[] {
  if (Array.isArray(geometry.parameters)) return geometry.parameters
  if (geometry.type === 'TorusKnotGeometry') {
    return [
      2,
      geometryNumberParameter(geometry, 'radius', 1),
      geometryNumberParameter(geometry, 'tube', 0.4),
      geometryNumberParameter(geometry, 'tubularSegments', 64),
      geometryNumberParameter(geometry, 'radialSegments', 8),
      geometryNumberParameter(geometry, 'p', 2),
      geometryNumberParameter(geometry, 'q', 3),
    ]
  }
  if (geometry.type === 'SphereGeometry') {
    return [
      3,
      geometryNumberParameter(geometry, 'radius', 1),
      geometryNumberParameter(geometry, 'widthSegments', 32),
      geometryNumberParameter(geometry, 'heightSegments', 16),
      geometryNumberParameter(geometry, 'phiStart', 0),
      geometryNumberParameter(geometry, 'phiLength', 6.283185307179586),
      geometryNumberParameter(geometry, 'thetaStart', 0),
    ]
  }
  if (geometry.type === 'TorusGeometry') {
    return [
      5,
      geometryNumberParameter(geometry, 'radius', 1),
      geometryNumberParameter(geometry, 'tube', 0.4),
      geometryNumberParameter(geometry, 'radialSegments', 12),
      geometryNumberParameter(geometry, 'tubularSegments', 48),
      geometryNumberParameter(geometry, 'arc', 6.283185307179586),
      geometryNumberParameter(geometry, 'thetaStart', 0),
    ]
  }
  if (geometry.type === 'CylinderGeometry') {
    return [
      6,
      geometryNumberParameter(geometry, 'radiusTop', 1),
      geometryNumberParameter(geometry, 'radiusBottom', 1),
      geometryNumberParameter(geometry, 'height', 1),
      geometryNumberParameter(geometry, 'radialSegments', 32),
      geometryNumberParameter(geometry, 'heightSegments', 1),
      geometryBooleanParameter(geometry, 'openEnded', false) ? 1 : 0,
    ]
  }
  if (geometry.type === 'ConeGeometry') {
    return [
      6,
      0,
      geometryNumberParameter(geometry, 'radius', 1),
      geometryNumberParameter(geometry, 'height', 1),
      geometryNumberParameter(geometry, 'radialSegments', 32),
      geometryNumberParameter(geometry, 'heightSegments', 1),
      geometryBooleanParameter(geometry, 'openEnded', false) ? 1 : 0,
    ]
  }
  if (geometry.type === 'RingGeometry') {
    return [
      7,
      geometryNumberParameter(geometry, 'innerRadius', 0.5),
      geometryNumberParameter(geometry, 'outerRadius', 1),
      geometryNumberParameter(geometry, 'thetaSegments', 32),
      geometryNumberParameter(geometry, 'phiSegments', 1),
      geometryNumberParameter(geometry, 'thetaStart', 0),
      geometryNumberParameter(geometry, 'thetaLength', 6.283185307179586),
    ]
  }
  if (geometry.type === 'PlaneGeometry') {
    return [
      4,
      geometryNumberParameter(geometry, 'width', 1),
      geometryNumberParameter(geometry, 'height', 1),
      geometryNumberParameter(geometry, 'widthSegments', 1),
      geometryNumberParameter(geometry, 'heightSegments', 1),
      0,
      0,
    ]
  }
  return [
    1,
    geometryNumberParameter(geometry, 'width', 1),
    geometryNumberParameter(geometry, 'height', 1),
    geometryNumberParameter(geometry, 'depth', 1),
    geometryNumberParameter(geometry, 'widthSegments', 1),
    geometryNumberParameter(geometry, 'heightSegments', 1),
    geometryNumberParameter(geometry, 'depthSegments', 1),
  ]
}

/**
 * @param {BufferGeometry} geometry
 * @param {string} name
 * @param {number} fallback
 * @returns {number}
 */
function geometryNumberParameter(geometry: BufferGeometry, name: string, fallback: number): number {
  const parameters = geometry.parameters
  if (!parameters || typeof parameters !== 'object') return fallback
  const value = (parameters as Record<string, unknown>)[name]
  return typeof value === 'number' ? value : fallback
}

function geometryBooleanParameter(geometry: BufferGeometry, name: string, fallback: boolean): boolean {
  const parameters = geometry.parameters
  if (!parameters || typeof parameters !== 'object') return fallback
  const value = (parameters as Record<string, unknown>)[name]
  return typeof value === 'boolean' ? value : fallback
}
