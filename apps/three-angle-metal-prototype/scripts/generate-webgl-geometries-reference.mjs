import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import { ParametricGeometry } from 'three/examples/jsm/geometries/ParametricGeometry.js'
import { klein, mobius, plane } from 'three/examples/jsm/geometries/ParametricFunctions.js'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const appDir = resolve(scriptDir, '..')
const downloadedSourcePath = resolve(appDir, 'reference/webgl_geometries.downloaded.html')
const generatedTsPath = resolve(appDir, 'src/generatedWebglGeometriesReference.ts')
const generatedBrowserDataPath = resolve(appDir, 'reference/generated-webgl-geometries-data.mjs')
const generatedBrowserHtmlPath = resolve(appDir, 'reference/webgl_geometries.reference.html')

const downloadedSource = readFileSync(downloadedSourcePath, 'utf8')
for (const snippet of [
  'three.js webgl - geometries',
  'new THREE.SphereGeometry( 75, 20, 10 )',
  'new THREE.TorusKnotGeometry( 50, 10, 50, 20 )',
  'new ParametricGeometry( klein, 20, 20 )',
  'new ParametricGeometry( mobius, 20, 20 )',
]) {
  if (!downloadedSource.includes(snippet)) {
    throw new Error(`Downloaded Three demo source is missing expected snippet: ${snippet}`)
  }
}

const cssWidth = 760
const cssHeight = 520
const timer = 0.35
const cameraFov = 45
const cameraAspect = cssWidth / cssHeight
const cameraNear = 1
const cameraFar = 2000
const cameraX = Math.cos(timer) * 800
const cameraY = 500
const cameraZ = Math.sin(timer) * 800
const cameraLookAtX = 0
const cameraLookAtY = 0
const cameraLookAtZ = 0
const backgroundColor = 0x000000
const materialCode = 1
const materialColor = 0xffffff
const demoCode = 7

const meshes = []

function addMesh(geometry, x, y, z, scale = 1) {
  const mesh = new THREE.Mesh(geometry)
  mesh.position.set(x, y, z)
  mesh.rotation.x = timer * 5
  mesh.rotation.y = timer * 2.5
  if (Array.isArray(scale)) {
    mesh.scale.set(scale[0], scale[1], scale[2])
  } else {
    mesh.scale.multiplyScalar(scale)
  }
  mesh.updateMatrixWorld(true)
  meshes.push(mesh)
}

addMesh(new THREE.SphereGeometry(75, 20, 10), -300, 0, 300)
addMesh(new THREE.IcosahedronGeometry(75), -100, 0, 300)
addMesh(new THREE.OctahedronGeometry(75), 100, 0, 300)
addMesh(new THREE.TetrahedronGeometry(75), 300, 0, 300)

addMesh(new THREE.PlaneGeometry(100, 100, 4, 4), -300, 0, 100)
addMesh(new THREE.BoxGeometry(100, 100, 100, 4, 4, 4), -100, 0, 100)
addMesh(new THREE.CircleGeometry(50, 20, 0, Math.PI * 2), 100, 0, 100)
addMesh(new THREE.RingGeometry(10, 50, 20, 5, 0, Math.PI * 2), 300, 0, 100)

addMesh(new THREE.CylinderGeometry(25, 75, 100, 40, 5), -300, 0, -100)
const lathePoints = []
for (let i = 0; i < 50; i++) {
  lathePoints.push(new THREE.Vector2(Math.sin(i * 0.2) * Math.sin(i * 0.1) * 15 + 50, (i - 5) * 2))
}
addMesh(new THREE.LatheGeometry(lathePoints, 20), -100, 0, -100)
addMesh(new THREE.TorusGeometry(50, 20, 20, 20), 100, 0, -100)
addMesh(new THREE.TorusKnotGeometry(50, 10, 50, 20), 300, 0, -100)

addMesh(new THREE.CapsuleGeometry(20, 50), -300, 0, -300)
const parametricPlane = new ParametricGeometry(plane, 10, 10)
parametricPlane.scale(100, 100, 100)
parametricPlane.center()
addMesh(parametricPlane, -100, 0, -300)
addMesh(new ParametricGeometry(klein, 20, 20), 100, 0, -300, 5)
addMesh(new ParametricGeometry(mobius, 20, 20), 300, 0, -300, 30)

const positions = []
const normals = []
const indices = []
const colors = []
const position = new THREE.Vector3()
const normal = new THREE.Vector3()

