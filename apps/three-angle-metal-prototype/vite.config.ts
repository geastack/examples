import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { appleNativeJsxPlugin, geaEmptyIrPlugin } from '@geastack/vite-plugin-apple-native'
import type { NodePath } from '@babel/traverse'
import type * as BabelTypes from '@babel/types'

const requireBabel = createRequire(import.meta.url)
const { parse } = requireBabel('@babel/parser')
const traverseModule = requireBabel('@babel/traverse')
const t = requireBabel('@babel/types')
const generateModule = requireBabel('@babel/generator')
const traverse = traverseModule.default || traverseModule
const generate = generateModule.default || generateModule

const __dirname = dirname(fileURLToPath(import.meta.url))
const useUpstreamThree = process.env.GEA_THREE_USE_UPSTREAM === '1'
const threeReferenceDemo = process.env.GEA_THREE_REFERENCE_DEMO ?? ''
const useWebglGeometriesReference = threeReferenceDemo === 'webgl_geometries'
const useLittlestTokyoReference = threeReferenceDemo === 'littlest_tokyo'
const threeGeometryRuntime = resolve(__dirname, 'src/threeGeometryRuntime.ts')
const reactThreeFiberShim = resolve(__dirname, 'src/reactThreeFiberShim.ts')
const threeSceneSource = resolve(
  __dirname,
  useLittlestTokyoReference
    ? 'src/referenceLittlestTokyoSceneSource.ts'
    : useWebglGeometriesReference
    ? 'src/referenceWebglGeometriesSceneSource.ts'
    : useUpstreamThree
    ? 'src/upstreamThreeJsxSceneSource.tsx'
    : 'src/defaultThreeSceneSource.tsx',
)
const threeMaterialTags = [
  'meshBasicMaterial',
  'meshLambertMaterial',
  'meshPhongMaterial',
  'meshStandardMaterial',
  'meshNormalMaterial',
] as const
const threeJsxTags = new Set([
  'Canvas',
  'scene',
  'threeScene',
  'group',
  'perspectiveCamera',
  'mesh',
  'boxGeometry',
  'circleGeometry',
  'planeGeometry',
  'coneGeometry',
  'cylinderGeometry',
  'ringGeometry',
  'torusGeometry',
  'torusKnotGeometry',
  'sphereGeometry',
  ...threeMaterialTags,
  'color',
  'ambientLight',
  'directionalLight',
  'pointLight',
])

const threeNamedColors = new Map<string, number>([
  ['black', 0x000000],
  ['blue', 0x0000ff],
  ['cyan', 0x00ffff],
  ['gray', 0x808080],
  ['green', 0x008000],
  ['grey', 0x808080],
  ['hotpink', 0xff69b4],
  ['lime', 0x00ff00],
  ['magenta', 0xff00ff],
  ['orange', 0xffa500],
  ['purple', 0x800080],
  ['red', 0xff0000],
  ['skyblue', 0x87ceeb],
  ['teal', 0x008080],
  ['turquoise', 0x40e0d0],
  ['white', 0xffffff],
  ['yellow', 0xffff00],
])

interface ThreeCameraParts {
  fov: BabelTypes.Expression
  aspect: BabelTypes.Expression
  near: BabelTypes.Expression
  far: BabelTypes.Expression
  positionX: BabelTypes.Expression
  positionY: BabelTypes.Expression
  positionZ: BabelTypes.Expression
  lookAtX: BabelTypes.Expression
  lookAtY: BabelTypes.Expression
  lookAtZ: BabelTypes.Expression
}

interface ThreeGeometryParts {
  geometryCode: BabelTypes.Expression
  parameter0: BabelTypes.Expression
  parameter1: BabelTypes.Expression
  parameter2: BabelTypes.Expression
  parameter3: BabelTypes.Expression
  parameter4: BabelTypes.Expression
  parameter5: BabelTypes.Expression
}

interface ThreeMaterialParts {
  materialCode: BabelTypes.Expression
  materialName: string
  materialColor: BabelTypes.Expression
}

interface ThreeLightParts {
  ambientLightColor: BabelTypes.Expression
  ambientLightIntensity: BabelTypes.Expression
  directionalLightColor: BabelTypes.Expression
  directionalLightIntensity: BabelTypes.Expression
  directionalLightX: BabelTypes.Expression
  directionalLightY: BabelTypes.Expression
  directionalLightZ: BabelTypes.Expression
}

interface ThreeMeshParts {
  positionX: BabelTypes.Expression
  positionY: BabelTypes.Expression
  positionZ: BabelTypes.Expression
  rotationX: BabelTypes.Expression
  rotationY: BabelTypes.Expression
  rotationZ: BabelTypes.Expression
  scaleX: BabelTypes.Expression
  scaleY: BabelTypes.Expression
  scaleZ: BabelTypes.Expression
  geometry: ThreeGeometryParts
  material: ThreeMaterialParts
}

type ThreeStaticNode = BabelTypes.JSXElement | BabelTypes.JSXFragment

interface ThreeStaticComponent {
  readonly name: string
  readonly param: BabelTypes.FunctionDeclaration['params'][number] | null
  readonly returnNode: ThreeStaticNode
}

interface ThreeComponentBindings {
  readonly props: Map<string, BabelTypes.Expression>
  readonly children: Map<string, BabelTypes.JSXElement['children']>
}

interface ThreeJsxTransformContext {
  readonly components: Map<string, ThreeStaticComponent>
  readonly usedComponents: Set<string>
  readonly usedRealJsxHelpers: Set<string>
  readonly componentStack: string[]
}

function threeSceneJsxPlugin() {
  return {
    name: 'three-scene-jsx',
    enforce: 'pre',
    transform(code: string, id: string) {
      if (!id.endsWith('.tsx')) return null
      const ast = parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] })
      const context: ThreeJsxTransformContext = {
        components: collectThreeStaticComponents(ast),
        usedComponents: new Set(),
        usedRealJsxHelpers: new Set(),
        componentStack: [],
      }
      let changed = false
      traverse(ast, {
        JSXElement(path: NodePath<BabelTypes.JSXElement>) {
          if (isInsideThreeStaticComponent(path, context)) return
          const tag = jsxTagName(path.node.openingElement.name)
          if (!threeJsxTags.has(tag)) return
          path.replaceWith(buildThreeJsxExpression(path.node, context))
          if (useUpstreamThree) stripParentTypeCasts(path)
          path.skip()
          changed = true
        },
      })
      if (context.usedComponents.size > 0) {
        removeUsedThreeStaticComponents(ast, context.usedComponents)
        changed = true
      }
      if (useUpstreamThree && changed) ensureThreeRealJsxImport(ast, context.usedRealJsxHelpers)
      if (!changed) return null
      return { code: generate(ast, { comments: true }).code, map: null }
    },
  }
}

function stripParentTypeCasts(path: NodePath<BabelTypes.Node>): void {
  let current: NodePath<BabelTypes.Node> = path
  while (
    current.parentPath?.isTSAsExpression()
    || current.parentPath?.isTSSatisfiesExpression()
    || current.parentPath?.isTypeCastExpression()
  ) {
    const parent = current.parentPath as NodePath<BabelTypes.TSAsExpression | BabelTypes.TSSatisfiesExpression | BabelTypes.TypeCastExpression>
    if (!t.isExpression(current.node)) return
    parent.replaceWith(t.cloneNode(current.node, true))
    current = parent as NodePath<BabelTypes.Node>
  }
}

function ensureThreeRealJsxImport(ast: BabelTypes.File, helpers: Set<string>): void {
  if (helpers.size === 0) return
  const helperNames = [...helpers].sort()
  for (const statement of ast.program.body) {
    if (!t.isImportDeclaration(statement) || statement.source.value !== './threeRealJsx') continue
    const existing = new Set(statement.specifiers
      .filter((specifier): specifier is BabelTypes.ImportSpecifier => t.isImportSpecifier(specifier) && t.isIdentifier(specifier.imported))
      .map((specifier) => (specifier.imported as BabelTypes.Identifier).name))
    for (const helperName of helperNames) {
      if (!existing.has(helperName)) {
        statement.specifiers.push(t.importSpecifier(t.identifier(helperName), t.identifier(helperName)))
      }
    }
    return
  }
  ast.program.body.unshift(t.importDeclaration(
    helperNames.map((helperName) => t.importSpecifier(t.identifier(helperName), t.identifier(helperName))),
    t.stringLiteral('./threeRealJsx'),
  ))
}

function collectThreeStaticComponents(ast: BabelTypes.File): Map<string, ThreeStaticComponent> {
  const components = new Map<string, ThreeStaticComponent>()
  traverse(ast, {
    FunctionDeclaration(path: NodePath<BabelTypes.FunctionDeclaration>) {
      const name = path.node.id?.name
      if (!name || !isThreeComponentName(name)) return
      const returnNode = staticReturnNode(path.node.body)
      if (!returnNode) return
      components.set(name, {
        name,
        param: path.node.params[0] ?? null,
        returnNode: t.cloneNode(returnNode, true),
      })
    },
    VariableDeclarator(path: NodePath<BabelTypes.VariableDeclarator>) {
      if (!t.isIdentifier(path.node.id) || !isThreeComponentName(path.node.id.name)) return
      const init = path.node.init
      if (!init || (!t.isArrowFunctionExpression(init) && !t.isFunctionExpression(init))) return
      const returnNode = t.isBlockStatement(init.body)
        ? staticReturnNode(init.body)
        : unwrapThreeJsxNode(init.body)
      if (!returnNode) return
      components.set(path.node.id.name, {
        name: path.node.id.name,
        param: init.params[0] ?? null,
        returnNode: t.cloneNode(returnNode, true),
      })
    },
  })
  return components
}

function staticReturnNode(body: BabelTypes.BlockStatement): ThreeStaticNode | null {
  for (const statement of body.body) {
    if (t.isReturnStatement(statement) && statement.argument) return unwrapThreeJsxNode(statement.argument)
  }
  return null
}

