/** @gea-no-runtime-bridge */
export class Vector3 {
  x: number = 0
  y: number = 0
  z: number = 0

  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this.x = x
    this.y = y
    this.z = z
  }

  set(x: number, y: number, z: number): this {
    this.x = x
    this.y = y
    this.z = z
    return this
  }

  copy(vector: Vector3): this {
    this.x = vector.x
    this.y = vector.y
    this.z = vector.z
    return this
  }

  addVectors(a: Vector3, b: Vector3): this {
    this.x = a.x + b.x
    this.y = a.y + b.y
    this.z = a.z + b.z
    return this
  }

  subVectors(a: Vector3, b: Vector3): this {
    this.x = a.x - b.x
    this.y = a.y - b.y
    this.z = a.z - b.z
    return this
  }

  crossVectors(a: Vector3, b: Vector3): this {
    const ax = a.x
    const ay = a.y
    const az = a.z
    const bx = b.x
    const by = b.y
    const bz = b.z
    this.x = ay * bz - az * by
    this.y = az * bx - ax * bz
    this.z = ax * by - ay * bx
    return this
  }

  normalize(): this {
    const length = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z)
    if (length > 0) {
      this.x /= length
      this.y /= length
      this.z /= length
    }
    return this
  }
}

export class Vector2 {
  x: number = 0
  y: number = 0

  constructor(x: number = 0, y: number = 0) {
    this.x = x
    this.y = y
  }
}

/** @gea-no-runtime-bridge */
export class BufferAttribute {
  readonly array: f32[]
  readonly itemSize: number
  readonly count: number

  constructor(array: f32[], itemSize: number) {
    this.array = array
    this.itemSize = itemSize
    this.count = array.length / itemSize
  }
}

export class Float32BufferAttribute extends BufferAttribute {
  constructor(array: f32[], itemSize: number) {
    super(array, itemSize)
  }
}

export class GeometryAttributes {
  position = new BufferAttribute([], 3)
  normal = new BufferAttribute([], 3)
  uv = new BufferAttribute([], 2)
}

/** @gea-no-runtime-bridge */
export class BufferGeometry {
  type: string = 'BufferGeometry'
  parameters: unknown = [0, 0, 0, 0, 0, 0, 0]
  readonly attributes = new GeometryAttributes()
  readonly groups: number[] = []
  index = new BufferAttribute([], 1)

  setIndex(index: f32[] | BufferAttribute): void {
    if (Array.isArray(index)) this.index = new BufferAttribute(index, 1)
    else this.index = index
  }

  setAttribute(name: string, attribute: BufferAttribute): void {
    if (name === 'position') this.attributes.position = attribute
    else if (name === 'normal') this.attributes.normal = attribute
    else if (name === 'uv') this.attributes.uv = attribute
  }

  addGroup(start: number, count: number, materialIndex: number): void {
    this.groups.push(start, count, materialIndex)
  }

  /**
   * @returns {f32[]}
   */
  positionArray(): f32[] {
    return this.attributes.position.array
  }

  /**
   * @returns {f32[]}
   */
  normalArray(): f32[] {
    return this.attributes.normal.array
  }

  /**
   * @returns {f32[]}
   */
  indexArray(): f32[] {
    return this.index.array
  }

  copy(source: BufferGeometry): this {
    this.type = source.type
    this.parameters = source.parameters
    this.index = source.index
    this.attributes.position = source.attributes.position
    this.attributes.normal = source.attributes.normal
    this.attributes.uv = source.attributes.uv
    return this
  }
}

