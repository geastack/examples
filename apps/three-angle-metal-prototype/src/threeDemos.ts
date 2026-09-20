import {
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshNormalMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  TorusKnotGeometry,
  Vector3,
} from 'three'

export type ThreeDemoId =
  | 'webgl_geometry_cube'
  | 'webgl_geometry_torus_knot'
  | 'webgl_geometry_sphere'
  | 'webgl_materials_normal'

export interface ThreeDemoDefinition {
  id: ThreeDemoId
  title: string
  demoCode: number
  geometryCode: number
  materialCode: number
  geometryKind: 'box' | 'torusKnot' | 'sphere'
  materialKind: 'basic' | 'normal'
  materialColor: number
  backgroundColor: number
  geometryParameters: number[]
  cameraFov: number
  cameraAspect: number
  cameraNear: number
  cameraFar: number
  cameraZ: number
  rotationX: number
  rotationY: number
  rotationZ: number
}

export interface ThreeDemoSet {
  cube: ThreeDemoDefinition
  torusKnot: ThreeDemoDefinition
  sphere: ThreeDemoDefinition
  normalMaterial: ThreeDemoDefinition
}

export function createDefaultThreeDemos(aspect: number): ThreeDemoDefinition[] {
  return [
    createCubeDemo(aspect),
    createTorusKnotDemo(aspect),
    createSphereDemo(aspect),
    createNormalMaterialDemo(aspect),
  ]
}

export function createDefaultThreeDemoSet(aspect: number): ThreeDemoSet {
  return {
    cube: createCubeDemo(aspect),
    torusKnot: createTorusKnotDemo(aspect),
    sphere: createSphereDemo(aspect),
    normalMaterial: createNormalMaterialDemo(aspect),
  }
}

function createCamera(aspect: number): PerspectiveCamera {
  const camera = new PerspectiveCamera(70, aspect, 0.01, 100)
  camera.position.z = 4
  camera.lookAt(new Vector3(0, 0, 0))
  return camera
}

function createScene(background: number): Scene {
  void background
  const scene = new Scene()
  return scene
}

function createCubeDemo(aspect: number): ThreeDemoDefinition {
  const scene = createScene(0x101820)
  const camera = createCamera(aspect)
  const geometry = new BoxGeometry(1.4, 1.4, 1.4)
  const material = new MeshBasicMaterial({ color: 0x5eead4 })
  const cube = new Mesh(geometry, material)
  scene.add(cube)
  return {
    id: 'webgl_geometry_cube',
    title: 'geometry / cube',
    demoCode: 1,
    geometryCode: 1,
    materialCode: 1,
    geometryKind: 'box',
    materialKind: 'basic',
    materialColor: 0x5eead4,
    backgroundColor: 0x101820,
    geometryParameters: [1.4, 1.4, 1.4, 1, 1, 1],
    cameraFov: camera.fov,
    cameraAspect: camera.aspect,
    cameraNear: camera.near,
    cameraFar: camera.far,
    cameraZ: camera.position.z,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
  }
}

function createTorusKnotDemo(aspect: number): ThreeDemoDefinition {
  const scene = createScene(0x111827)
  const camera = createCamera(aspect)
  const geometry = new TorusKnotGeometry(0.82, 0.22, 128, 16)
  const material = new MeshBasicMaterial({ color: 0xfbbf24 })
  const torus = new Mesh(geometry, material)
  scene.add(torus)
  return {
    id: 'webgl_geometry_torus_knot',
    title: 'geometry / torus knot',
    demoCode: 2,
    geometryCode: 2,
    materialCode: 1,
    geometryKind: 'torusKnot',
    materialKind: 'basic',
    materialColor: 0xfbbf24,
    backgroundColor: 0x111827,
    geometryParameters: [0.82, 0.22, 128, 16, 2, 3],
    cameraFov: camera.fov,
    cameraAspect: camera.aspect,
    cameraNear: camera.near,
    cameraFar: camera.far,
    cameraZ: camera.position.z,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
  }
}

function createNormalMaterialDemo(aspect: number): ThreeDemoDefinition {
  const scene = createScene(0x0b1020)
  const camera = createCamera(aspect)
  const geometry = new BoxGeometry(1.6, 1.6, 1.6, 4, 4, 4)
  const material = new MeshNormalMaterial()
  const mesh = new Mesh(geometry, material)
  scene.add(mesh)
  return {
    id: 'webgl_materials_normal',
    title: 'materials / normal',
    demoCode: 3,
    geometryCode: 1,
    materialCode: 2,
    geometryKind: 'box',
    materialKind: 'normal',
    materialColor: 0xffffff,
    backgroundColor: 0x0b1020,
    geometryParameters: [1.6, 1.6, 1.6, 4, 4, 4],
    cameraFov: camera.fov,
    cameraAspect: camera.aspect,
    cameraNear: camera.near,
    cameraFar: camera.far,
    cameraZ: camera.position.z,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
  }
}

function createSphereDemo(aspect: number): ThreeDemoDefinition {
  const scene = createScene(0x0f172a)
  const camera = createCamera(aspect)
  const geometry = new SphereGeometry(1.1, 48, 24)
  const material = new MeshBasicMaterial({ color: 0x93c5fd })
  const sphere = new Mesh(geometry, material)
  scene.add(sphere)
  return {
    id: 'webgl_geometry_sphere',
    title: 'geometry / sphere',
    demoCode: 4,
    geometryCode: 3,
    materialCode: 1,
    geometryKind: 'sphere',
    materialKind: 'basic',
    materialColor: 0x93c5fd,
    backgroundColor: 0x0f172a,
    geometryParameters: [1.1, 48, 24, 0, 6.283185307179586, 0],
    cameraFov: camera.fov,
    cameraAspect: camera.aspect,
    cameraNear: camera.near,
    cameraFar: camera.far,
    cameraZ: camera.position.z,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
  }
}

export function tickDemo(demo: ThreeDemoDefinition, timestampMs: number): void {
  const t = timestampMs / 1000
  demo.rotationX = t * 0.53
  demo.rotationY = t * 0.71
  demo.rotationZ = 0
}