function unwrapThreeJsxNode(node: BabelTypes.Node): ThreeStaticNode | null {
  if (t.isJSXElement(node)) return node
  if (t.isJSXFragment(node)) return node
  if (t.isTSAsExpression(node) || t.isTSSatisfiesExpression(node) || t.isTypeCastExpression(node)) {
    return unwrapThreeJsxNode(node.expression)
  }
  return null
}

function removeUsedThreeStaticComponents(ast: BabelTypes.File, usedComponents: Set<string>): void {
  traverse(ast, {
    FunctionDeclaration(path: NodePath<BabelTypes.FunctionDeclaration>) {
      const name = path.node.id?.name
      if (name && usedComponents.has(name)) path.remove()
    },
    VariableDeclarator(path: NodePath<BabelTypes.VariableDeclarator>) {
      if (!t.isIdentifier(path.node.id) || !usedComponents.has(path.node.id.name)) return
      const declaration = path.parentPath
      path.remove()
      if (declaration?.isVariableDeclaration() && declaration.node.declarations.length === 0) declaration.remove()
    },
  })
}

function isThreeComponentName(name: string): boolean {
  return /^[A-Z]/.test(name) && name !== 'Canvas'
}

function isInsideThreeStaticComponent(
  path: NodePath<BabelTypes.JSXElement>,
  context: ThreeJsxTransformContext,
): boolean {
  return Boolean(path.findParent((parent) => {
    if (parent.isFunctionDeclaration()) {
      const name = parent.node.id?.name
      return Boolean(name && context.components.has(name))
    }
    if (parent.isVariableDeclarator() && t.isIdentifier(parent.node.id)) {
      return context.components.has(parent.node.id.name)
    }
    return false
  }))
}

function buildThreeJsxExpression(node: BabelTypes.JSXElement, context: ThreeJsxTransformContext): BabelTypes.Expression {
  const tag = jsxTagName(node.openingElement.name)
  const attrs = threeJsxAttrs(node)
  if (tag === 'Canvas') {
    return buildThreeSceneExpression(
      numberAttr(attrs, 'demoCode', 0),
      sceneBackgroundColor(node, tag, attrs, context),
      canvasCameraParts(node, attrs, context),
      lightPartsFromSceneChildren(node, tag, context),
      meshPartsFromSceneChildren(node, tag, context),
      context,
    )
  }
  if (tag === 'scene' || tag === 'threeScene') {
    return buildThreeSceneExpression(
      numberAttr(attrs, 'demoCode', 0),
      sceneBackgroundColor(node, tag, attrs, context),
      cameraPartsFromElement(requiredThreeChildElement(node, tag, ['perspectiveCamera'], 'camera', context)),
      lightPartsFromSceneChildren(node, tag, context),
      meshPartsFromSceneChildren(node, tag, context),
      context,
    )
  }
  if (tag === 'mesh') {
    return t.callExpression(t.identifier('createThreeMesh'), [
      axisNumberAttrOrArrayAttrElement(attrs, 'position', 'x', 0, 0),
      axisNumberAttrOrArrayAttrElement(attrs, 'position', 'y', 1, 0),
      axisNumberAttrOrArrayAttrElement(attrs, 'position', 'z', 2, 0),
      axisNumberAttrOrArrayAttrElement(attrs, 'rotation', 'x', 0, 0),
      axisNumberAttrOrArrayAttrElement(attrs, 'rotation', 'y', 1, 0),
      axisNumberAttrOrArrayAttrElement(attrs, 'rotation', 'z', 2, 0),
      axisScaleAttrElement(attrs, 'x', 0, 1),
      axisScaleAttrElement(attrs, 'y', 1, 1),
      axisScaleAttrElement(attrs, 'z', 2, 1),
      requiredThreeChild(node, tag, ['boxGeometry', 'circleGeometry', 'planeGeometry', 'coneGeometry', 'cylinderGeometry', 'ringGeometry', 'torusGeometry', 'torusKnotGeometry', 'sphereGeometry'], 'geometry', context),
      requiredThreeChild(node, tag, threeMaterialTags, 'material', context),
    ])
  }
  if (tag === 'perspectiveCamera') {
    return t.callExpression(t.identifier('createPerspectiveCamera'), [
      numberAttrOrArrayAttrElement(attrs, 'fov', 'args', 0, 70),
      numberAttrOrArrayAttrElement(attrs, 'aspect', 'args', 1, 1),
      numberAttrOrArrayAttrElement(attrs, 'near', 'args', 2, 0.01),
      numberAttrOrArrayAttrElement(attrs, 'far', 'args', 3, 100),
      axisNumberAttrOrArrayAttrElement(attrs, 'position', 'x', 0, 0),
      axisNumberAttrOrArrayAttrElement(attrs, 'position', 'y', 1, 0),
      axisNumberAttrOrArrayAttrElement(attrs, 'position', 'z', 2, 0),
      arrayAttrElement(attrs, 'lookAt', 0, 0),
      arrayAttrElement(attrs, 'lookAt', 1, 0),
      arrayAttrElement(attrs, 'lookAt', 2, 0),
    ])
  }
  if (tag === 'boxGeometry') {
    assertAttachAttr(attrs, tag, 'geometry')
    return t.callExpression(t.identifier('createBoxGeometry'), [
      arrayAttrElement(attrs, 'args', 0, 1),
      arrayAttrElement(attrs, 'args', 1, 1),
      arrayAttrElement(attrs, 'args', 2, 1),
      arrayAttrElement(attrs, 'args', 3, 1),
      arrayAttrElement(attrs, 'args', 4, 1),
      arrayAttrElement(attrs, 'args', 5, 1),
    ])
  }
  if (tag === 'circleGeometry') {
    assertAttachAttr(attrs, tag, 'geometry')
    return t.callExpression(t.identifier('createCircleGeometry'), [
      arrayAttrElement(attrs, 'args', 0, 1),
      arrayAttrElement(attrs, 'args', 1, 32),
      arrayAttrElement(attrs, 'args', 2, 0),
      arrayAttrElement(attrs, 'args', 3, 6.283185307179586),
    ])
  }
  if (tag === 'planeGeometry') {
    assertAttachAttr(attrs, tag, 'geometry')
    return t.callExpression(t.identifier('createPlaneGeometry'), [
      arrayAttrElement(attrs, 'args', 0, 1),
      arrayAttrElement(attrs, 'args', 1, 1),
      arrayAttrElement(attrs, 'args', 2, 1),
      arrayAttrElement(attrs, 'args', 3, 1),
    ])
  }
  if (tag === 'coneGeometry') {
    assertAttachAttr(attrs, tag, 'geometry')
    return t.callExpression(t.identifier('createConeGeometry'), [
      arrayAttrElement(attrs, 'args', 0, 1),
      arrayAttrElement(attrs, 'args', 1, 1),
      arrayAttrElement(attrs, 'args', 2, 32),
      arrayAttrElement(attrs, 'args', 3, 1),
      boolArrayAttrElement(attrs, 'args', 4, false),
    ])
  }
  if (tag === 'cylinderGeometry') {
    assertAttachAttr(attrs, tag, 'geometry')
    return t.callExpression(t.identifier('createCylinderGeometry'), [
      arrayAttrElement(attrs, 'args', 0, 1),
      arrayAttrElement(attrs, 'args', 1, 1),
      arrayAttrElement(attrs, 'args', 2, 1),
      arrayAttrElement(attrs, 'args', 3, 32),
      arrayAttrElement(attrs, 'args', 4, 1),
      boolArrayAttrElement(attrs, 'args', 5, false),
    ])
  }
  if (tag === 'ringGeometry') {
    assertAttachAttr(attrs, tag, 'geometry')
    return t.callExpression(t.identifier('createRingGeometry'), [
      arrayAttrElement(attrs, 'args', 0, 0.5),
      arrayAttrElement(attrs, 'args', 1, 1),
      arrayAttrElement(attrs, 'args', 2, 32),
      arrayAttrElement(attrs, 'args', 3, 1),
      arrayAttrElement(attrs, 'args', 4, 0),
      arrayAttrElement(attrs, 'args', 5, 6.283185307179586),
    ])
  }
  if (tag === 'torusGeometry') {
    assertAttachAttr(attrs, tag, 'geometry')
    return t.callExpression(t.identifier('createTorusGeometry'), [
      arrayAttrElement(attrs, 'args', 0, 1),
      arrayAttrElement(attrs, 'args', 1, 0.4),
      arrayAttrElement(attrs, 'args', 2, 12),
      arrayAttrElement(attrs, 'args', 3, 48),
      arrayAttrElement(attrs, 'args', 4, 6.283185307179586),
      arrayAttrElement(attrs, 'args', 5, 0),
    ])
  }
  if (tag === 'torusKnotGeometry') {
    assertAttachAttr(attrs, tag, 'geometry')
    return t.callExpression(t.identifier('createTorusKnotGeometry'), [
      arrayAttrElement(attrs, 'args', 0, 1),
      arrayAttrElement(attrs, 'args', 1, 0.4),
      arrayAttrElement(attrs, 'args', 2, 64),
      arrayAttrElement(attrs, 'args', 3, 8),
      arrayAttrElement(attrs, 'args', 4, 2),
      arrayAttrElement(attrs, 'args', 5, 3),
    ])
  }
  if (tag === 'sphereGeometry') {
    assertAttachAttr(attrs, tag, 'geometry')
    return t.callExpression(t.identifier('createSphereGeometry'), [
      arrayAttrElement(attrs, 'args', 0, 1),
      arrayAttrElement(attrs, 'args', 1, 32),
      arrayAttrElement(attrs, 'args', 2, 16),
      arrayAttrElement(attrs, 'args', 3, 0),
      arrayAttrElement(attrs, 'args', 4, 6.283185307179586),
      arrayAttrElement(attrs, 'args', 5, 0),
    ])
  }
  if (tag === 'meshBasicMaterial' || tag === 'meshLambertMaterial' || tag === 'meshPhongMaterial' || tag === 'meshStandardMaterial') {
    assertAttachAttr(attrs, tag, 'material')
    const materialFactory =
      tag === 'meshLambertMaterial'
        ? 'createMeshLambertMaterial'
        : tag === 'meshPhongMaterial'
          ? 'createMeshPhongMaterial'
          : tag === 'meshStandardMaterial'
            ? 'createMeshStandardMaterial'
            : 'createMeshBasicMaterial'
    return t.callExpression(t.identifier(materialFactory), [
      materialColorAttr(attrs, tag, 0xffffff),
    ])
  }
  if (tag === 'meshNormalMaterial') {
    assertAttachAttr(attrs, tag, 'material')
    return t.callExpression(t.identifier('createMeshNormalMaterial'), [])
  }
  if (tag === 'color') return colorElementExpression(node, 'background')
  if (tag === 'ambientLight') return t.numericLiteral(0)
  if (tag === 'directionalLight' || tag === 'pointLight') return t.numericLiteral(0)
  if (tag === 'group') throw new Error('Three <group> must be nested under <Canvas>, <scene>, or <threeScene>.')
  throw new Error(`Unsupported Three JSX tag <${tag}>`)
}