export class CircleGeometry extends BufferGeometry {
  constructor(
    radius: number = 1,
    segments: number = 32,
    thetaStart: number = 0,
    thetaLength: number = 6.283185307179586,
  ) {
    super()
    this.type = 'CircleGeometry'
    this.parameters = [8, radius, segments, thetaStart, thetaLength, 0, 0]

    const safeRadius = Math.max(radius, 0.01)
    const safeSegments = Math.max(3, Math.floor(segments))
    const vertices: f32[] = []
    const normals: f32[] = []
    const uvs: f32[] = []
    const indices: f32[] = []

    vertices.push(0, 0, 0)
    normals.push(0, 0, 1)
    uvs.push(0.5, 0.5)

    for (let s = 0; s <= safeSegments; s++) {
      const segment = thetaStart + s / safeSegments * thetaLength
      const x = safeRadius * Math.cos(segment)
      const y = safeRadius * Math.sin(segment)
      vertices.push(x, y, 0)
      normals.push(0, 0, 1)
      uvs.push((x / safeRadius + 1) / 2, (y / safeRadius + 1) / 2)
    }

    for (let i = 1; i <= safeSegments; i++) {
      indices.push(i, i + 1, 0)
    }

    this.setIndex(indices)
    this.setAttribute('position', new Float32BufferAttribute(vertices, 3))
    this.setAttribute('normal', new Float32BufferAttribute(normals, 3))
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  }
}

export class Color {
  value: number = 0xffffff

  constructor(value: number = 0xffffff) {
    this.value = value
  }

  getHex(): number {
    return this.value
  }
}

/** @gea-no-runtime-bridge */
export class Euler {
  x: number = 0
  y: number = 0
  z: number = 0

  set(x: number, y: number, z: number): this {
    this.x = x
    this.y = y
    this.z = z
    return this
  }
}

/** @gea-no-runtime-bridge */
export class Object3D {
  nativeObjectKind: number = 0
  geometry!: BufferGeometry
  material!: Material
  readonly position = new Vector3()
  readonly rotation = new Euler()
  readonly scale = new Vector3(1, 1, 1)
  readonly children: Object3D[] = []

  /**
   * @param {...Object3D} objects
   */
  add(...objects: Object3D[]): this {
    for (let i = 0; i < objects.length; i++) this.children.push(objects[i])
    return this
  }
}

export class Group extends Object3D {}

export class PerspectiveCamera extends Object3D {
  readonly target = new Vector3()
  readonly fov: number = 70
  readonly aspect: number = 1
  readonly near: number = 0.01
  readonly far: number = 100

  constructor(
    fov: number = 70,
    aspect: number = 1,
    near: number = 0.01,
    far: number = 100,
  ) {
    super()
    this.fov = fov
    this.aspect = aspect
    this.near = near
    this.far = far
  }

  lookAt(target: Vector3): void {
    this.target.copy(target)
  }

}

/** @gea-no-runtime-bridge */
export class Material {
  nativeMaterialCode: number = 0
  colorValue: number = 0xffffff
}

export class MeshBasicMaterial extends Material {
  constructor(color: number = 0xffffff) {
    super()
    this.nativeMaterialCode = 1
    this.colorValue = color
  }
}

export class MeshStandardMaterial extends MeshBasicMaterial {
  constructor(color: number = 0xffffff) {
    super(color)
    this.nativeMaterialCode = 3
  }
}

export class MeshLambertMaterial extends MeshStandardMaterial {
  constructor(color: number = 0xffffff) {
    super(color)
    this.nativeMaterialCode = 4
  }
}

export class MeshPhongMaterial extends MeshStandardMaterial {
  constructor(color: number = 0xffffff) {
    super(color)
    this.nativeMaterialCode = 5
  }
}

export class MeshNormalMaterial extends Material {
  constructor() {
    super()
    this.nativeMaterialCode = 2
  }
}

export class Mesh extends Object3D {
  constructor(
    geometry: BufferGeometry,
    material: Material,
  ) {
    super()
    this.nativeObjectKind = 1
    this.geometry = geometry
    this.material = material
  }
}

export class Scene extends Object3D {
  mesh = new Mesh(new BufferGeometry(), new Material())
  readonly meshes: Mesh[] = []

  /**
   * @param {...Object3D} objects
   */
  add(...objects: Object3D[]): this {
    for (let i = 0; i < objects.length; i++) {
      const object = objects[i]
      if (object instanceof Mesh) {
        this.mesh = object
        this.meshes.push(object)
      }
      this.children.push(object)
    }
    return this
  }
}