function pushGeometry(mesh) {
  const geometry = mesh.geometry
  if (!geometry.attributes.normal) geometry.computeVertexNormals()
  const positionAttribute = geometry.attributes.position
  const normalAttribute = geometry.attributes.normal
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld)
  const vertexOffset = positions.length / 3

  for (let vertexIndex = 0; vertexIndex < positionAttribute.count; vertexIndex++) {
    position.fromBufferAttribute(positionAttribute, vertexIndex).applyMatrix4(mesh.matrixWorld)
    normal.fromBufferAttribute(normalAttribute, vertexIndex).applyMatrix3(normalMatrix).normalize()
    positions.push(position.x, position.y, position.z)
    normals.push(normal.x, normal.y, normal.z)
    colors.push(normal.x * 0.5 + 0.5, normal.y * 0.5 + 0.5, normal.z * 0.5 + 0.5)
  }

  if (geometry.index) {
    for (let index = 0; index < geometry.index.count; index++) {
      indices.push(vertexOffset + geometry.index.getX(index))
    }
  } else {
    for (let index = 0; index < positionAttribute.count; index++) {
      indices.push(vertexOffset + index)
    }
  }
}

for (const mesh of meshes) pushGeometry(mesh)

const vertexCount = positions.length / 3
if (vertexCount > 65535) {
  throw new Error(`Reference payload has ${vertexCount} vertices; native GL_UNSIGNED_SHORT index path supports at most 65535.`)
}

function numberLiteral(value) {
  if (!Number.isFinite(value)) throw new Error(`Non-finite number in reference payload: ${value}`)
  const rounded = Math.abs(value) < 0.000001 ? 0 : Math.fround(value)
  return Number(rounded.toFixed(6)).toString()
}

function integerLiteral(value) {
  if (!Number.isInteger(value)) throw new Error(`Non-integer index in reference payload: ${value}`)
  if (value < 0 || value > 65535) throw new Error(`Index out of uint16 range: ${value}`)
  return String(value)
}

function formatFlatArray(values, literal, perLine = 12) {
  const lines = []
  for (let offset = 0; offset < values.length; offset += perLine) {
    lines.push(`  ${values.slice(offset, offset + perLine).map(literal).join(', ')},`)
  }
  return lines.join('\n')
}

function writeGeneratedTs() {
  const source = `// Generated by scripts/generate-webgl-geometries-reference.mjs from reference/webgl_geometries.downloaded.html.
// The source demo is the official Three.js webgl_geometries example.

import {
  createGeaWebGLRendererMeshBuffer,
  type GeaWebGLRenderer,
  logAngleHostSmoke,
  renderGeaWebGLRendererMeshBufferHandleFrame,
} from './angleHost'

export function startThreeFrameLoop(
  renderer: GeaWebGLRenderer,
  aspect: number,
): void {
  const demoCode = ${demoCode}
  const materialCode = ${materialCode}
  const materialColor = ${materialColor}
  const backgroundColor = ${backgroundColor}
  const timer = ${numberLiteral(timer)}
  const vertexCount = ${vertexCount}
  const indexCount = ${indices.length}
  const cameraFov = ${cameraFov}
  const cameraAspect = aspect > 0 ? aspect : ${numberLiteral(cameraAspect)}
  const cameraNear = ${cameraNear}
  const cameraFar = ${cameraFar}
  const cameraX = ${numberLiteral(cameraX)}
  const cameraY = ${cameraY}
  const cameraZ = ${numberLiteral(cameraZ)}
  const cameraLookAtX = ${cameraLookAtX}
  const cameraLookAtY = ${cameraLookAtY}
  const cameraLookAtZ = ${cameraLookAtZ}

  const positions: f32[] = [
${formatFlatArray(positions, numberLiteral)}
  ]

  const normals: f32[] = [
${formatFlatArray(normals, numberLiteral)}
  ]

  const indices: f32[] = [
${formatFlatArray(indices, integerLiteral, 18)}
  ]

  const colors: f32[] = [
${formatFlatArray(colors, numberLiteral)}
  ]

  const handle = createGeaWebGLRendererMeshBuffer(
    renderer,
    demoCode,
    materialCode,
    materialColor,
    positions,
    normals,
    indices,
    colors,
  )

  logAngleHostSmoke(
    'official Three webgl_geometries reference buffer uploaded: vertices='
      + vertexCount
      + ' indices='
      + indexCount
      + ' timer='
      + timer,
  )

  requestAnimationFrame(function frame(timestampMs: number): void {
    renderGeaWebGLRendererMeshBufferHandleFrame(
      renderer,
      handle,
      demoCode,
      materialCode,
      materialColor,
      backgroundColor,
      cameraFov,
      cameraAspect,
      cameraNear,
      cameraFar,
      cameraX,
      cameraY,
      cameraZ,
      cameraLookAtX,
      cameraLookAtY,
      cameraLookAtZ,
      0,
      0,
      0,
      timestampMs,
    )
    requestAnimationFrame(frame)
  })
}
`
  writeFileSync(generatedTsPath, source)
}

