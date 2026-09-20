type ThreeJsxChild = object | readonly object[]
type ThreeJsxColor = number | string
type ThreeJsxGeometryArg = number | boolean
type ThreeJsxMeshBasicMaterialOptions = {
  color?: ThreeJsxColor
}
type ThreeJsxMeshLambertMaterialOptions = {
  color?: ThreeJsxColor
}
type ThreeJsxMeshPhongMaterialOptions = {
  color?: ThreeJsxColor
  specular?: ThreeJsxColor
  shininess?: number
}
type ThreeJsxMeshStandardMaterialOptions = {
  color?: ThreeJsxColor
  roughness?: number
  metalness?: number
}
type ThreeJsxScale = number | readonly number[]

declare namespace JSX {
  // The checker only gives a JSX expression a real type when the global `JSX`
  // namespace declares `Element` -- without it every `<tag>.../>` types `any`,
  // regardless of how fully `IntrinsicElements` below is declared. This app's
  // scene DSL never reaches `@geastack/core`'s own `JSX.Element` (its
  // `index.d.ts` is not part of this program's module graph), so it is
  // declared here too; both are empty markers and merge without conflict.
  interface Element {}
  interface IntrinsicElements {
    scene: {
      demoCode?: number
      background?: ThreeJsxColor
      children?: ThreeJsxChild
    }
    threeScene: {
      demoCode?: number
      background?: ThreeJsxColor
      children?: ThreeJsxChild
    }
    group: {
      position?: readonly number[]
      'position-x'?: number
      'position-y'?: number
      'position-z'?: number
      positionX?: number
      positionY?: number
      positionZ?: number
      rotation?: readonly number[]
      'rotation-x'?: number
      'rotation-y'?: number
      'rotation-z'?: number
      rotationX?: number
      rotationY?: number
      rotationZ?: number
      scale?: ThreeJsxScale
      'scale-x'?: number
      'scale-y'?: number
      'scale-z'?: number
      scaleX?: number
      scaleY?: number
      scaleZ?: number
      children?: ThreeJsxChild
    }
    perspectiveCamera: {
      args?: readonly number[]
      fov?: number
      aspect?: number
      near?: number
      far?: number
      position?: readonly number[]
      'position-x'?: number
      'position-y'?: number
      'position-z'?: number
      positionX?: number
      positionY?: number
      positionZ?: number
      lookAt?: readonly number[]
      'lookAt-x'?: number
      'lookAt-y'?: number
      'lookAt-z'?: number
      lookAtX?: number
      lookAtY?: number
      lookAtZ?: number
    }
    mesh: {
      position?: readonly number[]
      'position-x'?: number
      'position-y'?: number
      'position-z'?: number
      positionX?: number
      positionY?: number
      positionZ?: number
      rotation?: readonly number[]
      'rotation-x'?: number
      'rotation-y'?: number
      'rotation-z'?: number
      rotationX?: number
      rotationY?: number
      rotationZ?: number
      scale?: ThreeJsxScale
      'scale-x'?: number
      'scale-y'?: number
      'scale-z'?: number
      scaleX?: number
      scaleY?: number
      scaleZ?: number
      children?: ThreeJsxChild
    }
    boxGeometry: {
      attach?: string
      args?: readonly ThreeJsxGeometryArg[]
    }
    circleGeometry: {
      attach?: string
      args?: readonly ThreeJsxGeometryArg[]
    }
    planeGeometry: {
      attach?: string
      args?: readonly ThreeJsxGeometryArg[]
    }
    coneGeometry: {
      attach?: string
      args?: readonly ThreeJsxGeometryArg[]
    }
    cylinderGeometry: {
      attach?: string
      args?: readonly ThreeJsxGeometryArg[]
    }
    ringGeometry: {
      attach?: string
      args?: readonly ThreeJsxGeometryArg[]
    }
    torusGeometry: {
      attach?: string
      args?: readonly ThreeJsxGeometryArg[]
    }
    torusKnotGeometry: {
      attach?: string
      args?: readonly ThreeJsxGeometryArg[]
    }
    sphereGeometry: {
      attach?: string
      args?: readonly ThreeJsxGeometryArg[]
    }
    meshBasicMaterial: {
      attach?: string
      color?: ThreeJsxColor
      args?: readonly [ThreeJsxMeshBasicMaterialOptions]
    }
    meshLambertMaterial: {
      attach?: string
      color?: ThreeJsxColor
      args?: readonly [ThreeJsxMeshLambertMaterialOptions]
    }
    meshPhongMaterial: {
      attach?: string
      color?: ThreeJsxColor
      specular?: ThreeJsxColor
      shininess?: number
      args?: readonly [ThreeJsxMeshPhongMaterialOptions]
    }
    meshStandardMaterial: {
      attach?: string
      color?: ThreeJsxColor
      roughness?: number
      metalness?: number
      args?: readonly [ThreeJsxMeshStandardMaterialOptions]
    }
    meshNormalMaterial: {
      attach?: string
      readonly __emptyMeshNormalMaterialProps?: never
    }
    color: {
      attach?: string
      args?: readonly ThreeJsxColor[]
    }
    ambientLight: {
      color?: ThreeJsxColor
      intensity?: number
    }
    directionalLight: {
      color?: ThreeJsxColor
      intensity?: number
      position?: readonly number[]
      'position-x'?: number
      'position-y'?: number
      'position-z'?: number
      positionX?: number
      positionY?: number
      positionZ?: number
    }
    pointLight: {
      color?: ThreeJsxColor
      intensity?: number
      position?: readonly number[]
      'position-x'?: number
      'position-y'?: number
      'position-z'?: number
      positionX?: number
      positionY?: number
      positionZ?: number
    }
  }
}
