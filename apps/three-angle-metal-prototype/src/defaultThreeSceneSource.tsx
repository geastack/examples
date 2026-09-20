import { Canvas } from '@react-three/fiber'
import {
  THREE_SCENE_BACKGROUND_COLOR,
  THREE_SCENE_CAMERA_ASPECT,
  THREE_SCENE_CAMERA_FAR,
  THREE_SCENE_CAMERA_FOV,
  THREE_SCENE_CAMERA_LOOK_AT_X,
  THREE_SCENE_CAMERA_LOOK_AT_Y,
  THREE_SCENE_CAMERA_LOOK_AT_Z,
  THREE_SCENE_CAMERA_NEAR,
  THREE_SCENE_CAMERA_X,
  THREE_SCENE_CAMERA_Y,
  THREE_SCENE_CAMERA_Z,
  THREE_SCENE_DEMO_CODE,
  THREE_SCENE_MATERIAL_CODE,
  THREE_SCENE_MATERIAL_COLOR,
  THREE_SCENE_ROTATION_Z,
  createCombinedThreeSceneBufferValues,
  createThreeSceneBufferValues,
  createThreeScenePayload,
  type ThreeSceneElement,
} from './threeJsx'
import {
  createGeaWebGLRendererMeshBuffer,
  type GeaWebGLRenderer,
  renderGeaWebGLRendererMeshBufferHandleFrame,
} from './angleHost'

type DemoScale = number | readonly number[]

interface DemoMeshProps {
  position?: readonly number[]
  rotation?: readonly number[]
  scale?: DemoScale
  color?: number | string
}

interface SizedDemoMeshProps extends DemoMeshProps {
  size?: number
  radius?: number
}

interface DemoGroupProps {
  position?: readonly number[]
  rotation?: readonly number[]
  scale?: DemoScale
  children?: object | readonly object[]
}

function DemoGroup({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  children,
}: DemoGroupProps) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {children}
    </group>
  )
}

function DemoCube({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  color = '#5eead4',
  size = 1.4,
}: SizedDemoMeshProps) {
  return (
    <mesh position={position} rotation={rotation} scale={scale}>
      <boxGeometry args={[size, size, size, 1, 1, 1]} />
      <meshStandardMaterial args={[{ color, roughness: 0.55, metalness: 0.05 }]} />
    </mesh>
  )
}

function DemoTorus({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  color = 0xfbbf24,
}: DemoMeshProps) {
  return (
    <mesh position={position} rotation={rotation} scale={scale}>
      <torusKnotGeometry args={[0.82, 0.22, 128, 16, 2, 3]} />
      <meshBasicMaterial args={[{ color }]} />
    </mesh>
  )
}

