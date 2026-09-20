// Typed port of the three.js scene-graph core (API-compatible subset).
//
// geatsc-driven design rules (embedded mode, verified against the emitted
// C++ — see gea3d/README.md "compiler findings"):
// - NO nullable class-typed fields (`T | null` boxes to gea_cpp_value):
//   sentinels are used instead (parent === this, radius < 0, count === 0).
// - NO instanceof / downcasts (instanceof lowers to constant false):
//   classification is double-dispatch through virtual collectSelf().
// - NO interface-typed fields, NO dynamic property bags, NO Symbol protocols.
// - NO statements before super() in derived constructors (miscompiles).

import { Color, Euler, Matrix4, Quaternion, Vector3 } from './math'
import { Material } from './materials'

let _object3DId = 0

export class Sphere {
  readonly center: Vector3
  radius: number

  constructor() {
    this.center = new Vector3()
    this.radius = -1 // < 0 = not computed yet
  }
}

export class BufferAttribute {
  readonly array: Float32Array
  readonly itemSize: number
  readonly count: number
  needsUpdate: boolean

  constructor(array: Float32Array, itemSize: number) {
    this.array = array
    this.itemSize = itemSize
    this.count = itemSize > 0 ? Math.floor(array.length / itemSize) : 0
    this.needsUpdate = false
  }

  getX(index: number): number {
    return this.array[index * this.itemSize]
  }

  getY(index: number): number {
    return this.array[index * this.itemSize + 1]
  }

  getZ(index: number): number {
    return this.array[index * this.itemSize + 2]
  }

  setXYZ(index: number, x: number, y: number, z: number): BufferAttribute {
    const i = index * this.itemSize
    this.array[i] = x
    this.array[i + 1] = y
    this.array[i + 2] = z
    return this
  }
}

function float32ArrayFromNumbers(values: number[]): Float32Array {
  const array = new Float32Array(values.length)
  for (let i = 0; i < values.length; i++) array[i] = values[i]
  return array
}

export class Float32BufferAttribute extends BufferAttribute {
  constructor(values: number[], itemSize: number) {
    // No statements before super() — geatsc miscompiles them.
    super(float32ArrayFromNumbers(values), itemSize)
  }
}

// Fixed-field attribute container. Attributes are never null: "absent" is an
// empty attribute (count === 0).
export class GeometryAttributes {
  position: BufferAttribute
  normal: BufferAttribute
  color: BufferAttribute
  uv: BufferAttribute

  constructor() {
    this.position = new BufferAttribute(new Float32Array(0), 3)
    this.normal = new BufferAttribute(new Float32Array(0), 3)
    this.color = new BufferAttribute(new Float32Array(0), 3)
    this.uv = new BufferAttribute(new Float32Array(0), 2)
  }
}

export class BufferGeometry {
  readonly attributes: GeometryAttributes
  readonly boundingSphere: Sphere
  // Empty = non-indexed (sequential triangles over position).
  private indexArray: Uint32Array
  // Native-engine buffer ids (gea3dNative), assigned by the renderer on first
  // draw. -1 = not uploaded yet / absent. Plain numeric sentinels — nullable
  // or object-typed fields box in embedded geatsc.
  nativePositionBuffer: number
  nativeIndexBuffer: number
  nativeColorBuffer: number

  constructor() {
    this.attributes = new GeometryAttributes()
    this.boundingSphere = new Sphere()
    this.indexArray = new Uint32Array(0)
    this.nativePositionBuffer = -1
    this.nativeIndexBuffer = -1
    this.nativeColorBuffer = -1
  }

  setAttribute(name: string, attribute: BufferAttribute): BufferGeometry {
    if (name === 'position') this.attributes.position = attribute
    else if (name === 'normal') this.attributes.normal = attribute
    else if (name === 'color') this.attributes.color = attribute
    else if (name === 'uv') this.attributes.uv = attribute
    return this
  }

  getAttribute(name: string): BufferAttribute {
    if (name === 'position') return this.attributes.position
    if (name === 'normal') return this.attributes.normal
    if (name === 'color') return this.attributes.color
    return this.attributes.uv
  }

