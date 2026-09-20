/** @gea-no-runtime-bridge */
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
export class Vector3 {
  x: number
  y: number
  z: number

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
}

/** @gea-no-runtime-bridge */
class Euler {
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

export class Scene extends Object3D {
  background = new Color(0)
  mesh = new Mesh(new BufferGeometry('', [], [], []), new Material(''))
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

export class Group extends Object3D {}

export class PerspectiveCamera extends Object3D {
  readonly fov: number = 70
  readonly aspect: number = 1
  readonly near: number = 0.01
  readonly far: number = 100
  readonly target = new Vector3()

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
export class BufferGeometry {
  readonly kind: string = ''
  readonly parameters: number[] = [0]
  readonly vertices: f32[] = [0]
  readonly indices: f32[] = [0]

  constructor(
    kind: string,
    parameters: number[],
    vertices: f32[],
    indices: f32[],
  ) {
    this.kind = kind
    this.parameters = parameters
    this.vertices = vertices
    this.indices = indices
  }
}

export class BoxGeometry extends BufferGeometry {
  constructor(
    width: number = 1,
    height: number = 1,
    depth: number = 1,
    widthSegments: number = 1,
    heightSegments: number = 1,
    depthSegments: number = 1,
  ) {
    super(
      'box',
      [width, height, depth, widthSegments, heightSegments, depthSegments],
      [],
      [],
    )
  }
}

export class PlaneGeometry extends BufferGeometry {
  constructor(
    width: number = 1,
    height: number = 1,
    widthSegments: number = 1,
    heightSegments: number = 1,
  ) {
    super(
      'plane',
      [width, height, widthSegments, heightSegments, 0, 0],
      [],
      [],
    )
  }
}

export class CircleGeometry extends BufferGeometry {
  constructor(
    radius: number = 1,
    segments: number = 32,
    thetaStart: number = 0,
    thetaLength: number = 6.283185307179586,
  ) {
    super(
      'circle',
      [radius, segments, thetaStart, thetaLength, 0, 0],
      [],
      [],
    )
  }
}

export class CylinderGeometry extends BufferGeometry {
  constructor(
    radiusTop: number = 1,
    radiusBottom: number = 1,
    height: number = 1,
    radialSegments: number = 32,
    heightSegments: number = 1,
    openEnded: boolean = false,
  ) {
    super(
      'cylinder',
      [radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded ? 1 : 0],
      [],
      [],
    )
  }
}

export class ConeGeometry extends BufferGeometry {
  constructor(
    radius: number = 1,
    height: number = 1,
    radialSegments: number = 32,
    heightSegments: number = 1,
    openEnded: boolean = false,
  ) {
    super(
      'cone',
      [0, radius, height, radialSegments, heightSegments, openEnded ? 1 : 0],
      [],
      [],
    )
  }
}

export class RingGeometry extends BufferGeometry {
  constructor(
    innerRadius: number = 0.5,
    outerRadius: number = 1,
    thetaSegments: number = 32,
    phiSegments: number = 1,
    thetaStart: number = 0,
    thetaLength: number = 6.283185307179586,
  ) {
    super(
      'ring',
      [innerRadius, outerRadius, thetaSegments, phiSegments, thetaStart, thetaLength],
      [],
      [],
    )
  }
}

export class TorusKnotGeometry extends BufferGeometry {
  constructor(
    radius: number = 1,
    tube: number = 0.4,
    tubularSegments: number = 64,
    radialSegments: number = 8,
    p: number = 2,
    q: number = 3,
  ) {
    super(
      'torusKnot',
      [radius, tube, tubularSegments, radialSegments, p, q],
      [],
      [],
    )
  }
}

export class TorusGeometry extends BufferGeometry {
  constructor(
    radius: number = 1,
    tube: number = 0.4,
    radialSegments: number = 12,
    tubularSegments: number = 48,
    arc: number = 6.283185307179586,
    thetaStart: number = 0,
  ) {
    super(
      'torus',
      [radius, tube, radialSegments, tubularSegments, arc, thetaStart],
      [],
      [],
    )
  }
}

export class SphereGeometry extends BufferGeometry {
  constructor(
    radius: number = 1,
    widthSegments: number = 32,
    heightSegments: number = 16,
    phiStart: number = 0,
    phiLength: number = 6.283185307179586,
    thetaStart: number = 0,
  ) {
    super(
      'sphere',
      [radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart],
      [],
      [],
    )
  }
}

/** @gea-no-runtime-bridge */
export class Material {
  readonly kind: string = ''

  constructor(kind: string) {
    this.kind = kind
  }
}

interface MeshBasicMaterialOptions {
  color?: number
}

export class MeshBasicMaterial extends Material {
  readonly color: Color

  constructor(options: MeshBasicMaterialOptions = {}) {
    super('basic')
    this.color = new Color(options.color ?? 0xffffff)
  }
}

export class MeshStandardMaterial extends Material {
  readonly color: Color

  constructor(options: MeshBasicMaterialOptions = {}) {
    super('standard')
    this.color = new Color(options.color ?? 0xffffff)
  }
}

export class MeshLambertMaterial extends MeshStandardMaterial {}
export class MeshPhongMaterial extends MeshStandardMaterial {}

export class MeshNormalMaterial extends Material {
  constructor() {
    super('normal')
  }
}

export class Mesh extends Object3D {
  readonly geometry = new BufferGeometry('', [], [], [])
  readonly material = new Material('')

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