function writeBrowserData() {
  const source = `// Generated by ../scripts/generate-webgl-geometries-reference.mjs.
// Same payload consumed by the native Gea/ANGLE app.

export const demoCode = ${demoCode}
export const materialCode = ${materialCode}
export const materialColor = ${materialColor}
export const backgroundColor = ${backgroundColor}
export const timer = ${numberLiteral(timer)}
export const vertexCount = ${vertexCount}
export const indexCount = ${indices.length}
export const camera = {
  fov: ${cameraFov},
  aspect: ${numberLiteral(cameraAspect)},
  near: ${cameraNear},
  far: ${cameraFar},
  x: ${numberLiteral(cameraX)},
  y: ${cameraY},
  z: ${numberLiteral(cameraZ)},
  lookAtX: ${cameraLookAtX},
  lookAtY: ${cameraLookAtY},
  lookAtZ: ${cameraLookAtZ},
}

export const positions = new Float32Array([
${formatFlatArray(positions, numberLiteral)}
])

export const normals = new Float32Array([
${formatFlatArray(normals, numberLiteral)}
])

export const indices = new Uint16Array([
${formatFlatArray(indices, integerLiteral, 18)}
])

export const colors = new Float32Array([
${formatFlatArray(colors, numberLiteral)}
])
`
  writeFileSync(generatedBrowserDataPath, source)
}

function writeBrowserHtml() {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>three.js webgl_geometries parity reference</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      html,
      body {
        margin: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #000;
      }

      canvas {
        display: block;
        width: ${cssWidth}px;
        height: ${cssHeight}px;
      }
    </style>
    <script type="importmap">
      {
        "imports": {
          "three": "../node_modules/three/build/three.module.js"
        }
      }
    </script>
  </head>
  <body>
    <script type="module">
      import * as THREE from 'three'
      import { backgroundColor, camera as cameraData, colors, indices, positions } from './generated-webgl-geometries-data.mjs'

      const width = ${cssWidth}
      const height = ${cssHeight}
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(cameraData.fov, cameraData.aspect, cameraData.near, cameraData.far)
      camera.position.set(cameraData.x, cameraData.y, cameraData.z)
      camera.lookAt(cameraData.lookAtX, cameraData.lookAtY, cameraData.lookAtZ)

      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
      geometry.setIndex(new THREE.Uint16BufferAttribute(indices, 1))
      geometry.computeBoundingSphere()

      const material = new THREE.RawShaderMaterial({
        side: THREE.DoubleSide,
        vertexShader: \`
          precision highp float;
          attribute vec3 position;
          attribute vec3 color;
          uniform mat4 modelViewMatrix;
          uniform mat4 projectionMatrix;
          varying vec4 vColor;

          void main() {
            vColor = vec4(color, 1.0);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        \`,
        fragmentShader: \`
          precision mediump float;
          varying vec4 vColor;

          void main() {
            gl_FragColor = vColor;
          }
        \`,
      })

      const mesh = new THREE.Mesh(geometry, material)
      mesh.frustumCulled = false
      scene.add(mesh)

      const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, preserveDrawingBuffer: true })
      renderer.setPixelRatio(2)
      renderer.setSize(width, height, false)
      renderer.setClearColor(backgroundColor, 1)
      document.body.appendChild(renderer.domElement)
      let fpsFrameCount = 0
      let fpsWindowStartMs = 0
      try {
        function frame(now) {
          if (fpsWindowStartMs <= 0) fpsWindowStartMs = now
          renderer.render(scene, camera)
          fpsFrameCount += 1
          window.__GEA_REFERENCE_READY__ = true
          document.body.dataset.geaReferenceReady = '1'
          const elapsedMs = now - fpsWindowStartMs
          if (elapsedMs >= 3000) {
            const fps = fpsFrameCount * 1000 / elapsedMs
            window.__GEA_REFERENCE_FPS__ = fps
            window.__GEA_REFERENCE_FRAME_COUNT__ = fpsFrameCount
            window.__GEA_REFERENCE_ELAPSED_MS__ = elapsedMs
            document.body.dataset.geaReferenceFps = String(fps)
            document.body.dataset.geaReferenceFrameCount = String(fpsFrameCount)
            document.body.dataset.geaReferenceElapsedMs = String(elapsedMs)
            console.log('official Three webgl_geometries reference fps=' + fps)
            fpsFrameCount = 0
            fpsWindowStartMs = now
          }
          window.requestAnimationFrame(frame)
        }
        window.requestAnimationFrame(frame)
      } catch (error) {
        window.__GEA_REFERENCE_ERROR__ = error instanceof Error ? error.stack : String(error)
        console.error(error)
      }
    </script>
  </body>
</html>
`
  writeFileSync(generatedBrowserHtmlPath, html)
}

mkdirSync(dirname(generatedTsPath), { recursive: true })
mkdirSync(dirname(generatedBrowserDataPath), { recursive: true })
writeGeneratedTs()
writeBrowserData()
writeBrowserHtml()

console.log(`Generated Three webgl_geometries reference payload`)
console.log(`vertices=${vertexCount} indices=${indices.length} meshes=${meshes.length} timer=${timer}`)
console.log(generatedTsPath)
console.log(generatedBrowserDataPath)
console.log(generatedBrowserHtmlPath)
