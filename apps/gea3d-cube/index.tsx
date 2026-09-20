// gea3d demo: a street of buildings and trees with a looping camera flythrough,
// running through the gea3d software 3D renderer. Idiomatic three.js-style scene
// code — geometries, materials with `{ color }`, lights. Every object stays
// visible (no distance culling): full fidelity down the whole street.

import { Display } from '@geastack/core'
import { GeaRenderer } from './src/gea3d/index'
import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  Mesh,
  MeshLambertMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
} from './src/gea3d/three/index'

Display.setFlushConfig({ rows: 80, depth: 4 })
// Uncapped while profiling the ceiling.
Display.setFrameRate(90)

// A few warm/cool facade tones, picked by index so the row of buildings varies.
function buildingColor(i: number): number {
  const c = i % 4
  if (c === 0) return 0x9c6b4a
  if (c === 1) return 0x6b7a8f
  if (c === 2) return 0xb5a072
  return 0x7d5a6b
}

// Deterministic building height from an integer seed (n*7 % 16 scatters 9..24).
// Height is a per-mesh scale on a unit-height box, so a recycled building can take
// a new height without rebuilding geometry. Module-scope (not a captured closure)
// to stay on geatsc's proven lowering paths.
function applyHeight(m: Mesh, n: number): void {
  const h = 9 + ((n * 7) % 16)
  m.scale.set(1, h, 1)
  m.position.y = h / 2
}

// Scene construction lives inside a function: geatsc lowers module-scope
// `new Class()` consts as by-value globals, which mismatches the pointer
// calling convention. Locals captured by the frame closure work.
function main(): void {
  const rawW = Math.floor(window.innerWidth)
  const rawH = Math.floor(window.innerHeight)
  const width = rawW < 1 ? 1 : rawW
  const height = rawH < 1 ? 1 : rawH

  const scene = new Scene()
  scene.backgroundColor = 0x223148

  // Far plane well past the visible street: nothing is culled, everything renders.
  const camera = new PerspectiveCamera(60, width / height, 0.1, 140)

  // Ground + a long road down the z-axis (static, spans the whole wrap range).
  const ground = new Mesh(new PlaneGeometry(60, 260), new MeshLambertMaterial({ color: 0x20321f }))
  ground.rotation.x = -Math.PI / 2
  scene.add(ground)

  const road = new Mesh(new PlaneGeometry(5, 260), new MeshLambertMaterial({ color: 0x2b2b30 }))
  road.rotation.x = -Math.PI / 2
  road.position.y = 0.02
  scene.add(road)

  // Procedural street: a fixed pool of building + tree meshes, recycled. As each
  // segment drops behind the camera it jumps to the far end with a new height, so
  // the flythrough is endless without allocating a mesh mid-flight. The frame loop
  // captures only heap objects (arrays/meshes) — no mutated primitive, no material
  // mutation — matching the closure-capture patterns geatsc handles.
  const NUM = 16
  const SPACING = 6

  const lefts: Mesh[] = []
  const rights: Mesh[] = []

  for (let i = 0; i < NUM; i++) {
    const z = 12 - i * SPACING

    const left = new Mesh(new BoxGeometry(3.4, 1, 4), new MeshLambertMaterial({ color: buildingColor(i) }))
    left.position.set(-4.8, 0, z)
    applyHeight(left, i * 2)
    scene.add(left)
    lefts.push(left)

    const right = new Mesh(new BoxGeometry(3.4, 1, 4), new MeshLambertMaterial({ color: buildingColor(i + 2) }))
    right.position.set(4.8, 0, z)
    applyHeight(right, i * 2 + 1)
    scene.add(right)
    rights.push(right)

  }

  scene.add(new AmbientLight(0xffffff, 0.85))
  const sun = new DirectionalLight(0xfff4e0, 0.55)
  sun.position.set(-3, 6, 2)
  scene.add(sun)

  // Freeze the static meshes (ground/road/lights): only the scrolling buildings get
  // re-dirtied each frame, so scene.updateMatrixWorld() stays a cheap walk.
  scene.updateMatrixWorld(true)
  scene.matrixAutoUpdate = false
  const staticKids = scene.children
  for (let i = 0; i < staticKids.length; i++) staticKids[i].matrixAutoUpdate = false

  const renderer = new GeaRenderer()
  // Full resolution: 1px motion steps (half-res quantized to 2px = juddery).
  renderer.setSize(width, height)

  // Camera is FIXED; the world scrolls toward it. This is deliberate: geatsc does not
  // persist a closure-captured mutable primitive across frames, so we can't remember a
  // start time to anchor a moving camera — using requestAnimationFrame's absolute
  // timestamp raw sent the camera thousands of units past the street (blank). Instead
  // every building's z is a pure function of `t`: it scrolls forward and wraps back
  // BEHIND the camera (off-screen), which is the "destroy + recreate" recycle — new
  // height each pass — with no per-frame state to lose.
  const camZ = 8
  camera.position.set(0, 2.4, camZ)
  camera.lookAt(0, 2.6, camZ - 12)
  const wrapLen = NUM * SPACING // 96
  const back = camZ + 16 // wrap point, just behind the camera

  const frame = (timestampMs: number) => {
    const t = timestampMs * 0.001
    for (let i = 0; i < NUM; i++) {
      // Phase marches with time; each slot offset by SPACING so they're evenly spread.
      const phase = t * 24 + i * SPACING
      const cycles = Math.floor(phase / wrapLen)
      const z = back - (phase - cycles * wrapLen) // z in [back - 96, back] = [-72, 24]
      // Variety seed changes only when this slot wraps (cycles increments) — stable
      // height during a pass, a fresh building on each recycle.
      const seed = cycles * NUM + i

      lefts[i].position.z = z
      applyHeight(lefts[i], seed * 2)
      lefts[i].updateMatrix()

      rights[i].position.z = z
      applyHeight(rights[i], seed * 2 + 1)
      rights[i].updateMatrix()

    }

    renderer.render(scene, camera)
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

main()
