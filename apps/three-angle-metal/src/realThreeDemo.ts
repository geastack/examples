import { PerspectiveCamera } from 'three/src/cameras/PerspectiveCamera.js'
import { BoxGeometry } from 'three/src/geometries/BoxGeometry.js'
import { SRGBColorSpace } from 'three/src/constants.js'
import { ColorManagement } from 'three/src/math/ColorManagement.js'
import { Color } from 'three/src/math/Color.js'
import { MeshBasicMaterial } from 'three/src/materials/MeshBasicMaterial.js'
import { Mesh } from 'three/src/objects/Mesh.js'
import { WebGLRenderer } from 'three/src/renderers/WebGLRenderer.js'
import { WebGLRenderList } from 'three/src/renderers/webgl/WebGLRenderLists.js'
import { ShaderLib } from 'three/src/renderers/shaders/ShaderLib.js'
import { Scene } from 'three/src/scenes/Scene.js'
import { createNativeWebGLCanvas } from '@geastack/native-webgl-angle/nativeWebGL'
import {
  nativeWebGLHeight,
  nativeWebGLSwap,
  nativeWebGLWidth,
  syncNativeWebGLSize,
} from '@geastack/native-webgl-angle/nativeWebGLHost'

export function startRealThreeFrameLoop(width: number, height: number, fallbackAspect: number): void {
  console.error("[three-angle-metal] startRealThreeFrameLoop begin")
  const canvas = createNativeWebGLCanvas(width, height)
  console.error("[three-angle-metal] NativeWebGLCanvas created")
  const context = canvas.getContext('webgl2')
  console.error(context ? "[three-angle-metal] NativeWebGL context ready" : "[three-angle-metal] NativeWebGL context missing")
  if (!context) return

  console.error("[three-angle-metal] constructing WebGLRenderer")
  const renderer = new WebGLRenderer({
    alpha: true,
    antialias: false,
    // No cast. `createNativeWebGLCanvas` returns a `NativeWebGLCanvas` and its
    // `getContext` a `NativeWebGL2RenderingContext` -- both real classes with
    // exactly the surface three's own source touches. three's `WebGLRenderer`
    // is compiled from source here, where `canvas` and `context` are
    // unannotated parameters that impose no type at all; the DOM types these
    // used to be asserted into come from `@types/three`, which this program
    // does not use. Erasing a real class into an ambient declaration with no
    // implementation is what made the whole renderer's `parameters` object --
    // and everything downstream of it -- dynamic. Same fix as the sibling
    // three.js app (651d92b).
    canvas,
    context,
    depth: true,
    powerPreference: 'high-performance',
    premultipliedAlpha: true,
    stencil: true,
  })
  console.error("[three-angle-metal] WebGLRenderer constructed")
  renderer.outputColorSpace = SRGBColorSpace
  console.error("[three-angle-metal] renderer outputColorSpace=" + renderer.outputColorSpace)
  console.error("[three-angle-metal] renderer target null=" + (renderer.getRenderTarget() === null))
  console.error("[three-angle-metal] ColorManagement workingColorSpace=" + ColorManagement.workingColorSpace)
  console.error("[three-angle-metal] ColorManagement transfer=" + ColorManagement.getTransfer(ColorManagement.workingColorSpace))
  renderer.setPixelRatio(1)
  console.error("[three-angle-metal] renderer pixel ratio set")
  renderer.setClearColor(new Color(0x101820), 1)
  console.error("[three-angle-metal] renderer clear color set")
  renderer.setSize(width, height, false)
  console.error("[three-angle-metal] renderer size set")

  const scene = new Scene()
  console.error("[three-angle-metal] scene created")
  const camera = new PerspectiveCamera(55, fallbackAspect, 0.1, 100)
  camera.position.set(0, 0, 4)
  console.error("[three-angle-metal] camera created")

  const cube = new Mesh(
    new BoxGeometry(1.5, 1.5, 1.5),
    new MeshBasicMaterial({ color: 0x5eead4 }),
  )
  cube.frustumCulled = false
  scene.add(cube)
  console.error("[three-angle-metal] cube added")
  console.error("[three-angle-metal] material probe type=" + cube.material.type + " isBasic=" + cube.material.isMeshBasicMaterial)
  console.error(
    "[three-angle-metal] shader probe basic vertexLen="
    + ShaderLib.basic.vertexShader.length
    + " fragmentLen="
    + ShaderLib.basic.fragmentShader.length
  )
  const renderListProbe = new WebGLRenderList(renderer.properties)
  renderListProbe.init()
  renderListProbe.push(cube, cube.geometry, cube.material, 0, 0, null)
  console.error(
    "[three-angle-metal] render list probe opaque="
    + renderListProbe.opaque.length
    + " transparent="
    + renderListProbe.transparent.length
    + " transmissive="
    + renderListProbe.transmissive.length
  )
  console.error(
    "[three-angle-metal] scene probe after add children="
    + scene.children.length
    + " sceneVisible="
    + scene.visible
    + " sceneIsScene="
    + (scene as unknown as { isScene?: boolean }).isScene
    + " cubeIsObject3D="
    + (cube as unknown as { isObject3D?: boolean }).isObject3D
    + " cubeIsMesh="
    + (cube as unknown as { isMesh?: boolean }).isMesh
    + " cubeVisible="
    + cube.visible
    + " cubeFrustumCulled="
    + cube.frustumCulled
    + " materialVisible="
    + cube.material.visible
    + " sceneLayer="
    + scene.layers.mask
    + " cubeLayer="
    + cube.layers.mask
    + " cameraLayer="
    + camera.layers.mask
    + " layerTest="
    + cube.layers.test(camera.layers)
  )

  function resizeRenderer(): void {
    const aspect = syncNativeWebGLSize(fallbackAspect)
    const pixelWidth = Math.max(1, Math.floor(nativeWebGLWidth()))
    const pixelHeight = Math.max(1, Math.floor(nativeWebGLHeight()))
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth
      canvas.height = pixelHeight
      canvas.clientWidth = pixelWidth
      canvas.clientHeight = pixelHeight
      renderer.setSize(pixelWidth, pixelHeight, false)
    }
    camera.aspect = aspect
    camera.updateProjectionMatrix()
  }

  console.error("[three-angle-metal] scheduling render RAF")
  let debugFrameCount = 0
  requestAnimationFrame(function renderFrame(timestampMs: number): void {
    resizeRenderer()
    const seconds = timestampMs / 1000
    cube.rotation.x = seconds * 0.6
    cube.rotation.y = seconds * 0.9
    renderer.render(scene, camera)
    if (debugFrameCount < 12 || debugFrameCount % 60 === 0) {
      console.error(
        "[three-angle-metal] render stats frame="
        + debugFrameCount
        + " calls="
        + renderer.info.render.calls
        + " triangles="
        + renderer.info.render.triangles
        + " points="
        + renderer.info.render.points
        + " lines="
        + renderer.info.render.lines
        + " children="
        + scene.children.length
        + " cubeParent="
        + (cube.parent === scene)
        + " cubeVisible="
        + cube.visible
        + " cubeIsMesh="
        + (cube as unknown as { isMesh?: boolean }).isMesh
        + " layerTest="
        + cube.layers.test(camera.layers)
        + " materialVisible="
        + cube.material.visible
        + " glError="
        + context.getError()
      )
    }
    debugFrameCount++
    nativeWebGLSwap()
    requestAnimationFrame(renderFrame)
  })
  console.error("[three-angle-metal] render RAF scheduled")
}