function buildThreeSceneExpression(
  demoCode: BabelTypes.Expression,
  backgroundColor: BabelTypes.Expression,
  camera: ThreeCameraParts,
  lights: ThreeLightParts,
  meshes: ThreeMeshParts[],
  context: ThreeJsxTransformContext,
): BabelTypes.Expression {
  if (useUpstreamThree) return buildThreeRealSceneBufferCall(demoCode, backgroundColor, camera, lights, meshes, context)
  if (meshes.length === 1) {
    return buildThreeScenePayloadCall(demoCode, backgroundColor, camera, lights, meshes[0])
  }
  return t.arrayExpression(meshes.map((mesh) => buildThreeScenePayloadCall(demoCode, backgroundColor, camera, lights, mesh)))
}

function buildThreeRealSceneBufferCall(
  demoCode: BabelTypes.Expression,
  backgroundColor: BabelTypes.Expression,
  camera: ThreeCameraParts,
  lights: ThreeLightParts,
  meshes: ThreeMeshParts[],
  context: ThreeJsxTransformContext,
): BabelTypes.Expression {
  if (meshes.length < 1 || meshes.length > 8) {
    throw new Error(`Upstream Three JSX currently supports one to eight statically lowered meshes, got ${meshes.length}.`)
  }
  const helperName = `createThreeRealSceneBuffer${meshes.length}`
  context.usedRealJsxHelpers.add(helperName)
  return t.callExpression(t.identifier(helperName), [
    demoCode,
    backgroundColor,
    camera.fov,
    camera.aspect,
    camera.near,
    camera.far,
    camera.positionX,
    camera.positionY,
    camera.positionZ,
    camera.lookAtX,
    camera.lookAtY,
    camera.lookAtZ,
    ...meshes.map((mesh) => buildThreeRealMeshCall(mesh, context)),
  ])
}

function buildThreeRealMeshCall(mesh: ThreeMeshParts, context: ThreeJsxTransformContext): BabelTypes.Expression {
  const helperName = threeRealMeshHelperName(mesh)
  context.usedRealJsxHelpers.add(helperName)
  return t.callExpression(t.identifier(helperName), [
    mesh.material.materialColor,
    mesh.positionX,
    mesh.positionY,
    mesh.positionZ,
    mesh.rotationX,
    mesh.rotationY,
    mesh.rotationZ,
    mesh.scaleX,
    mesh.scaleY,
    mesh.scaleZ,
    mesh.geometry.parameter0,
    mesh.geometry.parameter1,
    mesh.geometry.parameter2,
    mesh.geometry.parameter3,
    mesh.geometry.parameter4,
    mesh.geometry.parameter5,
  ])
}

function threeRealMeshHelperName(mesh: ThreeMeshParts): string {
  const geometryCode = numericLiteralValue(mesh.geometry.geometryCode, 'Three JSX geometry code')
  const geometryName = threeRealGeometryName(geometryCode, mesh.geometry)
  const materialName = mesh.material.materialName
  const helperName = `createThreeReal${geometryName}${materialName}Mesh`
  if (!supportedThreeRealMeshHelpers.has(helperName)) {
    throw new Error(`Unsupported upstream Three JSX geometry/material pair: ${geometryName}/${materialName}.`)
  }
  return helperName
}

function threeRealGeometryName(geometryCode: number, geometry: ThreeGeometryParts): string {
  if (geometryCode === 1) return 'Box'
  if (geometryCode === 2) return 'TorusKnot'
  if (geometryCode === 3) return 'Sphere'
  if (geometryCode === 4) return 'Plane'
  if (geometryCode === 5) return 'Torus'
  if (geometryCode === 6) {
    return numericLiteralValue(geometry.parameter0, 'Three JSX cylinder/cone discriminator') === 0
      ? 'Cone'
      : 'Cylinder'
  }
  if (geometryCode === 7) return 'Ring'
  if (geometryCode === 8) return 'Circle'
  throw new Error(`Unsupported upstream Three JSX geometry code ${geometryCode}.`)
}

function numericLiteralValue(expression: BabelTypes.Expression, label: string): number {
  if (t.isNumericLiteral(expression)) return expression.value
  throw new Error(`${label} must be statically known for upstream native Three lowering.`)
}

const supportedThreeRealMeshHelpers = new Set(
  ['Box', 'Circle', 'Cone', 'Cylinder', 'Plane', 'Ring', 'Sphere', 'Torus', 'TorusKnot']
    .flatMap((geometryName) => ['Basic', 'Lambert', 'Normal', 'Phong', 'Standard']
      .map((materialName) => `createThreeReal${geometryName}${materialName}Mesh`)),
)

function buildThreeScenePayloadCall(
  demoCode: BabelTypes.Expression,
  backgroundColor: BabelTypes.Expression,
  camera: ThreeCameraParts,
  lights: ThreeLightParts,
  mesh: ThreeMeshParts,
): BabelTypes.Expression {
  return t.callExpression(t.identifier('createThreeScenePayload'), [
    demoCode,
    mesh.geometry.geometryCode,
    mesh.material.materialCode,
    mesh.material.materialColor,
    backgroundColor,
    camera.fov,
    camera.aspect,
    camera.near,
    camera.far,
    camera.positionZ,
    mesh.rotationX,
    mesh.rotationY,
    mesh.rotationZ,
    mesh.positionX,
    mesh.positionY,
    mesh.positionZ,
    mesh.geometry.parameter0,
    mesh.geometry.parameter1,
    mesh.geometry.parameter2,
    mesh.geometry.parameter3,
    mesh.geometry.parameter4,
    mesh.geometry.parameter5,
    mesh.scaleX,
    mesh.scaleY,
    mesh.scaleZ,
    lights.ambientLightColor,
    lights.ambientLightIntensity,
    lights.directionalLightColor,
    lights.directionalLightIntensity,
    lights.directionalLightX,
    lights.directionalLightY,
    lights.directionalLightZ,
    camera.positionX,
    camera.positionY,
    camera.lookAtX,
    camera.lookAtY,
    camera.lookAtZ,
  ])
}

function meshPartsFromElement(node: BabelTypes.JSXElement, context: ThreeJsxTransformContext): ThreeMeshParts {
  const attrs = threeJsxAttrs(node)
  return {
    positionX: axisNumberAttrOrArrayAttrElement(attrs, 'position', 'x', 0, 0),
    positionY: axisNumberAttrOrArrayAttrElement(attrs, 'position', 'y', 1, 0),
    positionZ: axisNumberAttrOrArrayAttrElement(attrs, 'position', 'z', 2, 0),
    rotationX: axisNumberAttrOrArrayAttrElement(attrs, 'rotation', 'x', 0, 0),
    rotationY: axisNumberAttrOrArrayAttrElement(attrs, 'rotation', 'y', 1, 0),
    rotationZ: axisNumberAttrOrArrayAttrElement(attrs, 'rotation', 'z', 2, 0),
    scaleX: axisScaleAttrElement(attrs, 'x', 0, 1),
    scaleY: axisScaleAttrElement(attrs, 'y', 1, 1),
    scaleZ: axisScaleAttrElement(attrs, 'z', 2, 1),
    geometry: geometryPartsFromElement(requiredThreeChildElement(node, 'mesh', ['boxGeometry', 'circleGeometry', 'planeGeometry', 'coneGeometry', 'cylinderGeometry', 'ringGeometry', 'torusGeometry', 'torusKnotGeometry', 'sphereGeometry'], 'geometry', context)),
    material: materialPartsFromElement(requiredThreeChildElement(node, 'mesh', threeMaterialTags, 'material', context)),
  }
}

function meshPartsFromSceneChildren(
  node: BabelTypes.JSXElement,
  parentTag: string,
  context: ThreeJsxTransformContext,
): ThreeMeshParts[] {
  return meshPartsFromContainer(
    node,
    parentTag,
    t.numericLiteral(0),
    t.numericLiteral(0),
    t.numericLiteral(0),
    t.numericLiteral(0),
    t.numericLiteral(0),
    t.numericLiteral(0),
    t.numericLiteral(1),
    t.numericLiteral(1),
    t.numericLiteral(1),
    context,
  )
}

