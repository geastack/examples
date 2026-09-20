import { Canvas } from '@react-three/fiber'
import {
  createGeaWebGLRendererMeshBuffer,
  type GeaWebGLRenderer,
  logAngleHostSmoke,
  renderGeaWebGLRendererMeshBufferHandleFrame,
} from './angleHost'
import type {
  ThreeBufferSceneElement,
} from './threeJsx'

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

export function startThreeFrameLoop(
  renderer: GeaWebGLRenderer,
  aspect: number,
): void {
  logAngleHostSmoke('upstream Three JSX: R3F-style scene source')
  const cubeScene = (
    <Canvas demoCode={1} camera={{ fov: 70, aspect, near: 0.01, far: 100, positionX: 0.32, positionY: 0.12, positionZ: 4, lookAtX: 0, lookAtY: 0, lookAtZ: 0 }}>
      <>
        <color attach="background" args={['#101820']} />
        <ambientLight color="#dbeafe" intensity={0.35} />
        <directionalLight color="white" positionX={3} positionY={4} positionZ={5} intensity={0.8} />
        <DemoCube color="#5eead4" scale={1.02} />
      </>
    </Canvas>
  ) as unknown as ThreeBufferSceneElement

  const torusScene = (
    <scene demoCode={2}>
      <color attach="background" args={['#111827']} />
      <perspectiveCamera args={[70, aspect, 0.01, 100]} position={[0, 0, 4]} lookAt={[0, 0, 0]} />
      <DemoGroup rotation={[0, 0, 0.18]} scale={1.08}>
        <DemoTorus color={0xfbbf24} />
      </DemoGroup>
    </scene>
  ) as unknown as ThreeBufferSceneElement

  const normalScene = (
    <scene demoCode={3}>
      <color attach="background" args={['#0b1020']} />
      <perspectiveCamera fov={70} aspect={aspect} near={0.01} far={100} positionZ={4} lookAtZ={0} />
      <DemoNormalBox scale={[1, 1.18, 0.86]} />
    </scene>
  ) as unknown as ThreeBufferSceneElement

  const sphereScene = (
    <scene demoCode={4}>
      <color attach="background" args={['#0f172a']} />
      <perspectiveCamera fov={70} aspect={aspect} near={0.01} far={100} positionZ={4} lookAtZ={0} />
      <DemoSphere color={0x93c5fd} scale={1.04} radius={1.1} />
    </scene>
  ) as unknown as ThreeBufferSceneElement

  const circleScene = (
    <scene demoCode={7}>
      <color attach="background" args={['#16111f']} />
      <perspectiveCamera fov={70} aspect={aspect} near={0.01} far={100} position={[0.08, 0.08, 3.7]} lookAt={[0, 0, 0]} />
      <ambientLight color="#fce7f3" intensity={0.36} />
      <directionalLight color="#ffffff" position={[1.6, 2.2, 3.2]} intensity={0.72} />
      <DemoCircle rotation={[0.12, -0.22, 0.34]} scale={[1.05, 0.86, 1]} color="#f472b6" radius={1.05} />
    </scene>
  ) as unknown as ThreeBufferSceneElement

  const pairScene = (
    <scene demoCode={6}>
      <color attach="background" args={['#111827']} />
      <perspectiveCamera fov={70} aspect={aspect} near={0.01} far={100} position={[0.22, 0.08, 4.35]} lookAt={[0, 0, 0]} />
      <DemoCube position={[-0.72, -0.02, 0]} rotation={[0.18, 0.28, 0]} scale={0.78} color="#f97316" size={1.08} />
      <mesh position={[0.78, 0.06, 0]} rotation={[0, -0.24, 0.12]} scale={[0.86, 1.02, 0.92]}>
        <sphereGeometry args={[0.72, 48, 24, 0, 6.283185307179586, 0]} />
        <meshPhongMaterial color={0x22d3ee} shininess={42} />
      </mesh>
    </scene>
  ) as unknown as ThreeBufferSceneElement

  const clusterScene = (
    <scene demoCode={5}>
      <color attach="background" args={['#101820']} />
      <perspectiveCamera args={[70, aspect, 0.01, 100]} position={[0.38, 0.16, 5]} lookAt={[0, 0, 0]} />
      <ambientLight color="#e0f2fe" intensity={0.28} />
      <directionalLight color="#ffffff" position={[2.5, 3.5, 4.25]} intensity={0.75} />
      <group rotationX={0.04} rotationY={-0.08} rotationZ={0} scale={0.92}>
        <mesh positionZ={-0.46} scaleX={1.04}>
          <planeGeometry args={[3.05, 2.15, 1, 1]} />
          <meshLambertMaterial args={[{ color: '#334155' }]} />
        </mesh>
        <DemoGroup position={[-1.05, -0.05, 0]} rotation={[0.18, 0.28, 0]}>
          <DemoCube color="#fb7185" size={0.95} />
        </DemoGroup>
        <DemoSphere position={[0.95, 0.08, 0]} rotation={[0, -0.32, 0.12]} scale={[1.1, 0.9, 1.05]} color={0x93c5fd} radius={0.65} />
        <mesh position={[0, -0.82, 0.12]} rotation={[1.12, 0.08, -0.18]} scale={0.78}>
          <torusGeometry args={[0.52, 0.1, 10, 32, 6.283185307179586, 0]} />
          <meshPhongMaterial args={[{ color: '#f59e0b' }]} />
        </mesh>
        <mesh position={[0.05, 0.12, 0.42]} rotation={[0.18, 0.46, -0.12]} scale={0.72}>
          <cylinderGeometry attach="geometry" args={[0.18, 0.38, 0.92, 18, 1, false]} />
          <meshStandardMaterial attach="material" args={[{ color: '#38bdf8' }]} />
        </mesh>
        <mesh position={[-0.58, 0.54, 0.34]} rotation={[0.12, -0.28, 0.2]} scale={0.72}>
          <coneGeometry attach="geometry" args={[0.3, 0.78, 20, 1, false]} />
          <meshNormalMaterial attach="material" />
        </mesh>
        <mesh position={[0.64, -0.48, 0.5]} rotation={[0.54, -0.18, 0.22]} scale={0.62}>
          <ringGeometry attach="geometry" args={[0.18, 0.36, 28, 2, 0, 6.283185307179586]} />
          <meshStandardMaterial attach="material" args={[{ color: '#22d3ee' }]} />
        </mesh>
        <DemoCube position={[0, 0.92, -0.1]} rotation={[0.22, 0.12, 0.42]} scale={[0.75, 0.72, 0.75]} color="#a3e635" size={0.72} />
      </group>
    </scene>
  ) as unknown as ThreeBufferSceneElement

  const cubeHandle = createGeaWebGLRendererMeshBuffer(renderer, cubeScene.demoCode, cubeScene.materialCode, cubeScene.materialColor, cubeScene.positions, cubeScene.normals, cubeScene.indices, cubeScene.colors)
  const torusHandle = createGeaWebGLRendererMeshBuffer(renderer, torusScene.demoCode, torusScene.materialCode, torusScene.materialColor, torusScene.positions, torusScene.normals, torusScene.indices, torusScene.colors)
  const normalHandle = createGeaWebGLRendererMeshBuffer(renderer, normalScene.demoCode, normalScene.materialCode, normalScene.materialColor, normalScene.positions, normalScene.normals, normalScene.indices, normalScene.colors)
  const sphereHandle = createGeaWebGLRendererMeshBuffer(renderer, sphereScene.demoCode, sphereScene.materialCode, sphereScene.materialColor, sphereScene.positions, sphereScene.normals, sphereScene.indices, sphereScene.colors)
  const circleHandle = createGeaWebGLRendererMeshBuffer(renderer, circleScene.demoCode, circleScene.materialCode, circleScene.materialColor, circleScene.positions, circleScene.normals, circleScene.indices, circleScene.colors)
  const pairHandle = createGeaWebGLRendererMeshBuffer(renderer, pairScene.demoCode, pairScene.materialCode, pairScene.materialColor, pairScene.positions, pairScene.normals, pairScene.indices, pairScene.colors)
  const clusterHandle = createGeaWebGLRendererMeshBuffer(renderer, clusterScene.demoCode, clusterScene.materialCode, clusterScene.materialColor, clusterScene.positions, clusterScene.normals, clusterScene.indices, clusterScene.colors)
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
  let pairRotationX = 0
  let pairRotationY = 0
  let clusterRotationX = 0
  let clusterRotationY = 0

  requestAnimationFrame(function frame(timestampMs: number): void {
    const activeDemoIndex = Math.floor(timestampMs / 3000) % 7
    const t = timestampMs / 1000
    if (activeDemoIndex === 1) {
      torusRotationX = t * 0.53
      torusRotationY = t * 0.71
      renderGeaWebGLRendererMeshBufferHandleFrame(renderer, torusHandle, torusScene.demoCode, torusScene.materialCode, torusScene.materialColor, torusScene.backgroundColor, torusScene.cameraFov, torusScene.cameraAspect, torusScene.cameraNear, torusScene.cameraFar, torusScene.cameraX, torusScene.cameraY, torusScene.cameraZ, torusScene.cameraLookAtX, torusScene.cameraLookAtY, torusScene.cameraLookAtZ, torusRotationX, torusRotationY, torusScene.rotationZ, timestampMs)
    } else if (activeDemoIndex === 2) {
      sphereRotationX = t * 0.43
      sphereRotationY = t * 0.62
      renderGeaWebGLRendererMeshBufferHandleFrame(renderer, sphereHandle, sphereScene.demoCode, sphereScene.materialCode, sphereScene.materialColor, sphereScene.backgroundColor, sphereScene.cameraFov, sphereScene.cameraAspect, sphereScene.cameraNear, sphereScene.cameraFar, sphereScene.cameraX, sphereScene.cameraY, sphereScene.cameraZ, sphereScene.cameraLookAtX, sphereScene.cameraLookAtY, sphereScene.cameraLookAtZ, sphereRotationX, sphereRotationY, sphereScene.rotationZ, timestampMs)
    } else if (activeDemoIndex === 3) {
      normalRotationX = t * 0.53
      normalRotationY = t * 0.71
      renderGeaWebGLRendererMeshBufferHandleFrame(renderer, normalHandle, normalScene.demoCode, normalScene.materialCode, normalScene.materialColor, normalScene.backgroundColor, normalScene.cameraFov, normalScene.cameraAspect, normalScene.cameraNear, normalScene.cameraFar, normalScene.cameraX, normalScene.cameraY, normalScene.cameraZ, normalScene.cameraLookAtX, normalScene.cameraLookAtY, normalScene.cameraLookAtZ, normalRotationX, normalRotationY, normalScene.rotationZ, timestampMs)
    } else if (activeDemoIndex === 4) {
      clusterRotationX = t * 0.47
      clusterRotationY = t * 0.58
      renderGeaWebGLRendererMeshBufferHandleFrame(renderer, clusterHandle, clusterScene.demoCode, clusterScene.materialCode, clusterScene.materialColor, clusterScene.backgroundColor, clusterScene.cameraFov, clusterScene.cameraAspect, clusterScene.cameraNear, clusterScene.cameraFar, clusterScene.cameraX, clusterScene.cameraY, clusterScene.cameraZ, clusterScene.cameraLookAtX, clusterScene.cameraLookAtY, clusterScene.cameraLookAtZ, clusterRotationX, clusterRotationY, clusterScene.rotationZ, timestampMs)
    } else if (activeDemoIndex === 5) {
      pairRotationX = t * 0.39
      pairRotationY = t * 0.56
      renderGeaWebGLRendererMeshBufferHandleFrame(renderer, pairHandle, pairScene.demoCode, pairScene.materialCode, pairScene.materialColor, pairScene.backgroundColor, pairScene.cameraFov, pairScene.cameraAspect, pairScene.cameraNear, pairScene.cameraFar, pairScene.cameraX, pairScene.cameraY, pairScene.cameraZ, pairScene.cameraLookAtX, pairScene.cameraLookAtY, pairScene.cameraLookAtZ, pairRotationX, pairRotationY, pairScene.rotationZ, timestampMs)
    } else if (activeDemoIndex === 6) {
      circleRotationX = t * 0.27
      circleRotationY = t * 0.51
      renderGeaWebGLRendererMeshBufferHandleFrame(renderer, circleHandle, circleScene.demoCode, circleScene.materialCode, circleScene.materialColor, circleScene.backgroundColor, circleScene.cameraFov, circleScene.cameraAspect, circleScene.cameraNear, circleScene.cameraFar, circleScene.cameraX, circleScene.cameraY, circleScene.cameraZ, circleScene.cameraLookAtX, circleScene.cameraLookAtY, circleScene.cameraLookAtZ, circleRotationX, circleRotationY, circleScene.rotationZ, timestampMs)
    } else {
      cubeRotationX = t * 0.53
      cubeRotationY = t * 0.71
      renderGeaWebGLRendererMeshBufferHandleFrame(renderer, cubeHandle, cubeScene.demoCode, cubeScene.materialCode, cubeScene.materialColor, cubeScene.backgroundColor, cubeScene.cameraFov, cubeScene.cameraAspect, cubeScene.cameraNear, cubeScene.cameraFar, cubeScene.cameraX, cubeScene.cameraY, cubeScene.cameraZ, cubeScene.cameraLookAtX, cubeScene.cameraLookAtY, cubeScene.cameraLookAtZ, cubeRotationX, cubeRotationY, cubeScene.rotationZ, timestampMs)
    }
    requestAnimationFrame(frame)
  })
}
