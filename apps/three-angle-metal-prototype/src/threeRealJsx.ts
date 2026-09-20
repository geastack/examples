import {
  BoxGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshNormalMaterial,
  MeshPhongMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  RingGeometry,
  Scene,
  SphereGeometry,
  TorusGeometry,
  TorusKnotGeometry,
  Vector3,
} from 'three'
import type {
  Mesh as RuntimeMesh,
  PerspectiveCamera as RuntimePerspectiveCamera,
  Scene as RuntimeScene,
  Vector3 as RuntimeVector3,
} from './threeGeometryRuntime'
import {
  createThreeNativeSceneBuffer,
} from './threeSceneAdapter'
import type {
  ThreeBufferSceneElement,
} from './threeJsx'
import {
  logAngleHostSmoke,
} from './angleHost'

/**
 * @returns {Mesh}
 */
export function createThreeRealBoxBasicMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new BoxGeometry(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5),
      new (MeshBasicMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealBoxLambertMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new BoxGeometry(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5),
      new (MeshLambertMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealBoxNormalMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new BoxGeometry(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5),
      new MeshNormalMaterial(),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealBoxPhongMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new BoxGeometry(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5),
      new (MeshPhongMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealBoxStandardMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new BoxGeometry(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5),
      new (MeshStandardMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealCircleBasicMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new CircleGeometry(parameter0, parameter1, parameter2, parameter3),
      new (MeshBasicMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealCircleLambertMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new CircleGeometry(parameter0, parameter1, parameter2, parameter3),
      new (MeshLambertMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealCircleNormalMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new CircleGeometry(parameter0, parameter1, parameter2, parameter3),
      new MeshNormalMaterial(),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealCirclePhongMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new CircleGeometry(parameter0, parameter1, parameter2, parameter3),
      new (MeshPhongMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealCircleStandardMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new CircleGeometry(parameter0, parameter1, parameter2, parameter3),
      new (MeshStandardMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealConeBasicMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new ConeGeometry(parameter1, parameter2, parameter3, parameter4, parameter5 > 0.5),
      new (MeshBasicMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealConeLambertMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new ConeGeometry(parameter1, parameter2, parameter3, parameter4, parameter5 > 0.5),
      new (MeshLambertMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealConeNormalMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new ConeGeometry(parameter1, parameter2, parameter3, parameter4, parameter5 > 0.5),
      new MeshNormalMaterial(),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealConePhongMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new ConeGeometry(parameter1, parameter2, parameter3, parameter4, parameter5 > 0.5),
      new (MeshPhongMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealConeStandardMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new ConeGeometry(parameter1, parameter2, parameter3, parameter4, parameter5 > 0.5),
      new (MeshStandardMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealCylinderBasicMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new CylinderGeometry(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5 > 0.5),
      new (MeshBasicMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealCylinderLambertMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new CylinderGeometry(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5 > 0.5),
      new (MeshLambertMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealCylinderNormalMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new CylinderGeometry(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5 > 0.5),
      new MeshNormalMaterial(),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealCylinderPhongMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new CylinderGeometry(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5 > 0.5),
      new (MeshPhongMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealCylinderStandardMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new CylinderGeometry(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5 > 0.5),
      new (MeshStandardMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealPlaneBasicMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new PlaneGeometry(parameter0, parameter1, parameter2, parameter3),
      new (MeshBasicMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealPlaneLambertMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new PlaneGeometry(parameter0, parameter1, parameter2, parameter3),
      new (MeshLambertMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealPlaneNormalMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new PlaneGeometry(parameter0, parameter1, parameter2, parameter3),
      new MeshNormalMaterial(),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealPlanePhongMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new PlaneGeometry(parameter0, parameter1, parameter2, parameter3),
      new (MeshPhongMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealPlaneStandardMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new PlaneGeometry(parameter0, parameter1, parameter2, parameter3),
      new (MeshStandardMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealRingBasicMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new RingGeometry(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5),
      new (MeshBasicMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealRingLambertMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new RingGeometry(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5),
      new (MeshLambertMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealRingNormalMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new RingGeometry(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5),
      new MeshNormalMaterial(),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealRingPhongMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new RingGeometry(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5),
      new (MeshPhongMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealRingStandardMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new RingGeometry(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5),
      new (MeshStandardMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealSphereBasicMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new SphereGeometry(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5),
      new (MeshBasicMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealSphereLambertMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new SphereGeometry(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5),
      new (MeshLambertMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealSphereNormalMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new SphereGeometry(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5),
      new MeshNormalMaterial(),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealSpherePhongMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new SphereGeometry(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5),
      new (MeshPhongMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealSphereStandardMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new SphereGeometry(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5),
      new (MeshStandardMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealTorusBasicMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new TorusGeometry(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5),
      new (MeshBasicMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealTorusLambertMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new TorusGeometry(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5),
      new (MeshLambertMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealTorusNormalMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new TorusGeometry(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5),
      new MeshNormalMaterial(),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealTorusPhongMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new TorusGeometry(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5),
      new (MeshPhongMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealTorusStandardMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new TorusGeometry(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5),
      new (MeshStandardMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealTorusKnotBasicMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new TorusKnotGeometry(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5),
      new (MeshBasicMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealTorusKnotLambertMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new TorusKnotGeometry(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5),
      new (MeshLambertMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealTorusKnotNormalMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new TorusKnotGeometry(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5),
      new MeshNormalMaterial(),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealTorusKnotPhongMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new TorusKnotGeometry(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5),
      new (MeshPhongMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @returns {Mesh}
 */
export function createThreeRealTorusKnotStandardMesh(
  materialColor: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  parameter0: number,
  parameter1: number,
  parameter2: number,
  parameter3: number,
  parameter4: number,
  parameter5: number,
): RuntimeMesh {
  return applyThreeRealMeshTransform(
    new Mesh(
      new TorusKnotGeometry(parameter0, parameter1, parameter2, parameter3, parameter4, parameter5),
      new (MeshStandardMaterial as unknown as NumericMaterialConstructor)(materialColor),
    ) as unknown as RuntimeMesh,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  )
}

/**
 * @param {Mesh} mesh0
 * @returns {ThreeBufferSceneElement}
 */
export function createThreeRealSceneBuffer1(
  demoCode: number,
  backgroundColor: number,
  cameraFov: number,
  cameraAspect: number,
  cameraNear: number,
  cameraFar: number,
  cameraPositionX: number,
  cameraPositionY: number,
  cameraPositionZ: number,
  cameraLookAtX: number,
  cameraLookAtY: number,
  cameraLookAtZ: number,
  mesh0: RuntimeMesh,
): ThreeBufferSceneElement {
  logAngleHostSmoke('upstream Three JSX: constructing real Three scene')
  const scene = new Scene() as unknown as RuntimeScene
  scene.add(mesh0)
  return createThreeRealSceneBufferForScene(
    demoCode,
    backgroundColor,
    cameraFov,
    cameraAspect,
    cameraNear,
    cameraFar,
    cameraPositionX,
    cameraPositionY,
    cameraPositionZ,
    cameraLookAtX,
    cameraLookAtY,
    cameraLookAtZ,
    scene,
  )
}

/**
 * @param {Mesh} mesh0
 * @param {Mesh} mesh1
 * @returns {ThreeBufferSceneElement}
 */
export function createThreeRealSceneBuffer2(
  demoCode: number,
  backgroundColor: number,
  cameraFov: number,
  cameraAspect: number,
  cameraNear: number,
  cameraFar: number,
  cameraPositionX: number,
  cameraPositionY: number,
  cameraPositionZ: number,
  cameraLookAtX: number,
  cameraLookAtY: number,
  cameraLookAtZ: number,
  mesh0: RuntimeMesh,
  mesh1: RuntimeMesh,
): ThreeBufferSceneElement {
  logAngleHostSmoke('upstream Three JSX: constructing real Three scene')
  const scene = new Scene() as unknown as RuntimeScene
  scene.add(mesh0)
  scene.add(mesh1)
  return createThreeRealSceneBufferForScene(demoCode, backgroundColor, cameraFov, cameraAspect, cameraNear, cameraFar, cameraPositionX, cameraPositionY, cameraPositionZ, cameraLookAtX, cameraLookAtY, cameraLookAtZ, scene)
}

/**
 * @param {Mesh} mesh0
 * @param {Mesh} mesh1
 * @param {Mesh} mesh2
 * @returns {ThreeBufferSceneElement}
 */
export function createThreeRealSceneBuffer3(
  demoCode: number,
  backgroundColor: number,
  cameraFov: number,
  cameraAspect: number,
  cameraNear: number,
  cameraFar: number,
  cameraPositionX: number,
  cameraPositionY: number,
  cameraPositionZ: number,
  cameraLookAtX: number,
  cameraLookAtY: number,
  cameraLookAtZ: number,
  mesh0: RuntimeMesh,
  mesh1: RuntimeMesh,
  mesh2: RuntimeMesh,
): ThreeBufferSceneElement {
  logAngleHostSmoke('upstream Three JSX: constructing real Three scene')
  const scene = new Scene() as unknown as RuntimeScene
  scene.add(mesh0)
  scene.add(mesh1)
  scene.add(mesh2)
  return createThreeRealSceneBufferForScene(demoCode, backgroundColor, cameraFov, cameraAspect, cameraNear, cameraFar, cameraPositionX, cameraPositionY, cameraPositionZ, cameraLookAtX, cameraLookAtY, cameraLookAtZ, scene)
}

/**
 * @param {Mesh} mesh0
 * @param {Mesh} mesh1
 * @param {Mesh} mesh2
 * @param {Mesh} mesh3
 * @returns {ThreeBufferSceneElement}
 */
export function createThreeRealSceneBuffer4(
  demoCode: number,
  backgroundColor: number,
  cameraFov: number,
  cameraAspect: number,
  cameraNear: number,
  cameraFar: number,
  cameraPositionX: number,
  cameraPositionY: number,
  cameraPositionZ: number,
  cameraLookAtX: number,
  cameraLookAtY: number,
  cameraLookAtZ: number,
  mesh0: RuntimeMesh,
  mesh1: RuntimeMesh,
  mesh2: RuntimeMesh,
  mesh3: RuntimeMesh,
): ThreeBufferSceneElement {
  logAngleHostSmoke('upstream Three JSX: constructing real Three scene')
  const scene = new Scene() as unknown as RuntimeScene
  scene.add(mesh0)
  scene.add(mesh1)
  scene.add(mesh2)
  scene.add(mesh3)
  return createThreeRealSceneBufferForScene(demoCode, backgroundColor, cameraFov, cameraAspect, cameraNear, cameraFar, cameraPositionX, cameraPositionY, cameraPositionZ, cameraLookAtX, cameraLookAtY, cameraLookAtZ, scene)
}

/**
 * @param {Mesh} mesh0
 * @param {Mesh} mesh1
 * @param {Mesh} mesh2
 * @param {Mesh} mesh3
 * @param {Mesh} mesh4
 * @returns {ThreeBufferSceneElement}
 */
export function createThreeRealSceneBuffer5(
  demoCode: number,
  backgroundColor: number,
  cameraFov: number,
  cameraAspect: number,
  cameraNear: number,
  cameraFar: number,
  cameraPositionX: number,
  cameraPositionY: number,
  cameraPositionZ: number,
  cameraLookAtX: number,
  cameraLookAtY: number,
  cameraLookAtZ: number,
  mesh0: RuntimeMesh,
  mesh1: RuntimeMesh,
  mesh2: RuntimeMesh,
  mesh3: RuntimeMesh,
  mesh4: RuntimeMesh,
): ThreeBufferSceneElement {
  logAngleHostSmoke('upstream Three JSX: constructing real Three scene')
  const scene = new Scene() as unknown as RuntimeScene
  scene.add(mesh0)
  scene.add(mesh1)
  scene.add(mesh2)
  scene.add(mesh3)
  scene.add(mesh4)
  return createThreeRealSceneBufferForScene(demoCode, backgroundColor, cameraFov, cameraAspect, cameraNear, cameraFar, cameraPositionX, cameraPositionY, cameraPositionZ, cameraLookAtX, cameraLookAtY, cameraLookAtZ, scene)
}

/**
 * @param {Mesh} mesh0
 * @param {Mesh} mesh1
 * @param {Mesh} mesh2
 * @param {Mesh} mesh3
 * @param {Mesh} mesh4
 * @param {Mesh} mesh5
 * @returns {ThreeBufferSceneElement}
 */
export function createThreeRealSceneBuffer6(
  demoCode: number,
  backgroundColor: number,
  cameraFov: number,
  cameraAspect: number,
  cameraNear: number,
  cameraFar: number,
  cameraPositionX: number,
  cameraPositionY: number,
  cameraPositionZ: number,
  cameraLookAtX: number,
  cameraLookAtY: number,
  cameraLookAtZ: number,
  mesh0: RuntimeMesh,
  mesh1: RuntimeMesh,
  mesh2: RuntimeMesh,
  mesh3: RuntimeMesh,
  mesh4: RuntimeMesh,
  mesh5: RuntimeMesh,
): ThreeBufferSceneElement {
  logAngleHostSmoke('upstream Three JSX: constructing real Three scene')
  const scene = new Scene() as unknown as RuntimeScene
  scene.add(mesh0)
  scene.add(mesh1)
  scene.add(mesh2)
  scene.add(mesh3)
  scene.add(mesh4)
  scene.add(mesh5)
  return createThreeRealSceneBufferForScene(demoCode, backgroundColor, cameraFov, cameraAspect, cameraNear, cameraFar, cameraPositionX, cameraPositionY, cameraPositionZ, cameraLookAtX, cameraLookAtY, cameraLookAtZ, scene)
}

/**
 * @param {Mesh} mesh0
 * @param {Mesh} mesh1
 * @param {Mesh} mesh2
 * @param {Mesh} mesh3
 * @param {Mesh} mesh4
 * @param {Mesh} mesh5
 * @param {Mesh} mesh6
 * @returns {ThreeBufferSceneElement}
 */
export function createThreeRealSceneBuffer7(
  demoCode: number,
  backgroundColor: number,
  cameraFov: number,
  cameraAspect: number,
  cameraNear: number,
  cameraFar: number,
  cameraPositionX: number,
  cameraPositionY: number,
  cameraPositionZ: number,
  cameraLookAtX: number,
  cameraLookAtY: number,
  cameraLookAtZ: number,
  mesh0: RuntimeMesh,
  mesh1: RuntimeMesh,
  mesh2: RuntimeMesh,
  mesh3: RuntimeMesh,
  mesh4: RuntimeMesh,
  mesh5: RuntimeMesh,
  mesh6: RuntimeMesh,
): ThreeBufferSceneElement {
  logAngleHostSmoke('upstream Three JSX: constructing real Three scene')
  const scene = new Scene() as unknown as RuntimeScene
  scene.add(mesh0)
  scene.add(mesh1)
  scene.add(mesh2)
  scene.add(mesh3)
  scene.add(mesh4)
  scene.add(mesh5)
  scene.add(mesh6)
  return createThreeRealSceneBufferForScene(demoCode, backgroundColor, cameraFov, cameraAspect, cameraNear, cameraFar, cameraPositionX, cameraPositionY, cameraPositionZ, cameraLookAtX, cameraLookAtY, cameraLookAtZ, scene)
}

/**
 * @param {Mesh} mesh0
 * @param {Mesh} mesh1
 * @param {Mesh} mesh2
 * @param {Mesh} mesh3
 * @param {Mesh} mesh4
 * @param {Mesh} mesh5
 * @param {Mesh} mesh6
 * @param {Mesh} mesh7
 * @returns {ThreeBufferSceneElement}
 */
export function createThreeRealSceneBuffer8(
  demoCode: number,
  backgroundColor: number,
  cameraFov: number,
  cameraAspect: number,
  cameraNear: number,
  cameraFar: number,
  cameraPositionX: number,
  cameraPositionY: number,
  cameraPositionZ: number,
  cameraLookAtX: number,
  cameraLookAtY: number,
  cameraLookAtZ: number,
  mesh0: RuntimeMesh,
  mesh1: RuntimeMesh,
  mesh2: RuntimeMesh,
  mesh3: RuntimeMesh,
  mesh4: RuntimeMesh,
  mesh5: RuntimeMesh,
  mesh6: RuntimeMesh,
  mesh7: RuntimeMesh,
): ThreeBufferSceneElement {
  logAngleHostSmoke('upstream Three JSX: constructing real Three scene')
  const scene = new Scene() as unknown as RuntimeScene
  scene.add(mesh0)
  scene.add(mesh1)
  scene.add(mesh2)
  scene.add(mesh3)
  scene.add(mesh4)
  scene.add(mesh5)
  scene.add(mesh6)
  scene.add(mesh7)
  return createThreeRealSceneBufferForScene(
    demoCode,
    backgroundColor,
    cameraFov,
    cameraAspect,
    cameraNear,
    cameraFar,
    cameraPositionX,
    cameraPositionY,
    cameraPositionZ,
    cameraLookAtX,
    cameraLookAtY,
    cameraLookAtZ,
    scene,
  )
}

/**
 * @param {Scene} scene
 * @returns {ThreeBufferSceneElement}
 */
function createThreeRealSceneBufferForScene(
  demoCode: number,
  backgroundColor: number,
  cameraFov: number,
  cameraAspect: number,
  cameraNear: number,
  cameraFar: number,
  cameraPositionX: number,
  cameraPositionY: number,
  cameraPositionZ: number,
  cameraLookAtX: number,
  cameraLookAtY: number,
  cameraLookAtZ: number,
  scene: RuntimeScene,
): ThreeBufferSceneElement {
  const camera = new PerspectiveCamera(cameraFov, cameraAspect, cameraNear, cameraFar) as unknown as RuntimePerspectiveCamera
  camera.position.set(cameraPositionX, cameraPositionY, cameraPositionZ)
  camera.lookAt(new Vector3(cameraLookAtX, cameraLookAtY, cameraLookAtZ) as unknown as RuntimeVector3)
  const buffer = createThreeNativeSceneBuffer(demoCode, backgroundColor, scene, camera)
  return buffer
}

/**
 * @param {Mesh} mesh
 * @returns {Mesh}
 */
function applyThreeRealMeshTransform(
  mesh: RuntimeMesh,
  positionX: number,
  positionY: number,
  positionZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
): RuntimeMesh {
  mesh.position.set(positionX, positionY, positionZ)
  mesh.rotation.set(rotationX, rotationY, rotationZ)
  mesh.scale.set(scaleX, scaleY, scaleZ)
  return mesh
}

type Material = import('three').Material
type NumericMaterialConstructor = new (color: number) => Material