function meshPartsFromContainer(
  node: BabelTypes.JSXElement,
  parentTag: string,
  basePositionX: BabelTypes.Expression,
  basePositionY: BabelTypes.Expression,
  basePositionZ: BabelTypes.Expression,
  baseRotationX: BabelTypes.Expression,
  baseRotationY: BabelTypes.Expression,
  baseRotationZ: BabelTypes.Expression,
  baseScaleX: BabelTypes.Expression,
  baseScaleY: BabelTypes.Expression,
  baseScaleZ: BabelTypes.Expression,
  context: ThreeJsxTransformContext,
): ThreeMeshParts[] {
  const found: ThreeMeshParts[] = []
  for (const childElement of resolveThreeChildElementsFromChildren(node.children, parentTag, context)) {
    const childTag = jsxTagName(childElement.openingElement.name)
    if (childTag === 'mesh') {
      const mesh = meshPartsFromElement(childElement, context)
      const position = transformedChildPositionExpressions(
        basePositionX,
        basePositionY,
        basePositionZ,
        baseRotationX,
        baseRotationY,
        baseRotationZ,
        baseScaleX,
        baseScaleY,
        baseScaleZ,
        mesh.positionX,
        mesh.positionY,
        mesh.positionZ,
      )
      found.push({
        ...mesh,
        positionX: position.x,
        positionY: position.y,
        positionZ: position.z,
        rotationX: addNumericExpressions(baseRotationX, mesh.rotationX),
        rotationY: addNumericExpressions(baseRotationY, mesh.rotationY),
        rotationZ: addNumericExpressions(baseRotationZ, mesh.rotationZ),
        scaleX: multiplyNumericExpressions(baseScaleX, mesh.scaleX),
        scaleY: multiplyNumericExpressions(baseScaleY, mesh.scaleY),
        scaleZ: multiplyNumericExpressions(baseScaleZ, mesh.scaleZ),
      })
    } else if (childTag === 'group') {
      const groupAttrs = threeJsxAttrs(childElement)
      const groupScaleX = axisScaleAttrElement(groupAttrs, 'x', 0, 1)
      const groupScaleY = axisScaleAttrElement(groupAttrs, 'y', 1, 1)
      const groupScaleZ = axisScaleAttrElement(groupAttrs, 'z', 2, 1)
      const groupPosition = transformedChildPositionExpressions(
        basePositionX,
        basePositionY,
        basePositionZ,
        baseRotationX,
        baseRotationY,
        baseRotationZ,
        baseScaleX,
        baseScaleY,
        baseScaleZ,
        axisNumberAttrOrArrayAttrElement(groupAttrs, 'position', 'x', 0, 0),
        axisNumberAttrOrArrayAttrElement(groupAttrs, 'position', 'y', 1, 0),
        axisNumberAttrOrArrayAttrElement(groupAttrs, 'position', 'z', 2, 0),
      )
      const groupMeshes = meshPartsFromContainer(
        childElement,
        'group',
        groupPosition.x,
        groupPosition.y,
        groupPosition.z,
        addNumericExpressions(baseRotationX, axisNumberAttrOrArrayAttrElement(groupAttrs, 'rotation', 'x', 0, 0)),
        addNumericExpressions(baseRotationY, axisNumberAttrOrArrayAttrElement(groupAttrs, 'rotation', 'y', 1, 0)),
        addNumericExpressions(baseRotationZ, axisNumberAttrOrArrayAttrElement(groupAttrs, 'rotation', 'z', 2, 0)),
        multiplyNumericExpressions(baseScaleX, groupScaleX),
        multiplyNumericExpressions(baseScaleY, groupScaleY),
        multiplyNumericExpressions(baseScaleZ, groupScaleZ),
        context,
      )
      for (const mesh of groupMeshes) found.push(mesh)
    }
  }
  if (found.length === 0) throw new Error(`Missing mesh child inside <${parentTag}>`)
  return found
}

function cameraPartsFromElement(node: BabelTypes.JSXElement): ThreeCameraParts {
  const attrs = threeJsxAttrs(node)
  return {
    fov: numberAttrOrArrayAttrElement(attrs, 'fov', 'args', 0, 70),
    aspect: numberAttrOrArrayAttrElement(attrs, 'aspect', 'args', 1, 1),
    near: numberAttrOrArrayAttrElement(attrs, 'near', 'args', 2, 0.01),
    far: numberAttrOrArrayAttrElement(attrs, 'far', 'args', 3, 100),
    positionX: axisNumberAttrOrArrayAttrElement(attrs, 'position', 'x', 0, 0),
    positionY: axisNumberAttrOrArrayAttrElement(attrs, 'position', 'y', 1, 0),
    positionZ: axisNumberAttrOrArrayAttrElement(attrs, 'position', 'z', 2, 0),
    lookAtX: arrayAttrElement(attrs, 'lookAt', 0, 0),
    lookAtY: arrayAttrElement(attrs, 'lookAt', 1, 0),
    lookAtZ: arrayAttrElement(attrs, 'lookAt', 2, 0),
  }
}

function canvasCameraParts(
  node: BabelTypes.JSXElement,
  attrs: Map<string, BabelTypes.Expression>,
  context: ThreeJsxTransformContext,
): ThreeCameraParts {
  const cameraAttr = attrs.get('camera')
  const cameraChild = optionalThreeChildElement(node, 'Canvas', ['perspectiveCamera'], context)
  if (cameraAttr && cameraChild) throw new Error('Three <Canvas> supports either a camera prop or a perspectiveCamera child, not both.')
  if (cameraChild) return cameraPartsFromElement(cameraChild)
  if (!cameraAttr) {
    return {
      fov: t.numericLiteral(70),
      aspect: t.numericLiteral(1),
      near: t.numericLiteral(0.01),
      far: t.numericLiteral(100),
      positionX: t.numericLiteral(0),
      positionY: t.numericLiteral(0),
      positionZ: t.numericLiteral(4),
      lookAtX: t.numericLiteral(0),
      lookAtY: t.numericLiteral(0),
      lookAtZ: t.numericLiteral(0),
    }
  }
  if (!t.isObjectExpression(cameraAttr)) throw new Error('Three <Canvas> camera must be a static object literal for native typed lowering.')
  return {
    fov: objectNumberAttr(cameraAttr, 'fov', 70),
    aspect: objectNumberAttr(cameraAttr, 'aspect', 1),
    near: objectNumberAttr(cameraAttr, 'near', 0.01),
    far: objectNumberAttr(cameraAttr, 'far', 100),
    positionX: objectAxisNumberOrArrayAttrElement(cameraAttr, 'position', 'x', 0, 0),
    positionY: objectAxisNumberOrArrayAttrElement(cameraAttr, 'position', 'y', 1, 0),
    positionZ: objectAxisNumberOrArrayAttrElement(cameraAttr, 'position', 'z', 2, 4),
    lookAtX: objectAxisNumberOrArrayAttrElement(cameraAttr, 'lookAt', 'x', 0, 0),
    lookAtY: objectAxisNumberOrArrayAttrElement(cameraAttr, 'lookAt', 'y', 1, 0),
    lookAtZ: objectAxisNumberOrArrayAttrElement(cameraAttr, 'lookAt', 'z', 2, 0),
  }
}

function geometryPartsFromElement(node: BabelTypes.JSXElement): ThreeGeometryParts {
  const tag = jsxTagName(node.openingElement.name)
  const attrs = threeJsxAttrs(node)
  if (tag === 'boxGeometry') {
    assertAttachAttr(attrs, tag, 'geometry')
    return {
      geometryCode: t.numericLiteral(1),
      parameter0: arrayAttrElement(attrs, 'args', 0, 1),
      parameter1: arrayAttrElement(attrs, 'args', 1, 1),
      parameter2: arrayAttrElement(attrs, 'args', 2, 1),
      parameter3: arrayAttrElement(attrs, 'args', 3, 1),
      parameter4: arrayAttrElement(attrs, 'args', 4, 1),
      parameter5: arrayAttrElement(attrs, 'args', 5, 1),
    }
  }
  if (tag === 'circleGeometry') {
    assertAttachAttr(attrs, tag, 'geometry')
    return {
      geometryCode: t.numericLiteral(8),
      parameter0: arrayAttrElement(attrs, 'args', 0, 1),
      parameter1: arrayAttrElement(attrs, 'args', 1, 32),
      parameter2: arrayAttrElement(attrs, 'args', 2, 0),
      parameter3: arrayAttrElement(attrs, 'args', 3, 6.283185307179586),
      parameter4: t.numericLiteral(0),
      parameter5: t.numericLiteral(0),
    }
  }
  if (tag === 'planeGeometry') {
    assertAttachAttr(attrs, tag, 'geometry')
    return {
      geometryCode: t.numericLiteral(4),
      parameter0: arrayAttrElement(attrs, 'args', 0, 1),
      parameter1: arrayAttrElement(attrs, 'args', 1, 1),
      parameter2: arrayAttrElement(attrs, 'args', 2, 1),
      parameter3: arrayAttrElement(attrs, 'args', 3, 1),
      parameter4: t.numericLiteral(0),
      parameter5: t.numericLiteral(0),
    }
  }
  if (tag === 'coneGeometry') {
    assertAttachAttr(attrs, tag, 'geometry')
    return {
      geometryCode: t.numericLiteral(6),
      parameter0: t.numericLiteral(0),
      parameter1: arrayAttrElement(attrs, 'args', 0, 1),
      parameter2: arrayAttrElement(attrs, 'args', 1, 1),
      parameter3: arrayAttrElement(attrs, 'args', 2, 32),
      parameter4: arrayAttrElement(attrs, 'args', 3, 1),
      parameter5: boolArrayAttrElement(attrs, 'args', 4, false),
    }
  }
  if (tag === 'cylinderGeometry') {
    assertAttachAttr(attrs, tag, 'geometry')
    return {
      geometryCode: t.numericLiteral(6),
      parameter0: arrayAttrElement(attrs, 'args', 0, 1),
      parameter1: arrayAttrElement(attrs, 'args', 1, 1),
      parameter2: arrayAttrElement(attrs, 'args', 2, 1),
      parameter3: arrayAttrElement(attrs, 'args', 3, 32),
      parameter4: arrayAttrElement(attrs, 'args', 4, 1),
      parameter5: boolArrayAttrElement(attrs, 'args', 5, false),
    }
  }
  if (tag === 'ringGeometry') {
    assertAttachAttr(attrs, tag, 'geometry')
    return {
      geometryCode: t.numericLiteral(7),
      parameter0: arrayAttrElement(attrs, 'args', 0, 0.5),
      parameter1: arrayAttrElement(attrs, 'args', 1, 1),
      parameter2: arrayAttrElement(attrs, 'args', 2, 32),
      parameter3: arrayAttrElement(attrs, 'args', 3, 1),
      parameter4: arrayAttrElement(attrs, 'args', 4, 0),
      parameter5: arrayAttrElement(attrs, 'args', 5, 6.283185307179586),
    }
  }
  if (tag === 'torusGeometry') {
    assertAttachAttr(attrs, tag, 'geometry')
    return {
      geometryCode: t.numericLiteral(5),
      parameter0: arrayAttrElement(attrs, 'args', 0, 1),
      parameter1: arrayAttrElement(attrs, 'args', 1, 0.4),
      parameter2: arrayAttrElement(attrs, 'args', 2, 12),
      parameter3: arrayAttrElement(attrs, 'args', 3, 48),
      parameter4: arrayAttrElement(attrs, 'args', 4, 6.283185307179586),
      parameter5: arrayAttrElement(attrs, 'args', 5, 0),
    }
  }
  if (tag === 'torusKnotGeometry') {
    assertAttachAttr(attrs, tag, 'geometry')
    return {
      geometryCode: t.numericLiteral(2),
      parameter0: arrayAttrElement(attrs, 'args', 0, 1),
      parameter1: arrayAttrElement(attrs, 'args', 1, 0.4),
      parameter2: arrayAttrElement(attrs, 'args', 2, 64),
      parameter3: arrayAttrElement(attrs, 'args', 3, 8),
      parameter4: arrayAttrElement(attrs, 'args', 4, 2),
      parameter5: arrayAttrElement(attrs, 'args', 5, 3),
    }
  }
  if (tag === 'sphereGeometry') {
    assertAttachAttr(attrs, tag, 'geometry')
    return {
      geometryCode: t.numericLiteral(3),
      parameter0: arrayAttrElement(attrs, 'args', 0, 1),
      parameter1: arrayAttrElement(attrs, 'args', 1, 32),
      parameter2: arrayAttrElement(attrs, 'args', 2, 16),
      parameter3: arrayAttrElement(attrs, 'args', 3, 0),
      parameter4: arrayAttrElement(attrs, 'args', 4, 6.283185307179586),
      parameter5: arrayAttrElement(attrs, 'args', 5, 0),
    }
  }
  throw new Error(`Unsupported Three geometry <${tag}>`)
}