  setIndex(indices: number[]): BufferGeometry {
    const arr = new Uint32Array(indices.length)
    for (let i = 0; i < indices.length; i++) arr[i] = indices[i]
    this.indexArray = arr
    return this
  }

  // Returns the index array, lazily building sequential indices for
  // non-indexed geometry (cached).
  ensureIndexArray(): Uint32Array {
    if (this.indexArray.length > 0) return this.indexArray
    const count = this.attributes.position.count
    if (count === 0) return this.indexArray
    const arr = new Uint32Array(count)
    for (let i = 0; i < count; i++) arr[i] = i
    this.indexArray = arr
    return arr
  }

  triangleCount(): number {
    if (this.indexArray.length > 0) return Math.floor(this.indexArray.length / 3)
    return Math.floor(this.attributes.position.count / 3)
  }

  computeBoundingSphere(): void {
    const sphere = this.boundingSphere
    const pos = this.attributes.position
    if (pos.count === 0) {
      sphere.center.set(0, 0, 0)
      sphere.radius = 0
      return
    }
    const arr = pos.array
    const n = pos.count
    let minX = arr[0]
    let minY = arr[1]
    let minZ = arr[2]
    let maxX = minX
    let maxY = minY
    let maxZ = minZ
    for (let i = 1; i < n; i++) {
      const x = arr[i * 3]
      const y = arr[i * 3 + 1]
      const z = arr[i * 3 + 2]
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
      if (z < minZ) minZ = z
      if (z > maxZ) maxZ = z
    }
    const cx = (minX + maxX) * 0.5
    const cy = (minY + maxY) * 0.5
    const cz = (minZ + maxZ) * 0.5
    sphere.center.set(cx, cy, cz)
    let maxDistSq = 0
    for (let i = 0; i < n; i++) {
      const dx = arr[i * 3] - cx
      const dy = arr[i * 3 + 1] - cy
      const dz = arr[i * 3 + 2] - cz
      const distSq = dx * dx + dy * dy + dz * dz
      if (distSq > maxDistSq) maxDistSq = distSq
    }
    sphere.radius = Math.sqrt(maxDistSq)
  }
}

// NOTE: no module-scope or lazy scratch singletons (miscompile in embedded
// geatsc — see math.ts). Cold-path helpers allocate small temporaries.

// Typed collection target for the renderer's scene walk. Mesh and Light
// register themselves via collectSelf double dispatch — no instanceof, no
// downcasts (both miscompile in embedded geatsc today).
export class SceneCollector {
  readonly meshes: Mesh[]
  meshCount: number
  readonly lights: Light[]
  lightCount: number

  constructor() {
    this.meshes = []
    this.meshCount = 0
    this.lights = []
    this.lightCount = 0
  }

  reset(): void {
    this.meshCount = 0
    this.lightCount = 0
  }

  addMesh(mesh: Mesh): void {
    if (this.meshCount < this.meshes.length) this.meshes[this.meshCount] = mesh
    else this.meshes.push(mesh)
    this.meshCount++
  }

  addLight(light: Light): void {
    if (this.lightCount < this.lights.length) this.lights[this.lightCount] = light
    else this.lights.push(light)
    this.lightCount++
  }
}

export class Object3D {
  readonly id: number
  name: string
  readonly position: Vector3
  readonly rotation: Euler
  readonly quaternion: Quaternion
  readonly scale: Vector3
  readonly up: Vector3
  readonly matrix: Matrix4
  readonly matrixWorld: Matrix4
  matrixAutoUpdate: boolean
  matrixWorldNeedsUpdate: boolean
  visible: boolean
  frustumCulled: boolean
  renderOrder: number
  // Sentinel: parent points at self when detached (nullable class fields
  // box). The flag is the truth — object identity comparison (`x === this`)
  // does not survive the gea_cpp_strict_equals lowering on wrapped pointers.
  parent: Object3D
  private parentAttached: boolean
  readonly children: Object3D[]
  isCamera: boolean

