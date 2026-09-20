import {
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshNormalMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  TorusKnotGeometry,
} from 'three'
import {
  type ThreeBufferSceneElement,
  type ThreeSceneElement,
} from './threeJsx'
import {
  logAngleHostSmoke,
} from './angleHost'
import {
  createThreeNativeSceneBuffer,
  createThreeNativeScenePayload,
} from './threeSceneAdapter'
import type {
  PerspectiveCamera as RuntimePerspectiveCamera,
  Scene as RuntimeScene,
} from './threeGeometryRuntime'

export class UpstreamThreeProbeScenes {
  cubePayload!: ThreeSceneElement
  torusPayload!: ThreeSceneElement
  normalPayload!: ThreeSceneElement
  spherePayload!: ThreeSceneElement
  cubeBuffer!: ThreeBufferSceneElement
  torusBuffer!: ThreeBufferSceneElement
  normalBuffer!: ThreeBufferSceneElement
  sphereBuffer!: ThreeBufferSceneElement

  constructor(
    cubePayload: ThreeSceneElement,
    torusPayload: ThreeSceneElement,
    normalPayload: ThreeSceneElement,
    spherePayload: ThreeSceneElement,
    cubeBuffer: ThreeBufferSceneElement,
    torusBuffer: ThreeBufferSceneElement,
    normalBuffer: ThreeBufferSceneElement,
    sphereBuffer: ThreeBufferSceneElement,
  ) {
    this.cubePayload = cubePayload
    this.torusPayload = torusPayload
    this.normalPayload = normalPayload
    this.spherePayload = spherePayload
    this.cubeBuffer = cubeBuffer
    this.torusBuffer = torusBuffer
    this.normalBuffer = normalBuffer
    this.sphereBuffer = sphereBuffer
  }
}

function createCamera(aspect: number): PerspectiveCamera {
  const camera = new PerspectiveCamera(70, aspect, 0.01, 100)
  camera.position.z = 4
  return camera
}

export function createUpstreamThreeProbeScenes(aspect: number): UpstreamThreeProbeScenes {
  logAngleHostSmoke("upstream Three probe: cube")
  const cubeScene = new Scene()
  const cubeGeometry = new BoxGeometry(1.4, 1.4, 1.4, 1, 1, 1)
  const cubeMaterial = new MeshBasicMaterial({ color: 0x5eead4 })
  const cubeMesh = new Mesh(cubeGeometry, cubeMaterial)
  cubeScene.add(cubeMesh)
  const cubeCamera = createCamera(aspect)
  logAngleHostSmoke("upstream Three probe: torus knot")
  const torusScene = new Scene()
  const torusGeometry = new TorusKnotGeometry(0.82, 0.22, 128, 16, 2, 3)
  const torusMaterial = new MeshBasicMaterial({ color: 0xfbbf24 })
  const torusMesh = new Mesh(torusGeometry, torusMaterial)
  torusScene.add(torusMesh)
  const torusCamera = createCamera(aspect)
  logAngleHostSmoke("upstream Three probe: normal material")
  const normalScene = new Scene()
  const normalGeometry = new BoxGeometry(1.6, 1.6, 1.6, 4, 4, 4)
  const normalMaterial = new MeshNormalMaterial()
  const normalMesh = new Mesh(normalGeometry, normalMaterial)
  normalScene.add(normalMesh)
  const normalCamera = createCamera(aspect)
  logAngleHostSmoke("upstream Three probe: sphere")
  const sphereScene = new Scene()
  const sphereGeometry = new SphereGeometry(1.1, 48, 24, 0, 6.283185307179586, 0)
  const sphereMaterial = new MeshBasicMaterial({ color: 0x93c5fd })
  const sphereMesh = new Mesh(sphereGeometry, sphereMaterial)
  sphereScene.add(sphereMesh)
  const sphereCamera = createCamera(aspect)
  logAngleHostSmoke("upstream Three probe: typed scene payloads")

  logAngleHostSmoke("upstream Three probe: typed cube payload")
  const runtimeCubeScene = cubeScene as unknown as RuntimeScene
  const runtimeCubeCamera = cubeCamera as unknown as RuntimePerspectiveCamera
  const cubePayload = createThreeNativeScenePayload(1, 0x101820, runtimeCubeScene, runtimeCubeCamera)
  const cubeBuffer = createThreeNativeSceneBuffer(1, 0x101820, runtimeCubeScene, runtimeCubeCamera)
  logAngleHostSmoke("upstream Three probe: typed torus payload")
  const runtimeTorusScene = torusScene as unknown as RuntimeScene
  const runtimeTorusCamera = torusCamera as unknown as RuntimePerspectiveCamera
  const torusPayload = createThreeNativeScenePayload(2, 0x111827, runtimeTorusScene, runtimeTorusCamera)
  const torusBuffer = createThreeNativeSceneBuffer(2, 0x111827, runtimeTorusScene, runtimeTorusCamera)
  logAngleHostSmoke("upstream Three probe: typed normal payload")
  const runtimeNormalScene = normalScene as unknown as RuntimeScene
  const runtimeNormalCamera = normalCamera as unknown as RuntimePerspectiveCamera
  const normalPayload = createThreeNativeScenePayload(3, 0x0b1020, runtimeNormalScene, runtimeNormalCamera)
  const normalBuffer = createThreeNativeSceneBuffer(3, 0x0b1020, runtimeNormalScene, runtimeNormalCamera)
  logAngleHostSmoke("upstream Three probe: typed sphere payload")
  const runtimeSphereScene = sphereScene as unknown as RuntimeScene
  const runtimeSphereCamera = sphereCamera as unknown as RuntimePerspectiveCamera
  const spherePayload = createThreeNativeScenePayload(4, 0x0f172a, runtimeSphereScene, runtimeSphereCamera)
  const sphereBuffer = createThreeNativeSceneBuffer(4, 0x0f172a, runtimeSphereScene, runtimeSphereCamera)
  logAngleHostSmoke("upstream Three probe: real geometry buffers")
  logAngleHostSmoke("upstream Three payload cube geometry " + cubePayload[1])
  logAngleHostSmoke("upstream Three payload torus geometry " + torusPayload[1])
  logAngleHostSmoke("upstream Three payload normal geometry " + normalPayload[1])
  logAngleHostSmoke("upstream Three payload sphere geometry " + spherePayload[1])
  logAngleHostSmoke("upstream Three buffer cube indices " + cubeBuffer.indices.length)
  logAngleHostSmoke("upstream Three buffer torus indices " + torusBuffer.indices.length)
  logAngleHostSmoke("upstream Three buffer normal indices " + normalBuffer.indices.length)
  logAngleHostSmoke("upstream Three buffer sphere indices " + sphereBuffer.indices.length)
  return new UpstreamThreeProbeScenes(
    cubePayload,
    torusPayload,
    normalPayload,
    spherePayload,
    cubeBuffer,
    torusBuffer,
    normalBuffer,
    sphereBuffer,
  )
}