function materialPartsFromElement(node: BabelTypes.JSXElement): ThreeMaterialParts {
  const tag = jsxTagName(node.openingElement.name)
  const attrs = threeJsxAttrs(node)
  if (tag === 'meshBasicMaterial' || tag === 'meshLambertMaterial' || tag === 'meshPhongMaterial' || tag === 'meshStandardMaterial') {
    assertAttachAttr(attrs, tag, 'material')
    const materialCode = tag === 'meshBasicMaterial'
      ? 1
      : tag === 'meshLambertMaterial'
        ? 4
        : tag === 'meshPhongMaterial'
          ? 5
          : 3
    const materialName = tag === 'meshBasicMaterial'
      ? 'Basic'
      : tag === 'meshLambertMaterial'
        ? 'Lambert'
        : tag === 'meshPhongMaterial'
          ? 'Phong'
          : 'Standard'
    return {
      materialCode: t.numericLiteral(materialCode),
      materialName,
      materialColor: materialColorAttr(attrs, tag, 0xffffff),
    }
  }
  if (tag === 'meshNormalMaterial') {
    assertAttachAttr(attrs, tag, 'material')
    return {
      materialCode: t.numericLiteral(2),
      materialName: 'Normal',
      materialColor: t.numericLiteral(0xffffff),
    }
  }
  throw new Error(`Unsupported Three material <${tag}>`)
}

function lightPartsFromSceneChildren(
  node: BabelTypes.JSXElement,
  parentTag: string,
  context: ThreeJsxTransformContext,
): ThreeLightParts {
  let hasLight = false
  let ambientLightColor: BabelTypes.Expression = t.numericLiteral(0xffffff)
  let ambientLightIntensity: BabelTypes.Expression | null = null
  let directionalLightColor: BabelTypes.Expression = t.numericLiteral(0xffffff)
  let directionalLightIntensity: BabelTypes.Expression | null = null
  let directionalLightX: BabelTypes.Expression = t.numericLiteral(0)
  let directionalLightY: BabelTypes.Expression = t.numericLiteral(0)
  let directionalLightZ: BabelTypes.Expression = t.numericLiteral(1)

  for (const childElement of resolveThreeChildElementsFromChildren(node.children, parentTag, context)) {
    const childTag = jsxTagName(childElement.openingElement.name)
    if (childTag !== 'ambientLight' && childTag !== 'directionalLight' && childTag !== 'pointLight') continue
    if (hasMeaningfulJsxChildren(childElement)) {
      throw new Error(`Three <${childTag}> does not support children in native typed lowering.`)
    }
    const attrs = threeJsxAttrs(childElement)
    hasLight = true
    if (childTag === 'ambientLight') {
      if (ambientLightIntensity) throw new Error(`Multiple <ambientLight> children are not supported inside <${parentTag}> yet.`)
      ambientLightColor = colorAttr(attrs, 'color', 0xffffff)
      ambientLightIntensity = numberAttr(attrs, 'intensity', 1)
    } else {
      if (directionalLightIntensity) {
        throw new Error(`Multiple directional or point lights are not supported inside <${parentTag}> yet.`)
      }
      directionalLightColor = colorAttr(attrs, 'color', 0xffffff)
      directionalLightIntensity = numberAttr(attrs, 'intensity', 1)
      directionalLightX = axisNumberAttrOrArrayAttrElement(attrs, 'position', 'x', 0, 0)
      directionalLightY = axisNumberAttrOrArrayAttrElement(attrs, 'position', 'y', 1, 0)
      directionalLightZ = axisNumberAttrOrArrayAttrElement(attrs, 'position', 'z', 2, 1)
    }
  }

  return {
    ambientLightColor,
    ambientLightIntensity: ambientLightIntensity ?? t.numericLiteral(hasLight ? 0 : 1),
    directionalLightColor,
    directionalLightIntensity: directionalLightIntensity ?? t.numericLiteral(0),
    directionalLightX,
    directionalLightY,
    directionalLightZ,
  }
}

function threeJsxAttrs(node: BabelTypes.JSXElement): Map<string, BabelTypes.Expression> {
  const tag = jsxTagName(node.openingElement.name)
  const attrs = new Map<string, BabelTypes.Expression>()
  for (const attr of node.openingElement.attributes) {
    if (!t.isJSXAttribute(attr) || !t.isJSXIdentifier(attr.name)) {
      throw new Error(`Unsupported Three JSX attribute on <${tag}>`)
    }
    const name = attr.name.name
    if (attrs.has(name)) throw new Error(`Duplicate Three JSX attribute "${name}" on <${tag}>`)
    attrs.set(name, jsxAttributeValue(attr.value))
  }
  return attrs
}

function requiredThreeChild(
  node: BabelTypes.JSXElement,
  parentTag: string,
  allowedTags: readonly string[],
  role: string,
  context: ThreeJsxTransformContext,
): BabelTypes.Expression {
  let found: BabelTypes.Expression | null = null
  for (const childElement of resolveThreeChildElementsFromChildren(node.children, parentTag, context)) {
    const childTag = jsxTagName(childElement.openingElement.name)
    if (allowedTags.includes(childTag)) {
      if (found) throw new Error(`Multiple ${role} children are not supported inside <${parentTag}>`)
      found = buildThreeJsxExpression(childElement, context)
    }
  }
  if (!found) throw new Error(`Missing ${role} child inside <${parentTag}>`)
  return found
}

function requiredThreeChildElement(
  node: BabelTypes.JSXElement,
  parentTag: string,
  allowedTags: readonly string[],
  role: string,
  context: ThreeJsxTransformContext,
): BabelTypes.JSXElement {
  let found: BabelTypes.JSXElement | null = null
  for (const childElement of resolveThreeChildElementsFromChildren(node.children, parentTag, context)) {
    const childTag = jsxTagName(childElement.openingElement.name)
    if (allowedTags.includes(childTag)) {
      if (found) throw new Error(`Multiple ${role} children are not supported inside <${parentTag}>`)
      found = childElement
    }
  }
  if (!found) throw new Error(`Missing ${role} child inside <${parentTag}>`)
  return found
}

function optionalThreeChildElement(
  node: BabelTypes.JSXElement,
  parentTag: string,
  allowedTags: readonly string[],
  context: ThreeJsxTransformContext,
): BabelTypes.JSXElement | null {
  let found: BabelTypes.JSXElement | null = null
  for (const childElement of resolveThreeChildElementsFromChildren(node.children, parentTag, context)) {
    const childTag = jsxTagName(childElement.openingElement.name)
    if (allowedTags.includes(childTag)) {
      if (found) throw new Error(`Multiple <${childTag}> children are not supported inside <${parentTag}>`)
      found = childElement
    }
  }
  return found
}

function resolveThreeChildElementsFromChildren(
  children: BabelTypes.JSXElement['children'],
  parentTag: string,
  context: ThreeJsxTransformContext,
): BabelTypes.JSXElement[] {
  const found: BabelTypes.JSXElement[] = []
  for (const child of children) {
    if (t.isJSXElement(child) || t.isJSXFragment(child)) {
      for (const element of resolveThreeChildElements(child, parentTag, context)) found.push(element)
    } else if (t.isJSXExpressionContainer(child) && !t.isJSXEmptyExpression(child.expression)) {
      throw new Error(`Expression children are not supported inside Three JSX <${parentTag}> yet`)
    } else if (t.isJSXText(child) && child.value.trim()) {
      throw new Error(`Text children are not supported in Three JSX <${parentTag}>`)
    }
  }
  return found
}