function DemoNormalBox({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: DemoMeshProps) {
  return (
    <mesh position={position} rotation={rotation} scale={scale}>
      <boxGeometry args={[1.6, 1.6, 1.6, 4, 4, 4]} />
      <meshNormalMaterial />
    </mesh>
  )
}

function DemoSphere({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  color = 0x93c5fd,
  radius = 1.1,
}: SizedDemoMeshProps) {
  return (
    <mesh position={position} rotation={rotation} scale={scale}>
      <sphereGeometry args={[radius, 48, 24, 0, 6.283185307179586, 0]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

function DemoCircle({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  color = '#f472b6',
  radius = 1.1,
}: SizedDemoMeshProps) {
  return (
    <mesh position={position} rotation={rotation} scale={scale}>
      <circleGeometry args={[radius, 64, 0, 6.283185307179586]} />
      <meshLambertMaterial args={[{ color }]} />
    </mesh>
  )
}

function createSceneBufferHandle(renderer: GeaWebGLRenderer, scene: ThreeSceneElement): number {
  const positions = createThreeSceneBufferValues(scene, 0)
  const normals = createThreeSceneBufferValues(scene, 1)
  const indices = createThreeSceneBufferValues(scene, 2)
  const colors = createThreeSceneBufferValues(scene, 3)
  return createGeaWebGLRendererMeshBuffer(
    renderer,
    scene[THREE_SCENE_DEMO_CODE],
    scene[THREE_SCENE_MATERIAL_CODE],
    scene[THREE_SCENE_MATERIAL_COLOR],
    positions,
    normals,
    indices,
    colors,
  )
}

function createMultiSceneBufferHandle(renderer: GeaWebGLRenderer, scenes: ThreeSceneElement[]): number {
  const scene = scenes[0]
  const positions = createCombinedThreeSceneBufferValues(scenes, 0)
  const normals = createCombinedThreeSceneBufferValues(scenes, 1)
  const indices = createCombinedThreeSceneBufferValues(scenes, 2)
  const colors = createCombinedThreeSceneBufferValues(scenes, 3)
  return createGeaWebGLRendererMeshBuffer(
    renderer,
    scene[THREE_SCENE_DEMO_CODE],
    scene[THREE_SCENE_MATERIAL_CODE],
    scene[THREE_SCENE_MATERIAL_COLOR],
    positions,
    normals,
    indices,
    colors,
  )
}

function renderSceneBufferFrame(
  renderer: GeaWebGLRenderer,
  handle: number,
  scene: ThreeSceneElement,
  rotationX: number,
  rotationY: number,
  timestampMs: number,
): void {
  renderGeaWebGLRendererMeshBufferHandleFrame(
    renderer,
    handle,
    scene[THREE_SCENE_DEMO_CODE],
    scene[THREE_SCENE_MATERIAL_CODE],
    scene[THREE_SCENE_MATERIAL_COLOR],
    scene[THREE_SCENE_BACKGROUND_COLOR],
    scene[THREE_SCENE_CAMERA_FOV],
    scene[THREE_SCENE_CAMERA_ASPECT],
    scene[THREE_SCENE_CAMERA_NEAR],
    scene[THREE_SCENE_CAMERA_FAR],
    scene[THREE_SCENE_CAMERA_X],
    scene[THREE_SCENE_CAMERA_Y],
    scene[THREE_SCENE_CAMERA_Z],
    scene[THREE_SCENE_CAMERA_LOOK_AT_X],
    scene[THREE_SCENE_CAMERA_LOOK_AT_Y],
    scene[THREE_SCENE_CAMERA_LOOK_AT_Z],
    rotationX,
    rotationY,
    scene[THREE_SCENE_ROTATION_Z],
    timestampMs,
  )
}

function renderMultiSceneBufferFrame(
  renderer: GeaWebGLRenderer,
  handle: number,
  scenes: ThreeSceneElement[],
  rotationX: number,
  rotationY: number,
  timestampMs: number,
): void {
  renderSceneBufferFrame(renderer, handle, scenes[0], rotationX, rotationY, timestampMs)
}

export function startThreeFrameLoop(
  renderer: GeaWebGLRenderer,
  aspect: number,
): void {
  const cubeScene = (
    <Canvas demoCode={1} camera={{ fov: 70, aspect, near: 0.01, far: 100, positionX: 0.32, positionY: 0.12, positionZ: 4, lookAtX: 0, lookAtY: 0, lookAtZ: 0 }}>
      <>
        <color attach="background" args={['#101820']} />
        <ambientLight color="#dbeafe" intensity={0.35} />
        <directionalLight color="white" positionX={3} positionY={4} positionZ={5} intensity={0.8} />
        <DemoCube color="#5eead4" scale={1.02} />
      </>
    </Canvas>
  ) as ThreeSceneElement

  const torusScene = (
    <scene demoCode={2}>
      <color attach="background" args={['#111827']} />
      <perspectiveCamera args={[70, aspect, 0.01, 100]} position={[0, 0, 4]} lookAt={[0, 0, 0]} />
      <DemoGroup rotation={[0, 0, 0.18]} scale={1.08}>
        <DemoTorus color={0xfbbf24} />
      </DemoGroup>
    </scene>
  ) as ThreeSceneElement

  const normalScene = (
    <scene demoCode={3}>
      <color attach="background" args={['#0b1020']} />
      <perspectiveCamera fov={70} aspect={aspect} near={0.01} far={100} positionZ={4} lookAtZ={0} />
      <DemoNormalBox scale={[1, 1.18, 0.86]} />
    </scene>
  ) as ThreeSceneElement

  const sphereScene = (
    <scene demoCode={4}>
      <color attach="background" args={['#0f172a']} />
      <perspectiveCamera fov={70} aspect={aspect} near={0.01} far={100} positionZ={4} lookAtZ={0} />
      <DemoSphere color={0x93c5fd} scale={1.04} radius={1.1} />
    </scene>
  ) as ThreeSceneElement

  const circleScene = (
    <scene demoCode={6}>
      <color attach="background" args={['#16111f']} />
      <perspectiveCamera fov={70} aspect={aspect} near={0.01} far={100} position={[0.08, 0.08, 3.7]} lookAt={[0, 0, 0]} />
      <ambientLight color="#fce7f3" intensity={0.36} />
      <directionalLight color="#ffffff" position={[1.6, 2.2, 3.2]} intensity={0.72} />
      <DemoCircle rotation={[0.12, -0.22, 0.34]} scale={[1.05, 0.86, 1]} color="#f472b6" radius={1.05} />
    </scene>
  ) as ThreeSceneElement

  const clusterScene = (
    <scene demoCode={5}>
      <color attach="background" args={['#101820']} />
      <perspectiveCamera args={[70, aspect, 0.01, 100]} position={[0.38, 0.16, 5]} lookAt={[0, 0, 0]} />
      <ambientLight color="#e0f2fe" intensity={0.28} />
      <directionalLight color="#ffffff" position={[2.5, 3.5, 4.25]} intensity={0.75} />
      <group rotationX={0.04} rotationY={-0.08} rotationZ={0} scale={0.92}>
        <mesh positionZ={-0.46} scaleX={1.04}>
          <planeGeometry args={[3.05, 2.15, 1, 1]} />
          <meshBasicMaterial args={[{ color: '#334155' }]} />
        </mesh>
        <DemoGroup position={[-1.05, -0.05, 0]} rotation={[0.18, 0.28, 0]}>
          <DemoCube color="#fb7185" size={0.95} />
        </DemoGroup>
        <DemoSphere position={[0.95, 0.08, 0]} rotation={[0, -0.32, 0.12]} scale={[1.1, 0.9, 1.05]} color={0x93c5fd} radius={0.65} />
        <mesh position={[0, -0.82, 0.12]} rotation={[1.12, 0.08, -0.18]} scale={0.78}>
          <torusGeometry args={[0.52, 0.1, 10, 32, 6.283185307179586, 0]} />
          <meshBasicMaterial args={[{ color: '#f59e0b' }]} />
        </mesh>
        <mesh position={[0.05, 0.12, 0.42]} rotation={[0.18, 0.46, -0.12]} scale={0.72}>
          <cylinderGeometry attach="geometry" args={[0.18, 0.38, 0.92, 18, 1, false]} />
          <meshLambertMaterial attach="material" args={[{ color: '#38bdf8' }]} />
        </mesh>
        <mesh position={[-0.58, 0.54, 0.34]} rotation={[0.12, -0.28, 0.2]} scale={0.72}>
          <coneGeometry attach="geometry" args={[0.3, 0.78, 20, 1, false]} />
          <meshStandardMaterial attach="material" args={[{ color: '#c084fc' }]} />
        </mesh>
        <mesh position={[0.64, -0.48, 0.5]} rotation={[0.54, -0.18, 0.22]} scale={0.62}>
          <ringGeometry attach="geometry" args={[0.18, 0.36, 28, 2, 0, 6.283185307179586]} />
          <meshBasicMaterial attach="material" args={[{ color: '#22d3ee' }]} />
        </mesh>
        <DemoCube position={[0, 0.92, -0.1]} rotation={[0.22, 0.12, 0.42]} scale={[0.75, 0.72, 0.75]} color="#a3e635" size={0.72} />
      </group>
    </scene>
  ) as ThreeSceneElement[]

  const cubeHandle = createSceneBufferHandle(renderer, cubeScene)
  const torusHandle = createSceneBufferHandle(renderer, torusScene)
  const normalHandle = createSceneBufferHandle(renderer, normalScene)
  const sphereHandle = createSceneBufferHandle(renderer, sphereScene)
  const circleHandle = createSceneBufferHandle(renderer, circleScene)
  const clusterHandle = createMultiSceneBufferHandle(renderer, clusterScene)
  let cubeRotationX = 0
  let cubeRotationY = 0
  let torusRotationX = 0
  let torusRotationY = 0
  let sphereRotationX = 0
  let sphereRotationY = 0
  let normalRotationX = 0
  let normalRotationY = 0
  let circleRotationX = 0
  let circleRotationY = 0
  let clusterRotationX = 0
  let clusterRotationY = 0

  requestAnimationFrame(function frame(timestampMs: number): void {
    const activeDemoIndex = Math.floor(timestampMs / 3200) % 6
    const t = timestampMs / 1000
    if (activeDemoIndex === 1) {
      torusRotationX = t * 0.53
      torusRotationY = t * 0.71
      renderSceneBufferFrame(renderer, torusHandle, torusScene, torusRotationX, torusRotationY, timestampMs)
    } else if (activeDemoIndex === 2) {
      sphereRotationX = t * 0.43
      sphereRotationY = t * 0.62
      renderSceneBufferFrame(renderer, sphereHandle, sphereScene, sphereRotationX, sphereRotationY, timestampMs)
    } else if (activeDemoIndex === 3) {
      normalRotationX = t * 0.53
      normalRotationY = t * 0.71
      renderSceneBufferFrame(renderer, normalHandle, normalScene, normalRotationX, normalRotationY, timestampMs)
    } else if (activeDemoIndex === 4) {
      clusterRotationX = t * 0.47
      clusterRotationY = t * 0.58
      renderMultiSceneBufferFrame(renderer, clusterHandle, clusterScene, clusterRotationX, clusterRotationY, timestampMs)
    } else if (activeDemoIndex === 5) {
      circleRotationX = t * 0.27
      circleRotationY = t * 0.51
      renderSceneBufferFrame(renderer, circleHandle, circleScene, circleRotationX, circleRotationY, timestampMs)
    } else {
      cubeRotationX = t * 0.53
      cubeRotationY = t * 0.71
      renderSceneBufferFrame(renderer, cubeHandle, cubeScene, cubeRotationX, cubeRotationY, timestampMs)
    }
    requestAnimationFrame(frame)
  })
}