  constructor() {
    _object3DId++
    this.id = _object3DId
    this.name = ''
    this.position = new Vector3()
    this.rotation = new Euler()
    this.quaternion = new Quaternion()
    this.scale = new Vector3(1, 1, 1)
    this.up = new Vector3(0, 1, 0)
    this.matrix = new Matrix4()
    this.matrixWorld = new Matrix4()
    this.matrixAutoUpdate = true
    this.matrixWorldNeedsUpdate = false
    this.visible = true
    this.frustumCulled = true
    this.renderOrder = 0
    this.parent = this
    this.parentAttached = false
    this.children = []
    this.isCamera = false

    // Keep rotation (Euler) and quaternion in sync, like three.js.
    const rotation = this.rotation
    const quaternion = this.quaternion
    rotation._onChange(() => {
      quaternion.setFromEuler(rotation, false)
    })
    quaternion._onChange(() => {
      rotation.setFromQuaternion(quaternion, '', false)
    })
  }

  hasParent(): boolean {
    return this.parentAttached
  }

  // Internal: writes the parent link from the child's side. `this.parent =
  // <param>` stores a real pointer; `object.parent = this` inside add() nulls
  // out (storing the enclosing `this` into another object's field miscompiles
  // in embedded geatsc — passing `this` as a call argument works).
  attachToParent(parent: Object3D): void {
    this.parent = parent
    this.parentAttached = true
  }

  add(object: Object3D): Object3D {
    if (object.parentAttached) object.parent.remove(object)
    object.attachToParent(this)
    this.children.push(object)
    return this
  }

  remove(object: Object3D): Object3D {
    // Identity search by id — Array.indexOf on class instances relies on the
    // same strict-equals lowering that hasParent avoids.
    const children = this.children
    for (let i = 0; i < children.length; i++) {
      if (children[i].id === object.id) {
        object.parent = object
        object.parentAttached = false
        children.splice(i, 1)
        return this
      }
    }
    return this
  }

  clear(): Object3D {
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i]
      child.parent = child
      child.parentAttached = false
    }
    this.children.length = 0
    return this
  }

  traverse(callback: (object: Object3D) => void): void {
    callback(this)
    const children = this.children
    for (let i = 0; i < children.length; i++) children[i].traverse(callback)
  }

  // Double-dispatch hook: subclasses that render register themselves.
  collectSelf(collector: SceneCollector): void {
    // base objects contribute nothing
  }

  collect(collector: SceneCollector): void {
    if (!this.visible) return
    this.collectSelf(collector)
    const children = this.children
    for (let i = 0; i < children.length; i++) children[i].collect(collector)
  }

  rotateX(angle: number): Object3D {
    return this.rotateOnAxis(new Vector3(1, 0, 0), angle)
  }

  rotateY(angle: number): Object3D {
    return this.rotateOnAxis(new Vector3(0, 1, 0), angle)
  }

  rotateZ(angle: number): Object3D {
    return this.rotateOnAxis(new Vector3(0, 0, 1), angle)
  }

  rotateOnAxis(axis: Vector3, angle: number): Object3D {
    const q = new Quaternion()
    q.setFromAxisAngle(axis, angle)
    this.quaternion.multiply(q)
    return this
  }

  translateOnAxis(axis: Vector3, distance: number): Object3D {
    const v = new Vector3(axis.x, axis.y, axis.z)
    v.applyQuaternion(this.quaternion)
    this.position.addScaledVector(v, distance)
    return this
  }

  translateX(distance: number): Object3D {
    return this.translateOnAxis(new Vector3(1, 0, 0), distance)
  }

  translateY(distance: number): Object3D {
    return this.translateOnAxis(new Vector3(0, 1, 0), distance)
  }

  translateZ(distance: number): Object3D {
    return this.translateOnAxis(new Vector3(0, 0, 1), distance)
  }

  getWorldPosition(target: Vector3): Vector3 {
    this.updateWorldMatrix(true, false)
    return target.setFromMatrixPosition(this.matrixWorld)
  }

  // Orients the object toward the target point. Cameras look down their -Z;
  // other objects face +Z toward the target (three.js semantics). Unlike
  // three.js this takes numbers only — a `Vector3 | number` union parameter
  // boxes in geatsc; use lookAtTarget(v) for the vector form. No parent-
  // rotation compensation (fine for scene-root cameras).
  lookAt(x: number, y: number = 0, z: number = 0): void {
    this.updateWorldMatrix(true, false)
    const we = this.matrixWorld.elements
    const eyeX = we[12]
    const eyeY = we[13]
    const eyeZ = we[14]
    const m = new Matrix4()
    if (this.isCamera) m.lookAtScalar(eyeX, eyeY, eyeZ, x, y, z, this.up.x, this.up.y, this.up.z)
    else m.lookAtScalar(x, y, z, eyeX, eyeY, eyeZ, this.up.x, this.up.y, this.up.z)
    this.quaternion.setFromRotationMatrix(m)
  }

  lookAtTarget(target: Vector3): void {
    this.lookAt(target.x, target.y, target.z)
  }

  updateMatrix(): void {
    this.matrix.compose(this.position, this.quaternion, this.scale)
    this.matrixWorldNeedsUpdate = true
  }

  updateMatrixWorld(force: boolean = false): void {
    if (this.matrixAutoUpdate) this.updateMatrix()
    let f = force
    if (this.matrixWorldNeedsUpdate || f) {
      if (this.hasParent()) this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix)
      else this.matrixWorld.copy(this.matrix)
      this.matrixWorldNeedsUpdate = false
      f = true
    }
    const children = this.children
    for (let i = 0; i < children.length; i++) children[i].updateMatrixWorld(f)
  }

  updateWorldMatrix(updateParents: boolean, updateChildren: boolean): void {
    if (updateParents && this.hasParent()) this.parent.updateWorldMatrix(true, false)
    if (this.matrixAutoUpdate) this.updateMatrix()
    if (this.hasParent()) this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix)
    else this.matrixWorld.copy(this.matrix)
    if (updateChildren) {
      const children = this.children
      for (let i = 0; i < children.length; i++) children[i].updateWorldMatrix(false, true)
    }
  }
}