function resolveThreeChildElements(
  node: ThreeStaticNode,
  parentTag: string,
  context: ThreeJsxTransformContext,
): BabelTypes.JSXElement[] {
  if (t.isJSXFragment(node)) return resolveThreeChildElementsFromChildren(node.children, parentTag, context)
  const tag = jsxTagName(node.openingElement.name)
  if (threeJsxTags.has(tag)) return [node]
  const component = context.components.get(tag)
  if (!component) throw new Error(`Unsupported Three JSX child <${tag}> inside <${parentTag}>`)
  return resolveThreeChildElements(expandThreeStaticComponent(node, component, parentTag, context), parentTag, context)
}

function expandThreeStaticComponent(
  node: BabelTypes.JSXElement,
  component: ThreeStaticComponent,
  parentTag: string,
  context: ThreeJsxTransformContext,
): ThreeStaticNode {
  if (context.componentStack.includes(component.name)) {
    throw new Error(`Recursive Three JSX component <${component.name}> cannot be statically lowered.`)
  }
  context.usedComponents.add(component.name)
  context.componentStack.push(component.name)
  try {
    const bindings = threeComponentBindings(node, component)
    const expanded = substituteThreeComponentBindings(component.returnNode, bindings)
    if (t.isJSXFragment(expanded)) return expanded
    const expandedTag = jsxTagName(expanded.openingElement.name)
    if (threeJsxTags.has(expandedTag)) return expanded
    const nested = context.components.get(expandedTag)
    if (!nested) throw new Error(`Three JSX component <${component.name}> returned unsupported <${expandedTag}> inside <${parentTag}>`)
    return expandThreeStaticComponent(expanded, nested, parentTag, context)
  } finally {
    context.componentStack.pop()
  }
}

function hasMeaningfulJsxChildren(node: BabelTypes.JSXElement): boolean {
  for (const child of node.children) {
    if (t.isJSXText(child) && !child.value.trim()) continue
    if (t.isJSXExpressionContainer(child) && t.isJSXEmptyExpression(child.expression)) continue
    return true
  }
  return false
}

function threeComponentBindings(
  node: BabelTypes.JSXElement,
  component: ThreeStaticComponent,
): ThreeComponentBindings {
  const attrs = threeJsxAttrs(node)
  const bindings: ThreeComponentBindings = {
    props: new Map(),
    children: new Map(),
  }
  if (!component.param) {
    if (hasMeaningfulJsxChildren(node)) {
      throw new Error(`Three JSX component <${component.name}> does not accept children in native typed lowering.`)
    }
    return bindings
  }
  if (!t.isObjectPattern(component.param)) {
    throw new Error(`Three JSX component <${component.name}> must destructure static props for native typed lowering.`)
  }
  for (const property of component.param.properties) {
    if (t.isRestElement(property)) {
      throw new Error(`Three JSX component <${component.name}> does not support rest props in native typed lowering.`)
    }
    const propName = objectPropertyName(property.key)
    const attr = attrs.get(propName)
    if (propName === 'children') {
      bindThreeComponentChildren(component.name, property.value, node.children, bindings)
    } else {
      bindThreeComponentPattern(component.name, property.value, attr, bindings.props)
    }
  }
  if (hasMeaningfulJsxChildren(node) && bindings.children.size === 0) {
    throw new Error(`Three JSX component <${component.name}> does not accept children in native typed lowering.`)
  }
  return bindings
}

function bindThreeComponentChildren(
  componentName: string,
  pattern: BabelTypes.PatternLike,
  children: BabelTypes.JSXElement['children'],
  bindings: ThreeComponentBindings,
): void {
  if (t.isIdentifier(pattern)) {
    bindings.children.set(pattern.name, cloneThreeComponentChildren(componentName, children))
    return
  }
  if (t.isAssignmentPattern(pattern) && t.isIdentifier(pattern.left)) {
    bindings.children.set(pattern.left.name, cloneThreeComponentChildren(componentName, children))
    return
  }
  throw new Error(`Three JSX component <${componentName}> only supports identifier children props in native typed lowering.`)
}

function cloneThreeComponentChildren(
  componentName: string,
  children: BabelTypes.JSXElement['children'],
): BabelTypes.JSXElement['children'] {
  const cloned: BabelTypes.JSXElement['children'] = []
  for (const child of children) {
    if (t.isJSXText(child) && !child.value.trim()) continue
    if (t.isJSXExpressionContainer(child) && t.isJSXEmptyExpression(child.expression)) continue
    if (t.isJSXElement(child) || t.isJSXFragment(child)) {
      cloned.push(t.cloneNode(child, true))
      continue
    }
    throw new Error(`Three JSX component <${componentName}> only supports static JSX element children in native typed lowering.`)
  }
  return cloned
}

function bindThreeComponentPattern(
  componentName: string,
  pattern: BabelTypes.PatternLike,
  attr: BabelTypes.Expression | undefined,
  bindings: Map<string, BabelTypes.Expression>,
): void {
  if (t.isIdentifier(pattern)) {
    if (attr) bindings.set(pattern.name, t.cloneNode(attr, true))
    return
  }
  if (t.isAssignmentPattern(pattern)) {
    if (!t.isIdentifier(pattern.left)) {
      throw new Error(`Three JSX component <${componentName}> only supports identifier defaults in native typed lowering.`)
    }
    bindings.set(pattern.left.name, t.cloneNode(attr ?? pattern.right, true))
    return
  }
  throw new Error(`Three JSX component <${componentName}> only supports flat destructured props in native typed lowering.`)
}

function substituteThreeComponentBindings(
  node: ThreeStaticNode,
  bindings: ThreeComponentBindings,
): ThreeStaticNode {
  const cloned = t.cloneNode(node, true)
  substituteThreeComponentChildren(cloned, bindings.children)
  const expression = t.expressionStatement(cloned)
  const wrapper = t.file(t.program([expression]))
  traverse(wrapper, {
    Identifier(path: NodePath<BabelTypes.Identifier>) {
      const replacement = bindings.props.get(path.node.name)
      if (!replacement) return
      path.replaceWith(t.cloneNode(replacement, true))
    },
  })
  if (!t.isJSXElement(expression.expression) && !t.isJSXFragment(expression.expression)) {
    throw new Error('Three JSX component expansion did not produce a JSX element or fragment.')
  }
  return expression.expression
}

function substituteThreeComponentChildren(
  node: ThreeStaticNode,
  childBindings: Map<string, BabelTypes.JSXElement['children']>,
): void {
  const children: BabelTypes.JSXElement['children'] = []
  for (const child of node.children) {
    if (t.isJSXElement(child) || t.isJSXFragment(child)) {
      substituteThreeComponentChildren(child, childBindings)
      children.push(child)
      continue
    }
    if (
      t.isJSXExpressionContainer(child) &&
      t.isIdentifier(child.expression) &&
      childBindings.has(child.expression.name)
    ) {
      children.push(...childBindings.get(child.expression.name)!.map((bound) => t.cloneNode(bound, true)))
      continue
    }
    children.push(child)
  }
  node.children = children
}

function jsxTagName(name: BabelTypes.JSXIdentifier | BabelTypes.JSXMemberExpression | BabelTypes.JSXNamespacedName): string {
  if (t.isJSXIdentifier(name)) return name.name
  throw new Error('Only simple Three JSX tag names are supported.')
}

function jsxAttributeValue(value: BabelTypes.JSXAttribute['value']): BabelTypes.Expression {
  if (!value) return t.booleanLiteral(true)
  if (t.isStringLiteral(value)) return value
  if (t.isJSXExpressionContainer(value) && !t.isJSXEmptyExpression(value.expression)) return value.expression
  throw new Error('Unsupported Three JSX attribute value.')
}

function numberAttr(attrs: Map<string, BabelTypes.Expression>, name: string, fallback: number): BabelTypes.Expression {
  return attrs.get(name) ?? t.numericLiteral(fallback)
}

function numberAttrOrArrayAttrElement(
  attrs: Map<string, BabelTypes.Expression>,
  name: string,
  arrayName: string,
  index: number,
  fallback: number,
): BabelTypes.Expression {
  return attrs.get(name) ?? arrayAttrElement(attrs, arrayName, index, fallback)
}

function axisNumberAttrOrArrayAttrElement(
  attrs: Map<string, BabelTypes.Expression>,
  name: string,
  axis: string,
  index: number,
  fallback: number,
): BabelTypes.Expression {
  return axisScalarAttr(attrs, name, axis) ?? arrayAttrElement(attrs, name, index, fallback)
}

function axisScaleAttrElement(
  attrs: Map<string, BabelTypes.Expression>,
  axis: string,
  index: number,
  fallback: number,
): BabelTypes.Expression {
  return axisScalarAttr(attrs, 'scale', axis) ?? scaleAttrElement(attrs, 'scale', index, fallback)
}

function axisScalarAttr(
  attrs: Map<string, BabelTypes.Expression>,
  name: string,
  axis: string,
): BabelTypes.Expression | null {
  const dashedName = `${name}-${axis}`
  const camelName = `${name}${axis.toUpperCase()}`
  const dashed = attrs.get(dashedName)
  const camel = attrs.get(camelName)
  if (dashed && camel) {
    throw new Error(`Three JSX supports either "${dashedName}" or "${camelName}", not both.`)
  }
  return dashed ?? camel ?? null
}

function colorAttr(attrs: Map<string, BabelTypes.Expression>, name: string, fallback: number): BabelTypes.Expression {
  const attr = attrs.get(name)
  if (!attr) return t.numericLiteral(fallback)
  return colorExpression(attr, `Three JSX "${name}"`)
}

