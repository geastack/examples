import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshNormalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  RingGeometry,
  Scene,
  SphereGeometry,
  TorusGeometry,
  TorusKnotGeometry,
} from 'three'
import {
  createGeaWebGLRendererMeshBuffer,
  type GeaWebGLRenderer,
  logAngleHostSmoke,
  renderGeaWebGLRendererMeshBufferHandleFrame,
} from './angleHost'
import {
  createThreeNativeMeshBuffer,
  createThreeNativeSceneBuffer,
} from './threeSceneAdapter'
import type {
  BufferGeometry as RuntimeBufferGeometry,
  PerspectiveCamera as RuntimePerspectiveCamera,
  Scene as RuntimeScene,
} from './threeGeometryRuntime'

export function startThreeFrameLoop(
  renderer: GeaWebGLRenderer,
  aspect: number,
): void {
  logAngleHostSmoke('upstream Three probe: real BoxGeometry')
  const cubeScene = new Scene()
  const cubeGeometry = new BoxGeometry(1.4, 1.4, 1.4, 1, 1, 1)
  const cubeMesh = new Mesh(cubeGeometry, new MeshStandardMaterial({ color: 0x5eead4 }))
  cubeMesh.scale.set(1.02, 1.02, 1.02)
  cubeScene.add(cubeMesh)
  const cubeCamera = new PerspectiveCamera(70, aspect, 0.01, 100)
  cubeCamera.position.set(0.32, 0.12, 4)
  const cubeRuntimeGeometry = cubeGeometry as unknown as RuntimeBufferGeometry
  const cubeBuffer = createThreeNativeMeshBuffer(
    1,
    3,
    0x5eead4,
    0x101820,
    cubeCamera.fov,
    cubeCamera.aspect,
    cubeCamera.near,
    cubeCamera.far,
    cubeCamera.position.z,
    cubeMesh.position.x,
    cubeMesh.position.y,
    cubeMesh.position.z,
    cubeMesh.rotation.x,
    cubeMesh.rotation.y,
    cubeMesh.rotation.z,
    cubeMesh.scale.x,
    cubeMesh.scale.y,
    cubeMesh.scale.z,
    cubeRuntimeGeometry.positionArray(),
    cubeRuntimeGeometry.normalArray(),
    cubeRuntimeGeometry.indexArray(),
    cubeCamera.position.x,
    cubeCamera.position.y,
    0,
    0,
    0,
  )

  logAngleHostSmoke('upstream Three probe: real TorusKnotGeometry')
  const torusScene = new Scene()
  const torusGeometry = new TorusKnotGeometry(0.82, 0.22, 128, 16, 2, 3)
  const torusMesh = new Mesh(torusGeometry, new MeshBasicMaterial({ color: 0xfbbf24 }))
  torusMesh.scale.set(1.08, 1.08, 1.08)
  torusScene.add(torusMesh)
  const torusCamera = new PerspectiveCamera(70, aspect, 0.01, 100)
  torusCamera.position.set(0, 0, 4)
  const torusRuntimeGeometry = torusGeometry as unknown as RuntimeBufferGeometry
  const torusBuffer = createThreeNativeMeshBuffer(
    2,
    1,
    0xfbbf24,
    0x111827,
    torusCamera.fov,
    torusCamera.aspect,
    torusCamera.near,
    torusCamera.far,
    torusCamera.position.z,
    torusMesh.position.x,
    torusMesh.position.y,
    torusMesh.position.z,
    torusMesh.rotation.x,
    torusMesh.rotation.y,
    torusMesh.rotation.z,
    torusMesh.scale.x,
    torusMesh.scale.y,
    torusMesh.scale.z,
    torusRuntimeGeometry.positionArray(),
    torusRuntimeGeometry.normalArray(),
    torusRuntimeGeometry.indexArray(),
    torusCamera.position.x,
    torusCamera.position.y,
    0,
    0,
    0,
  )

  logAngleHostSmoke('upstream Three probe: real MeshNormalMaterial')
  const normalScene = new Scene()
  const normalGeometry = new BoxGeometry(1.6, 1.6, 1.6, 4, 4, 4)
  const normalMesh = new Mesh(normalGeometry, new MeshNormalMaterial())
  normalMesh.scale.set(1, 1.18, 0.86)
  normalScene.add(normalMesh)
  const normalCamera = new PerspectiveCamera(70, aspect, 0.01, 100)
  normalCamera.position.set(0, 0, 4)
  const normalRuntimeGeometry = normalGeometry as unknown as RuntimeBufferGeometry
  const normalBuffer = createThreeNativeMeshBuffer(
    3,
    2,
    0xffffff,
    0x0b1020,
    normalCamera.fov,
    normalCamera.aspect,
    normalCamera.near,
    normalCamera.far,
    normalCamera.position.z,
    normalMesh.position.x,
    normalMesh.position.y,
    normalMesh.position.z,
    normalMesh.rotation.x,
    normalMesh.rotation.y,
    normalMesh.rotation.z,
    normalMesh.scale.x,
    normalMesh.scale.y,
    normalMesh.scale.z,
    normalRuntimeGeometry.positionArray(),
    normalRuntimeGeometry.normalArray(),
    normalRuntimeGeometry.indexArray(),
    normalCamera.position.x,
    normalCamera.position.y,
    0,
    0,
    0,
  )

  logAngleHostSmoke('upstream Three probe: real SphereGeometry')
  const sphereScene = new Scene()
  const sphereGeometry = new SphereGeometry(1.1, 16, 8, 0, 6.283185307179586, 0)
  const sphereMesh = new Mesh(sphereGeometry, new MeshBasicMaterial({ color: 0x93c5fd }))
  sphereMesh.scale.set(1.04, 1.04, 1.04)
  sphereScene.add(sphereMesh)
  const sphereCamera = new PerspectiveCamera(70, aspect, 0.01, 100)
  sphereCamera.position.set(0, 0, 4)
  const sphereRuntimeGeometry = sphereGeometry as unknown as RuntimeBufferGeometry
  const sphereBuffer = createThreeNativeMeshBuffer(
    4,
    1,
    0x93c5fd,
    0x0f172a,
    sphereCamera.fov,
    sphereCamera.aspect,
    sphereCamera.near,
    sphereCamera.far,
    sphereCamera.position.z,
    sphereMesh.position.x,
    sphereMesh.position.y,
    sphereMesh.position.z,
    sphereMesh.rotation.x,
    sphereMesh.rotation.y,
    sphereMesh.rotation.z,
    sphereMesh.scale.x,
    sphereMesh.scale.y,
    sphereMesh.scale.z,
    sphereRuntimeGeometry.positionArray(),
    sphereRuntimeGeometry.normalArray(),
    sphereRuntimeGeometry.indexArray(),
    sphereCamera.position.x,
    sphereCamera.position.y,
    0,
    0,
    0,
  )

  logAngleHostSmoke('upstream Three probe: real multi-mesh Scene.add')
  const clusterScene = new Scene()
  const clusterCamera = new PerspectiveCamera(70, aspect, 0.01, 100)
  clusterCamera.position.set(0.38, 0.16, 5)
  const clusterGroup = new Group()
  clusterGroup.position.set(0.02, -0.03, 0)
  clusterGroup.rotation.set(0.04, -0.08, 0.06)
  clusterGroup.scale.set(0.94, 0.94, 0.94)
  clusterScene.add(clusterGroup)
  const backPlaneGeometry = new PlaneGeometry(3.05, 2.15, 1, 1)
  const backPlane = new Mesh(backPlaneGeometry, new MeshBasicMaterial({ color: 0x334155 }))
  backPlane.position.set(0, 0, -0.42)
  backPlane.scale.set(1.04, 1, 1)
  const leftGeometry = new BoxGeometry(0.95, 0.95, 0.95, 1, 1, 1)
  const leftCube = new Mesh(leftGeometry, new MeshBasicMaterial({ color: 0xfb7185 }))
  leftCube.position.set(-1.05, -0.05, 0)
  leftCube.rotation.set(0.18, 0.28, 0)
  const rightGeometry = new SphereGeometry(0.65, 12, 8, 0, 6.283185307179586, 0)
  const rightSphere = new Mesh(rightGeometry, new MeshBasicMaterial({ color: 0x93c5fd }))
  rightSphere.position.set(0.95, 0.08, 0)
  rightSphere.rotation.set(0, -0.32, 0.12)
  rightSphere.scale.set(1.1, 0.9, 1.05)
  const ringGeometry = new TorusGeometry(0.52, 0.1, 10, 32, 6.283185307179586, 0)
  const ring = new Mesh(ringGeometry, new MeshBasicMaterial({ color: 0xf59e0b }))
  ring.position.set(0, -0.82, 0.12)
  ring.rotation.set(1.12, 0.08, -0.18)
  ring.scale.set(0.78, 0.78, 0.78)
  const columnGeometry = new CylinderGeometry(0.18, 0.38, 0.92, 18, 1, false)
  const column = new Mesh(columnGeometry, new MeshStandardMaterial({ color: 0x38bdf8 }))
  column.position.set(0.05, 0.12, 0.42)
  column.rotation.set(0.18, 0.46, -0.12)
  column.scale.set(0.72, 0.72, 0.72)
  const coneGeometry = new ConeGeometry(0.3, 0.78, 20, 1, false)
  const cone = new Mesh(coneGeometry, new MeshStandardMaterial({ color: 0xc084fc }))
  cone.position.set(-0.58, 0.54, 0.34)
  cone.rotation.set(0.12, -0.28, 0.2)
  cone.scale.set(0.72, 0.72, 0.72)
  const haloGeometry = new RingGeometry(0.18, 0.36, 28, 2, 0, 6.283185307179586)
  const halo = new Mesh(haloGeometry, new MeshBasicMaterial({ color: 0x22d3ee }))
  halo.position.set(0.64, -0.48, 0.5)
  halo.rotation.set(0.54, -0.18, 0.22)
  halo.scale.set(0.62, 0.62, 0.62)
  const topGeometry = new BoxGeometry(0.72, 0.72, 0.72, 1, 1, 1)
  const topCube = new Mesh(topGeometry, new MeshBasicMaterial({ color: 0xa3e635 }))
  topCube.position.set(0, 0.92, -0.1)
  topCube.rotation.set(0.22, 0.12, 0.42)
  topCube.scale.set(1.04, 1, 1)
  clusterGroup.add(backPlane, leftCube, rightSphere, ring, column, cone, halo, topCube)
  const runtimeClusterScene = clusterScene as unknown as RuntimeScene
  const runtimeClusterCamera = clusterCamera as unknown as RuntimePerspectiveCamera
  const clusterBuffer = createThreeNativeSceneBuffer(
    5,
    0x101820,
    runtimeClusterScene,
    runtimeClusterCamera,
  )
  logAngleHostSmoke('upstream Three probe: real buffers ready')
  logAngleHostSmoke('upstream Three buffer cube indices ' + cubeBuffer.indices.length)
  logAngleHostSmoke('upstream Three buffer torus indices ' + torusBuffer.indices.length)
  logAngleHostSmoke('upstream Three buffer normal indices ' + normalBuffer.indices.length)
  logAngleHostSmoke('upstream Three buffer sphere indices ' + sphereBuffer.indices.length)
  logAngleHostSmoke('upstream Three buffer cluster indices ' + clusterBuffer.indices.length)
  const cubeHandle = createGeaWebGLRendererMeshBuffer(renderer, cubeBuffer.demoCode, cubeBuffer.materialCode, cubeBuffer.materialColor, cubeBuffer.positions, cubeBuffer.normals, cubeBuffer.indices, cubeBuffer.colors)
  const torusHandle = createGeaWebGLRendererMeshBuffer(renderer, torusBuffer.demoCode, torusBuffer.materialCode, torusBuffer.materialColor, torusBuffer.positions, torusBuffer.normals, torusBuffer.indices, torusBuffer.colors)
  const normalHandle = createGeaWebGLRendererMeshBuffer(renderer, normalBuffer.demoCode, normalBuffer.materialCode, normalBuffer.materialColor, normalBuffer.positions, normalBuffer.normals, normalBuffer.indices, normalBuffer.colors)
  const sphereHandle = createGeaWebGLRendererMeshBuffer(renderer, sphereBuffer.demoCode, sphereBuffer.materialCode, sphereBuffer.materialColor, sphereBuffer.positions, sphereBuffer.normals, sphereBuffer.indices, sphereBuffer.colors)
  const clusterHandle = createGeaWebGLRendererMeshBuffer(renderer, clusterBuffer.demoCode, clusterBuffer.materialCode, clusterBuffer.materialColor, clusterBuffer.positions, clusterBuffer.normals, clusterBuffer.indices, clusterBuffer.colors)

  let cubeRotationX = 0
  let cubeRotationY = 0
  let torusRotationX = 0
  let torusRotationY = 0
  let sphereRotationX = 0
  let sphereRotationY = 0
  let normalRotationX = 0
  let normalRotationY = 0
  let clusterRotationX = 0
  let clusterRotationY = 0

  requestAnimationFrame(function frame(timestampMs: number): void {
    const activeDemoIndex = Math.floor(timestampMs / 3600) % 5
    const t = timestampMs / 1000
    if (activeDemoIndex === 1) {
      torusRotationX = t * 0.53
      torusRotationY = t * 0.71
      renderGeaWebGLRendererMeshBufferHandleFrame(renderer, torusHandle, torusBuffer.demoCode, torusBuffer.materialCode, torusBuffer.materialColor, torusBuffer.backgroundColor, torusBuffer.cameraFov, torusBuffer.cameraAspect, torusBuffer.cameraNear, torusBuffer.cameraFar, torusBuffer.cameraX, torusBuffer.cameraY, torusBuffer.cameraZ, torusBuffer.cameraLookAtX, torusBuffer.cameraLookAtY, torusBuffer.cameraLookAtZ, torusRotationX, torusRotationY, torusBuffer.rotationZ, timestampMs)
    } else if (activeDemoIndex === 2) {
      sphereRotationX = t * 0.43
      sphereRotationY = t * 0.62
      renderGeaWebGLRendererMeshBufferHandleFrame(renderer, sphereHandle, sphereBuffer.demoCode, sphereBuffer.materialCode, sphereBuffer.materialColor, sphereBuffer.backgroundColor, sphereBuffer.cameraFov, sphereBuffer.cameraAspect, sphereBuffer.cameraNear, sphereBuffer.cameraFar, sphereBuffer.cameraX, sphereBuffer.cameraY, sphereBuffer.cameraZ, sphereBuffer.cameraLookAtX, sphereBuffer.cameraLookAtY, sphereBuffer.cameraLookAtZ, sphereRotationX, sphereRotationY, sphereBuffer.rotationZ, timestampMs)
    } else if (activeDemoIndex === 3) {
      normalRotationX = t * 0.53
      normalRotationY = t * 0.71
      renderGeaWebGLRendererMeshBufferHandleFrame(renderer, normalHandle, normalBuffer.demoCode, normalBuffer.materialCode, normalBuffer.materialColor, normalBuffer.backgroundColor, normalBuffer.cameraFov, normalBuffer.cameraAspect, normalBuffer.cameraNear, normalBuffer.cameraFar, normalBuffer.cameraX, normalBuffer.cameraY, normalBuffer.cameraZ, normalBuffer.cameraLookAtX, normalBuffer.cameraLookAtY, normalBuffer.cameraLookAtZ, normalRotationX, normalRotationY, normalBuffer.rotationZ, timestampMs)
    } else if (activeDemoIndex === 4) {
      clusterRotationX = t * 0.47
      clusterRotationY = t * 0.58
      renderGeaWebGLRendererMeshBufferHandleFrame(renderer, clusterHandle, clusterBuffer.demoCode, clusterBuffer.materialCode, clusterBuffer.materialColor, clusterBuffer.backgroundColor, clusterBuffer.cameraFov, clusterBuffer.cameraAspect, clusterBuffer.cameraNear, clusterBuffer.cameraFar, clusterBuffer.cameraX, clusterBuffer.cameraY, clusterBuffer.cameraZ, clusterBuffer.cameraLookAtX, clusterBuffer.cameraLookAtY, clusterBuffer.cameraLookAtZ, clusterRotationX, clusterRotationY, clusterBuffer.rotationZ, timestampMs)
    } else {
      cubeRotationX = t * 0.53
      cubeRotationY = t * 0.71
      renderGeaWebGLRendererMeshBufferHandleFrame(renderer, cubeHandle, cubeBuffer.demoCode, cubeBuffer.materialCode, cubeBuffer.materialColor, cubeBuffer.backgroundColor, cubeBuffer.cameraFov, cubeBuffer.cameraAspect, cubeBuffer.cameraNear, cubeBuffer.cameraFar, cubeBuffer.cameraX, cubeBuffer.cameraY, cubeBuffer.cameraZ, cubeBuffer.cameraLookAtX, cubeBuffer.cameraLookAtY, cubeBuffer.cameraLookAtZ, cubeRotationX, cubeRotationY, cubeBuffer.rotationZ, timestampMs)
    }
    requestAnimationFrame(frame)
  })
}
