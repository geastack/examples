// A spinning cube on Apple TV: plain three.js, rendered through
// @geastack/native-webgl-angle. The tvOS target gives the program a full-screen
// Metal-backed surface before this runs, so there is no view to set up.
import { PerspectiveCamera } from 'three/src/cameras/PerspectiveCamera.js'
import { BoxGeometry } from 'three/src/geometries/BoxGeometry.js'
import { SRGBColorSpace } from 'three/src/constants.js'
import { Color } from 'three/src/math/Color.js'
import { MeshStandardMaterial } from 'three/src/materials/MeshStandardMaterial.js'
import { DirectionalLight } from 'three/src/lights/DirectionalLight.js'
import { AmbientLight } from 'three/src/lights/AmbientLight.js'
import { Mesh } from 'three/src/objects/Mesh.js'
import { WebGLRenderer } from 'three/src/renderers/WebGLRenderer.js'
import { Scene } from 'three/src/scenes/Scene.js'
import { createNativeWebGLCanvas } from '@geastack/native-webgl-angle/nativeWebGL'
import { nativeWebGLHeight, nativeWebGLSwap, nativeWebGLWidth, syncNativeWebGLSize } from '@geastack/native-webgl-angle/nativeWebGLHost'

declare function requestAnimationFrame(callback: (timestampMs: number) => void): number

const width = Math.max(1, nativeWebGLWidth())
const height = Math.max(1, nativeWebGLHeight())
const canvas = createNativeWebGLCanvas(width, height)
const context = canvas.getContext('webgl2')
if (!context) throw new Error('WebGL 2 is unavailable')

const renderer = new WebGLRenderer({
  canvas,
  context,
  antialias: true,
  powerPreference: 'high-performance',
})
renderer.outputColorSpace = SRGBColorSpace
renderer.setPixelRatio(1)
renderer.setClearColor(new Color(0x101820), 1)
renderer.setSize(width, height, false)

const scene = new Scene()
const camera = new PerspectiveCamera(55, width / height, 0.1, 100)
camera.position.set(0, 0, 4)
const cube = new Mesh(new BoxGeometry(1.5, 1.5, 1.5), new MeshStandardMaterial({ color: 0x5eead4 }))
scene.add(cube)
scene.add(new AmbientLight(0xffffff, 0.2))
const sun = new DirectionalLight(0xffffff, 1)
sun.position.set(3, 4, 5)
scene.add(sun)

function frame(timestampMs: number): void {
  camera.aspect = syncNativeWebGLSize(width / height)
  camera.updateProjectionMatrix()
  const seconds = timestampMs / 1000
  cube.rotation.x = seconds * 0.6
  cube.rotation.y = seconds * 0.9
  renderer.render(scene, camera)
  nativeWebGLSwap()
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