function materialColorAttr(
  attrs: Map<string, BabelTypes.Expression>,
  tag: string,
  fallback: number,
): BabelTypes.Expression {
  const colorProp = attrs.get('color')
  const argsColor = materialArgsObjectAttr(attrs, tag, 'color')
  if (colorProp && argsColor) {
    throw new Error(`Three <${tag}> supports either a color prop or args[0].color, not both.`)
  }
  const attr = colorProp ?? argsColor
  if (!attr) return t.numericLiteral(fallback)
  return colorExpression(attr, `Three <${tag}> color`)
}

function materialArgsObjectAttr(
  attrs: Map<string, BabelTypes.Expression>,
  tag: string,
  name: string,
): BabelTypes.Expression | null {
  const args = attrs.get('args')
  if (!args) return null
  if (!t.isArrayExpression(args)) {
    throw new Error(`Three <${tag}> args must be a static constructor-argument array for native typed lowering.`)
  }
  const extra = args.elements.slice(1).find((element) => element !== null)
  if (extra) {
    throw new Error(`Three <${tag}> args only supports one static parameters object for native typed lowering.`)
  }
  const first = args.elements[0]
  if (!first) return null
  if (!t.isExpression(first)) {
    throw new Error(`Three <${tag}> args does not support spread elements for native typed lowering.`)
  }
  if (!t.isObjectExpression(first)) {
    throw new Error(`Three <${tag}> args[0] must be a static parameters object for native typed lowering.`)
  }
  return objectAttr(first, name, `Three <${tag}> args[0]`)
}

function sceneBackgroundColor(
  node: BabelTypes.JSXElement,
  parentTag: string,
  attrs: Map<string, BabelTypes.Expression>,
  context: ThreeJsxTransformContext,
): BabelTypes.Expression {
  const backgroundAttr = attrs.get('background')
  const backgroundChild = optionalThreeChildElement(node, parentTag, ['color'], context)
  if (backgroundAttr && backgroundChild) {
    throw new Error(`Three <${parentTag}> supports either a background prop or <color attach="background"> child, not both.`)
  }
  if (backgroundChild) return colorElementExpression(backgroundChild, 'background')
  if (!backgroundAttr) return t.numericLiteral(0x000000)
  return colorExpression(backgroundAttr, `Three <${parentTag}> background`)
}

function colorElementExpression(node: BabelTypes.JSXElement, expectedAttach: string): BabelTypes.Expression {
  const attrs = threeJsxAttrs(node)
  assertAttachAttr(attrs, 'color', expectedAttach)
  const args = attrs.get('args')
  if (!args) return t.numericLiteral(0xffffff)
  if (!t.isArrayExpression(args)) {
    throw new Error('Three <color> args must be a static array for native typed lowering.')
  }
  const value = args.elements[0]
  if (!value) return t.numericLiteral(0xffffff)
  if (!t.isExpression(value)) {
    throw new Error('Three <color> args does not support spread elements for native typed lowering.')
  }
  return colorExpression(value, 'Three <color> args[0]')
}

function colorExpression(attr: BabelTypes.Expression, label: string): BabelTypes.Expression {
  if (t.isStringLiteral(attr)) return t.numericLiteral(parseStaticColor(attr.value, label))
  return attr
}

function assertAttachAttr(attrs: Map<string, BabelTypes.Expression>, tag: string, expected: string): void {
  const attach = attrs.get('attach')
  if (!attach) return
  if (!t.isStringLiteral(attach) || attach.value !== expected) {
    throw new Error(`Three <${tag}> only supports attach="${expected}" in native typed lowering.`)
  }
}