export class Group extends Object3D {}

export class Mesh extends Object3D {
  geometry: BufferGeometry
  material: Material

  constructor(geometry: BufferGeometry, material: Material) {
    super()
    this.geometry = geometry
    this.material = material
  }

  collectSelf(collector: SceneCollector): void {
    collector.addMesh(this)
  }
}

export const LIGHT_KIND_AMBIENT = 1
export const LIGHT_KIND_DIRECTIONAL = 2
export const LIGHT_KIND_HEMISPHERE = 3

export class Light extends Object3D {
  readonly color: Color
  intensity: number
  lightKind: number
  // DirectionalLight aim point (unused sentinel instance for other kinds).
  readonly target: Object3D
  // HemisphereLight ground color (white for other kinds).
  readonly groundColor: Color

  constructor(color: number = 0xffffff, intensity: number = 1) {
    super()
    this.color = new Color(color)
    this.intensity = intensity
    this.lightKind = LIGHT_KIND_AMBIENT
    this.target = new Object3D()
    this.groundColor = new Color(0xffffff)
  }

  collectSelf(collector: SceneCollector): void {
    collector.addLight(this)
  }
}

export class AmbientLight extends Light {}

// Shines from `position` toward `target` (three.js semantics). The default
// position (0, 1, 0) with target at the origin lights from straight above.
export class DirectionalLight extends Light {
  constructor(color: number = 0xffffff, intensity: number = 1) {
    super(color, intensity)
    this.lightKind = LIGHT_KIND_DIRECTIONAL
    this.position.set(0, 1, 0)
  }
}

// Approximated as ambient(average of sky/ground) in this renderer.
export class HemisphereLight extends Light {
  constructor(skyColor: number = 0xffffff, groundColor: number = 0xffffff, intensity: number = 1) {
    super(skyColor, intensity)
    this.lightKind = LIGHT_KIND_HEMISPHERE
    this.groundColor.setHex(groundColor)
  }
}

export class Scene extends Object3D {
  backgroundColor: number

  constructor() {
    super()
    // Hex color (like `new Color(hex).getHex()`); -1 = don't clear.
    this.backgroundColor = 0x000000
  }
}