function parseStaticColor(value: string, label: string = 'static Three color'): number {
  const normalized = value.trim().toLowerCase()
  if (/^#[0-9a-f]{6}$/.test(normalized)) return Number.parseInt(normalized.slice(1), 16)
  if (/^#[0-9a-f]{3}$/.test(normalized)) {
    const r = normalized[1]
    const g = normalized[2]
    const b = normalized[3]
    return Number.parseInt(`${r}${r}${g}${g}${b}${b}`, 16)
  }
  if (/^0x[0-9a-f]{6}$/.test(normalized)) return Number.parseInt(normalized.slice(2), 16)
  const named = threeNamedColors.get(normalized)
  if (named !== undefined) return named
  throw new Error(`Unsupported ${label} "${value}". Use a number, #rgb, #rrggbb, or a known CSS color name.`)
}

function arrayAttrElement(
  attrs: Map<string, BabelTypes.Expression>,
  name: string,
  index: number,
  fallback: number,
): BabelTypes.Expression {
  const attr = attrs.get(name)
  if (!attr) return t.numericLiteral(fallback)
  if (!t.isArrayExpression(attr)) {
    throw new Error(`Three JSX "${name}" must be a static number array for native typed lowering.`)
  }
  const value = attr.elements[index]
  if (!value) return t.numericLiteral(fallback)
  if (!t.isExpression(value)) {
    throw new Error(`Three JSX "${name}" does not support spread elements for native typed lowering.`)
  }
  return value
}

function boolArrayAttrElement(
  attrs: Map<string, BabelTypes.Expression>,
  name: string,
  index: number,
  fallback: boolean,
): BabelTypes.Expression {
  const attr = attrs.get(name)
  if (!attr) return t.numericLiteral(fallback ? 1 : 0)
  if (!t.isArrayExpression(attr)) {
    throw new Error(`Three JSX "${name}" must be a static constructor-argument array for native typed lowering.`)
  }
  const value = attr.elements[index]
  if (!value) return t.numericLiteral(fallback ? 1 : 0)
  if (!t.isExpression(value)) {
    throw new Error(`Three JSX "${name}" does not support spread elements for native typed lowering.`)
  }
  if (t.isBooleanLiteral(value)) return t.numericLiteral(value.value ? 1 : 0)
  if (t.isNumericLiteral(value)) return value
  throw new Error(`Three JSX "${name}" boolean slot ${index} must be a static boolean or number for native typed lowering.`)
}

function scaleAttrElement(
  attrs: Map<string, BabelTypes.Expression>,
  name: string,
  index: number,
  fallback: number,
): BabelTypes.Expression {
  const attr = attrs.get(name)
  if (!attr) return t.numericLiteral(fallback)
  if (!t.isArrayExpression(attr)) return attr
  const value = attr.elements[index]
  if (!value) return t.numericLiteral(fallback)
  if (!t.isExpression(value)) {
    throw new Error(`Three JSX "${name}" does not support spread elements for native typed lowering.`)
  }
  return value
}

function objectNumberAttr(object: BabelTypes.ObjectExpression, name: string, fallback: number): BabelTypes.Expression {
  return objectAttr(object, name, 'Three <Canvas> camera') ?? t.numericLiteral(fallback)
}

function objectArrayAttrElement(
  object: BabelTypes.ObjectExpression,
  name: string,
  index: number,
  fallback: number,
): BabelTypes.Expression {
  const attr = objectAttr(object, name, 'Three <Canvas> camera')
  if (!attr) return t.numericLiteral(fallback)
  if (!t.isArrayExpression(attr)) {
    throw new Error(`Three <Canvas> camera.${name} must be a static number array for native typed lowering.`)
  }
  const value = attr.elements[index]
  if (!value) return t.numericLiteral(fallback)
  if (!t.isExpression(value)) {
    throw new Error(`Three <Canvas> camera.${name} does not support spread elements for native typed lowering.`)
  }
  return value
}

function objectAxisNumberOrArrayAttrElement(
  object: BabelTypes.ObjectExpression,
  name: string,
  axis: string,
  index: number,
  fallback: number,
): BabelTypes.Expression {
  const scalar = objectAxisScalarAttr(object, name, axis, 'Three <Canvas> camera')
  if (scalar) return scalar
  return objectArrayAttrElement(object, name, index, fallback)
}

function objectAxisScalarAttr(
  object: BabelTypes.ObjectExpression,
  name: string,
  axis: string,
  label: string,
): BabelTypes.Expression | null {
  const dashedName = `${name}-${axis}`
  const camelName = `${name}${axis.toUpperCase()}`
  const dashed = objectAttr(object, dashedName, label)
  const camel = objectAttr(object, camelName, label)
  if (dashed && camel) {
    throw new Error(`${label} supports either ${dashedName} or ${camelName}, not both.`)
  }
  return dashed ?? camel
}

function objectAttr(object: BabelTypes.ObjectExpression, name: string, label: string): BabelTypes.Expression | null {
  let found: BabelTypes.Expression | null = null
  for (const property of object.properties) {
    if (!t.isObjectProperty(property)) throw new Error(`${label} does not support spreads or methods.`)
    const keyName = objectPropertyName(property.key, label)
    if (keyName !== name) continue
    if (found) throw new Error(`Duplicate ${label}.${name} property.`)
    if (!t.isExpression(property.value)) throw new Error(`${label}.${name} must be an expression.`)
    found = property.value
  }
  return found
}

function objectPropertyName(key: BabelTypes.ObjectProperty['key'], label: string): string {
  if (t.isIdentifier(key)) return key.name
  if (t.isStringLiteral(key) || t.isNumericLiteral(key)) return String(key.value)
  throw new Error(`${label} only supports simple property names.`)
}

interface ThreeVectorExpressionParts {
  x: BabelTypes.Expression
  y: BabelTypes.Expression
  z: BabelTypes.Expression
}

function transformedChildPositionExpressions(
  basePositionX: BabelTypes.Expression,
  basePositionY: BabelTypes.Expression,
  basePositionZ: BabelTypes.Expression,
  baseRotationX: BabelTypes.Expression,
  baseRotationY: BabelTypes.Expression,
  baseRotationZ: BabelTypes.Expression,
  baseScaleX: BabelTypes.Expression,
  baseScaleY: BabelTypes.Expression,
  baseScaleZ: BabelTypes.Expression,
  localPositionX: BabelTypes.Expression,
  localPositionY: BabelTypes.Expression,
  localPositionZ: BabelTypes.Expression,
): ThreeVectorExpressionParts {
  const scaled = {
    x: multiplyNumericExpressions(baseScaleX, localPositionX),
    y: multiplyNumericExpressions(baseScaleY, localPositionY),
    z: multiplyNumericExpressions(baseScaleZ, localPositionZ),
  }
  const rotated = rotateVectorExpressions(scaled, baseRotationX, baseRotationY, baseRotationZ)
  return {
    x: addNumericExpressions(basePositionX, rotated.x),
    y: addNumericExpressions(basePositionY, rotated.y),
    z: addNumericExpressions(basePositionZ, rotated.z),
  }
}

function rotateVectorExpressions(
  vector: ThreeVectorExpressionParts,
  rotationX: BabelTypes.Expression,
  rotationY: BabelTypes.Expression,
  rotationZ: BabelTypes.Expression,
): ThreeVectorExpressionParts {
  return rotateZVectorExpressions(
    rotateYVectorExpressions(
      rotateXVectorExpressions(vector, rotationX),
      rotationY,
    ),
    rotationZ,
  )
}

function rotateXVectorExpressions(
  vector: ThreeVectorExpressionParts,
  angle: BabelTypes.Expression,
): ThreeVectorExpressionParts {
  if (isZeroNumericExpression(angle)) return vector
  const cos = mathNumericExpression('cos', angle)
  const sin = mathNumericExpression('sin', angle)
  return {
    x: vector.x,
    y: subtractNumericExpressions(
      multiplyNumericExpressions(vector.y, cos),
      multiplyNumericExpressions(vector.z, sin),
    ),
    z: addNumericExpressions(
      multiplyNumericExpressions(cloneExpression(vector.y), mathNumericExpression('sin', angle)),
      multiplyNumericExpressions(cloneExpression(vector.z), mathNumericExpression('cos', angle)),
    ),
  }
}

function rotateYVectorExpressions(
  vector: ThreeVectorExpressionParts,
  angle: BabelTypes.Expression,
): ThreeVectorExpressionParts {
  if (isZeroNumericExpression(angle)) return vector
  return {
    x: addNumericExpressions(
      multiplyNumericExpressions(vector.x, mathNumericExpression('cos', angle)),
      multiplyNumericExpressions(vector.z, mathNumericExpression('sin', angle)),
    ),
    y: vector.y,
    z: subtractNumericExpressions(
      multiplyNumericExpressions(cloneExpression(vector.z), mathNumericExpression('cos', angle)),
      multiplyNumericExpressions(cloneExpression(vector.x), mathNumericExpression('sin', angle)),
    ),
  }
}

function rotateZVectorExpressions(
  vector: ThreeVectorExpressionParts,
  angle: BabelTypes.Expression,
): ThreeVectorExpressionParts {
  if (isZeroNumericExpression(angle)) return vector
  return {
    x: subtractNumericExpressions(
      multiplyNumericExpressions(vector.x, mathNumericExpression('cos', angle)),
      multiplyNumericExpressions(vector.y, mathNumericExpression('sin', angle)),
    ),
    y: addNumericExpressions(
      multiplyNumericExpressions(cloneExpression(vector.x), mathNumericExpression('sin', angle)),
      multiplyNumericExpressions(cloneExpression(vector.y), mathNumericExpression('cos', angle)),
    ),
    z: vector.z,
  }
}

function addNumericExpressions(left: BabelTypes.Expression, right: BabelTypes.Expression): BabelTypes.Expression {
  if (t.isNumericLiteral(left) && left.value === 0) return right
  if (t.isNumericLiteral(right) && right.value === 0) return left
  return t.binaryExpression('+', left, right)
}

function subtractNumericExpressions(left: BabelTypes.Expression, right: BabelTypes.Expression): BabelTypes.Expression {
  if (t.isNumericLiteral(right) && right.value === 0) return left
  if (t.isNumericLiteral(left) && left.value === 0) {
    if (t.isNumericLiteral(right)) return t.numericLiteral(-right.value)
    return t.unaryExpression('-', right)
  }
  return t.binaryExpression('-', left, right)
}

function multiplyNumericExpressions(left: BabelTypes.Expression, right: BabelTypes.Expression): BabelTypes.Expression {
  if (t.isNumericLiteral(left) && left.value === 1) return right
  if (t.isNumericLiteral(right) && right.value === 1) return left
  if (t.isNumericLiteral(left) && left.value === 0) return t.numericLiteral(0)
  if (t.isNumericLiteral(right) && right.value === 0) return t.numericLiteral(0)
  return t.binaryExpression('*', left, right)
}

function mathNumericExpression(name: 'cos' | 'sin', argument: BabelTypes.Expression): BabelTypes.Expression {
  return t.callExpression(
    t.memberExpression(t.identifier('Math'), t.identifier(name)),
    [cloneExpression(argument)],
  )
}

function cloneExpression(expression: BabelTypes.Expression): BabelTypes.Expression {
  return t.cloneNode(expression, true)
}

function isZeroNumericExpression(expression: BabelTypes.Expression): boolean {
  return t.isNumericLiteral(expression) && expression.value === 0
}

function threeInternalGeometryShimPlugin() {
  return {
    name: 'three-internal-geometry-shim',
    enforce: 'pre',
    transform(code: string, id: string) {
      if (!useUpstreamThree) return null
      let transformed = code
      if (id.includes('/node_modules/three/src/geometries/SphereGeometry.js')) {
        transformed = transformed
          .replace(/\n\t\tconst grid = \[\];\n/, '\n')
          .replace(/\n\t\t\tconst verticesRow = \[\];\n/, '\n')
          .replace(/\n\t\t\t\tverticesRow\.push\( index \+\+ \);\n/, '\n\t\t\t\tindex ++;\n')
          .replace(/\n\t\t\tgrid\.push\( verticesRow \);\n/, '\n')
          .replace(
            /\n\t\t\t\tconst a = grid\[ iy \]\[ ix \+ 1 \];\n\t\t\t\tconst b = grid\[ iy \]\[ ix \];\n\t\t\t\tconst c = grid\[ iy \+ 1 \]\[ ix \];\n\t\t\t\tconst d = grid\[ iy \+ 1 \]\[ ix \+ 1 \];\n/,
            '\n\t\t\t\tconst row = widthSegments + 1;\n\t\t\t\tconst a = iy * row + ix + 1;\n\t\t\t\tconst b = iy * row + ix;\n\t\t\t\tconst c = ( iy + 1 ) * row + ix;\n\t\t\t\tconst d = ( iy + 1 ) * row + ix + 1;\n',
          )
      } else if (id.includes('/node_modules/three/src/geometries/CylinderGeometry.js')) {
        transformed = transformed
          .replace(/\n\t\t\topenEnded: openEnded,\n/, '\n\t\t\topenEnded: openEnded === true,\n')
          .replace(/\n\t\tconst indexArray = \[\];\n/, '\n')
          .replace(/\n\t\t\t\tconst indexRow = \[\];\n/, '\n')
          .replace(/\n\t\t\t\t\tindexRow\.push\( index \+\+ \);\n/, '\n\t\t\t\t\tindex ++;\n')
          .replace(/\n\t\t\t\tindexArray\.push\( indexRow \);\n/, '\n')
          .replace(
            /\n\t\t\t\t\tconst a = indexArray\[ y \]\[ x \];\n\t\t\t\t\tconst b = indexArray\[ y \+ 1 \]\[ x \];\n\t\t\t\t\tconst c = indexArray\[ y \+ 1 \]\[ x \+ 1 \];\n\t\t\t\t\tconst d = indexArray\[ y \]\[ x \+ 1 \];\n/,
            '\n\t\t\t\t\tconst row = radialSegments + 1;\n\t\t\t\t\tconst a = y * row + x;\n\t\t\t\t\tconst b = ( y + 1 ) * row + x;\n\t\t\t\t\tconst c = ( y + 1 ) * row + x + 1;\n\t\t\t\t\tconst d = y * row + x + 1;\n',
          )
      } else if (id.includes('/node_modules/three/src/geometries/ConeGeometry.js')) {
        transformed = transformed.replace(
          /\n\t\t\topenEnded: openEnded,\n/,
          '\n\t\t\topenEnded: openEnded === true,\n',
        )
      }
      if (transformed === code) return null
      return { code: transformed, map: null }
    },
    resolveId(source: string, importer?: string) {
      if (!useUpstreamThree || !importer) return null
      if (!importer.includes('/node_modules/three/src/geometries/')) return null
      if (
        source === '../core/BufferGeometry.js' ||
        source === '../core/BufferAttribute.js' ||
        source === '../math/Vector3.js' ||
        source === '../math/Vector2.js'
      ) {
        return threeGeometryRuntime
      }
      return null
    },
  }
}

export default {
  plugins: [threeInternalGeometryShimPlugin(), threeSceneJsxPlugin(), appleNativeJsxPlugin(), geaEmptyIrPlugin()],
  define: {
    __GEA_THREE_USE_UPSTREAM__: JSON.stringify(useUpstreamThree),
    __GEA_THREE_REFERENCE_DEMO__: JSON.stringify(threeReferenceDemo),
  },
  resolve: {
    alias: useUpstreamThree
      ? [
          { find: /^#three-scene-source$/, replacement: threeSceneSource },
          { find: /^@react-three\/fiber$/, replacement: reactThreeFiberShim },
          { find: /^three$/, replacement: resolve(__dirname, 'src/threeRealSubset.ts') },
        ]
      : [
          { find: /^#three-scene-source$/, replacement: threeSceneSource },
          { find: /^@react-three\/fiber$/, replacement: reactThreeFiberShim },
          { find: /^three$/, replacement: resolve(__dirname, 'src/threeNativeShim.ts') },
        ],
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'index.tsx'),
      formats: ['iife'],
      name: 'gea_three_angle_metal',
      fileName: () => 'index.js',
    },
    emptyOutDir: true,
    minify: false,
  },
}
