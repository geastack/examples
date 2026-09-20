import type { NSView } from '@geastack/apple/AppKit'

export function createAngleWebGL2Host(
  hostView: NSView,
  width: number,
  height: number,
  devicePixelRatio: number,
): boolean {
  return angleHostAttach(
    hostView,
    width,
    height,
    devicePixelRatio,
  )
}

declare function angleHostAttach(view: NSView, width: number, height: number, devicePixelRatio: number): boolean

declare function angleHostSyncSize(fallbackAspect: number): number

declare function angleHostCreateTexture(imagePath: string): number

declare function angleHostCreateMeshBuffer(
  demoCode: number,
  materialCode: number,
  materialColor: number,
  positions: f32[],
  normals: f32[],
  indices: f32[],
  colors: f32[],
): number

declare function angleHostCreateTexturedMeshBuffer(
  demoCode: number,
  materialCode: number,
  materialColor: number,
  positions: f32[],
  normals: f32[],
  indices: f32[],
  colors: f32[],
  uv0s: f32[],
  uv1s: f32[],
  textureHandle: number,
  metallicRoughnessTextureHandle: number,
  occlusionTextureHandle: number,
  emissiveTextureHandle: number,
  baseColorTexCoord: number,
  metallicRoughnessTexCoord: number,
  occlusionTexCoord: number,
  emissiveTexCoord: number,
  metallicFactor: number,
  roughnessFactor: number,
  occlusionStrength: number,
  emissiveR: number,
  emissiveG: number,
  emissiveB: number,
  sideMode: number,
  alphaMode: number,
  alphaCutoff: number,
  alphaFactor: number,
): number

declare function angleHostCreateMeshScene(
  demoCode: number,
  meshBufferHandles: f32[],
): number

declare function angleHostCreateAnimatedMeshScene(
  demoCode: number,
  meshBufferHandles: f32[],
  meshBufferNodeIndices: f32[],
  nodeParentIndices: f32[],
  nodeTrsModes: f32[],
  nodeBaseMatrices: f32[],
  nodeBaseTranslations: f32[],
  nodeBaseRotations: f32[],
  nodeBaseScales: f32[],
  modelMatrix: f32[],
  animationChannelNodeIndices: f32[],
  animationChannelPathCodes: f32[],
  animationChannelInputOffsets: f32[],
  animationChannelInputCounts: f32[],
  animationChannelOutputOffsets: f32[],
  animationTimes: f32[],
  animationValues: f32[],
  animationDuration: number,
): number

declare function angleHostCreateLittlestTokyoScene(
  demoCode: number,
  scenePath: string,
): number

declare function angleHostRenderMeshBuffer(
  handle: number,
  demoCode: number,
  materialCode: number,
  materialColor: number,
  backgroundColor: number,
  cameraFov: number,
  cameraAspect: number,
  cameraNear: number,
  cameraFar: number,
  cameraX: number,
  cameraY: number,
  cameraZ: number,
  cameraLookAtX: number,
  cameraLookAtY: number,
  cameraLookAtZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  timestampMs: number,
): void

declare function angleHostRenderMeshBufferPart(
  handle: number,
  demoCode: number,
  materialCode: number,
  materialColor: number,
  backgroundColor: number,
  cameraFov: number,
  cameraAspect: number,
  cameraNear: number,
  cameraFar: number,
  cameraX: number,
  cameraY: number,
  cameraZ: number,
  cameraLookAtX: number,
  cameraLookAtY: number,
  cameraLookAtZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  timestampMs: number,
  clearFrame: boolean,
  swapFrame: boolean,
): void

declare function angleHostRenderMeshScene(
  sceneHandle: number,
  demoCode: number,
  materialCode: number,
  materialColor: number,
  backgroundColor: number,
  cameraFov: number,
  cameraAspect: number,
  cameraNear: number,
  cameraFar: number,
  cameraX: number,
  cameraY: number,
  cameraZ: number,
  cameraLookAtX: number,
  cameraLookAtY: number,
  cameraLookAtZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  timestampMs: number,
): void

declare function angleHostSmokeLog(message: string): void

export function logAngleHostSmoke(message: string): void {
  angleHostSmokeLog(message)
}

export function createAngleWebGL2Texture(
  hostReady: boolean,
  imagePath: string,
): number {
  if (!hostReady) return 0
  return angleHostCreateTexture(imagePath)
}

export function createAngleWebGL2MeshBuffer(
  hostReady: boolean,
  demoCode: number,
  materialCode: number,
  materialColor: number,
  positions: f32[],
  normals: f32[],
  indices: f32[],
  colors: f32[],
): number {
  if (!hostReady) return 0
  return angleHostCreateMeshBuffer(
    demoCode,
    materialCode,
    materialColor,
    positions,
    normals,
    indices,
    colors,
  )
}

export function createAngleWebGL2TexturedMeshBuffer(
  hostReady: boolean,
  demoCode: number,
  materialCode: number,
  materialColor: number,
  positions: f32[],
  normals: f32[],
  indices: f32[],
  colors: f32[],
  uv0s: f32[],
  uv1s: f32[],
  textureHandle: number,
  metallicRoughnessTextureHandle: number,
  occlusionTextureHandle: number,
  emissiveTextureHandle: number,
  baseColorTexCoord: number,
  metallicRoughnessTexCoord: number,
  occlusionTexCoord: number,
  emissiveTexCoord: number,
  metallicFactor: number,
  roughnessFactor: number,
  occlusionStrength: number,
  emissiveR: number,
  emissiveG: number,
  emissiveB: number,
  sideMode: number,
  alphaMode: number,
  alphaCutoff: number,
  alphaFactor: number,
): number {
  if (!hostReady) return 0
  return angleHostCreateTexturedMeshBuffer(
    demoCode,
    materialCode,
    materialColor,
    positions,
    normals,
    indices,
    colors,
    uv0s,
    uv1s,
    textureHandle,
    metallicRoughnessTextureHandle,
    occlusionTextureHandle,
    emissiveTextureHandle,
    baseColorTexCoord,
    metallicRoughnessTexCoord,
    occlusionTexCoord,
    emissiveTexCoord,
    metallicFactor,
    roughnessFactor,
    occlusionStrength,
    emissiveR,
    emissiveG,
    emissiveB,
    sideMode,
    alphaMode,
    alphaCutoff,
    alphaFactor,
  )
}

export function createAngleWebGL2MeshScene(
  hostReady: boolean,
  demoCode: number,
  meshBufferHandles: f32[],
): number {
  if (!hostReady) return 0
  return angleHostCreateMeshScene(demoCode, meshBufferHandles)
}

export function createAngleWebGL2AnimatedMeshScene(
  hostReady: boolean,
  demoCode: number,
  meshBufferHandles: f32[],
  meshBufferNodeIndices: f32[],
  nodeParentIndices: f32[],
  nodeTrsModes: f32[],
  nodeBaseMatrices: f32[],
  nodeBaseTranslations: f32[],
  nodeBaseRotations: f32[],
  nodeBaseScales: f32[],
  modelMatrix: f32[],
  animationChannelNodeIndices: f32[],
  animationChannelPathCodes: f32[],
  animationChannelInputOffsets: f32[],
  animationChannelInputCounts: f32[],
  animationChannelOutputOffsets: f32[],
  animationTimes: f32[],
  animationValues: f32[],
  animationDuration: number,
): number {
  if (!hostReady) return 0
  return angleHostCreateAnimatedMeshScene(
    demoCode,
    meshBufferHandles,
    meshBufferNodeIndices,
    nodeParentIndices,
    nodeTrsModes,
    nodeBaseMatrices,
    nodeBaseTranslations,
    nodeBaseRotations,
    nodeBaseScales,
    modelMatrix,
    animationChannelNodeIndices,
    animationChannelPathCodes,
    animationChannelInputOffsets,
    animationChannelInputCounts,
    animationChannelOutputOffsets,
    animationTimes,
    animationValues,
    animationDuration,
  )
}

export function createAngleWebGL2LittlestTokyoScene(
  hostReady: boolean,
  demoCode: number,
  scenePath: string,
): number {
  if (!hostReady) return 0
  return angleHostCreateLittlestTokyoScene(demoCode, scenePath)
}

export function renderAngleWebGL2MeshBufferHandleFrame(
  hostReady: boolean,
  handle: number,
  demoCode: number,
  materialCode: number,
  materialColor: number,
  backgroundColor: number,
  cameraFov: number,
  cameraAspect: number,
  cameraNear: number,
  cameraFar: number,
  cameraX: number,
  cameraY: number,
  cameraZ: number,
  cameraLookAtX: number,
  cameraLookAtY: number,
  cameraLookAtZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  timestampMs: number,
): void {
  if (!hostReady || handle <= 0) return
  angleHostRenderMeshBuffer(
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
    rotationX,
    rotationY,
    rotationZ,
    timestampMs,
  )
}

export function renderAngleWebGL2MeshSceneFrame(
  hostReady: boolean,
  sceneHandle: number,
  demoCode: number,
  materialCode: number,
  materialColor: number,
  backgroundColor: number,
  cameraFov: number,
  cameraAspect: number,
  cameraNear: number,
  cameraFar: number,
  cameraX: number,
  cameraY: number,
  cameraZ: number,
  cameraLookAtX: number,
  cameraLookAtY: number,
  cameraLookAtZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  timestampMs: number,
): void {
  if (!hostReady || sceneHandle <= 0) return
  angleHostRenderMeshScene(
    sceneHandle,
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
    rotationX,
    rotationY,
    rotationZ,
    timestampMs,
  )
}

export function renderAngleWebGL2MeshBufferHandleFramePart(
  hostReady: boolean,
  handle: number,
  demoCode: number,
  materialCode: number,
  materialColor: number,
  backgroundColor: number,
  cameraFov: number,
  cameraAspect: number,
  cameraNear: number,
  cameraFar: number,
  cameraX: number,
  cameraY: number,
  cameraZ: number,
  cameraLookAtX: number,
  cameraLookAtY: number,
  cameraLookAtZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  timestampMs: number,
  clearFrame: boolean,
  swapFrame: boolean,
): void {
  if (!hostReady || handle <= 0) return
  angleHostRenderMeshBufferPart(
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
    rotationX,
    rotationY,
    rotationZ,
    timestampMs,
    clearFrame,
    swapFrame,
  )
}

export type GeaWebGLRenderer = boolean

export function createGeaWebGLRenderer(
  hostView: NSView,
  width: number,
  height: number,
  devicePixelRatio: number,
): GeaWebGLRenderer {
  return createAngleWebGL2Host(hostView, width, height, devicePixelRatio)
}

export function syncGeaWebGLRendererSize(
  renderer: GeaWebGLRenderer,
  fallbackAspect: number,
): number {
  if (!renderer) return fallbackAspect
  return angleHostSyncSize(fallbackAspect)
}

export function isGeaWebGLRendererReady(renderer: GeaWebGLRenderer): boolean {
  return renderer
}

export function createGeaWebGLRendererTexture(
  renderer: GeaWebGLRenderer,
  imagePath: string,
): number {
  return createAngleWebGL2Texture(renderer, imagePath)
}

export function createGeaWebGLRendererMeshBuffer(
  renderer: GeaWebGLRenderer,
  demoCode: number,
  materialCode: number,
  materialColor: number,
  positions: f32[],
  normals: f32[],
  indices: f32[],
  colors: f32[],
): number {
  return createAngleWebGL2MeshBuffer(
    renderer,
    demoCode,
    materialCode,
    materialColor,
    positions,
    normals,
    indices,
    colors,
  )
}

export function createGeaWebGLRendererTexturedMeshBuffer(
  renderer: GeaWebGLRenderer,
  demoCode: number,
  materialCode: number,
  materialColor: number,
  positions: f32[],
  normals: f32[],
  indices: f32[],
  colors: f32[],
  uv0s: f32[],
  uv1s: f32[],
  textureHandle: number,
  metallicRoughnessTextureHandle: number,
  occlusionTextureHandle: number,
  emissiveTextureHandle: number,
  baseColorTexCoord: number,
  metallicRoughnessTexCoord: number,
  occlusionTexCoord: number,
  emissiveTexCoord: number,
  metallicFactor: number,
  roughnessFactor: number,
  occlusionStrength: number,
  emissiveR: number,
  emissiveG: number,
  emissiveB: number,
  sideMode: number,
  alphaMode: number,
  alphaCutoff: number,
  alphaFactor: number,
): number {
  return createAngleWebGL2TexturedMeshBuffer(
    renderer,
    demoCode,
    materialCode,
    materialColor,
    positions,
    normals,
    indices,
    colors,
    uv0s,
    uv1s,
    textureHandle,
    metallicRoughnessTextureHandle,
    occlusionTextureHandle,
    emissiveTextureHandle,
    baseColorTexCoord,
    metallicRoughnessTexCoord,
    occlusionTexCoord,
    emissiveTexCoord,
    metallicFactor,
    roughnessFactor,
    occlusionStrength,
    emissiveR,
    emissiveG,
    emissiveB,
    sideMode,
    alphaMode,
    alphaCutoff,
    alphaFactor,
  )
}

export function createGeaWebGLRendererMeshScene(
  renderer: GeaWebGLRenderer,
  demoCode: number,
  meshBufferHandles: f32[],
): number {
  return createAngleWebGL2MeshScene(renderer, demoCode, meshBufferHandles)
}

export function createGeaWebGLRendererAnimatedMeshScene(
  renderer: GeaWebGLRenderer,
  demoCode: number,
  meshBufferHandles: f32[],
  meshBufferNodeIndices: f32[],
  nodeParentIndices: f32[],
  nodeTrsModes: f32[],
  nodeBaseMatrices: f32[],
  nodeBaseTranslations: f32[],
  nodeBaseRotations: f32[],
  nodeBaseScales: f32[],
  modelMatrix: f32[],
  animationChannelNodeIndices: f32[],
  animationChannelPathCodes: f32[],
  animationChannelInputOffsets: f32[],
  animationChannelInputCounts: f32[],
  animationChannelOutputOffsets: f32[],
  animationTimes: f32[],
  animationValues: f32[],
  animationDuration: number,
): number {
  return createAngleWebGL2AnimatedMeshScene(
    renderer,
    demoCode,
    meshBufferHandles,
    meshBufferNodeIndices,
    nodeParentIndices,
    nodeTrsModes,
    nodeBaseMatrices,
    nodeBaseTranslations,
    nodeBaseRotations,
    nodeBaseScales,
    modelMatrix,
    animationChannelNodeIndices,
    animationChannelPathCodes,
    animationChannelInputOffsets,
    animationChannelInputCounts,
    animationChannelOutputOffsets,
    animationTimes,
    animationValues,
    animationDuration,
  )
}

export function createGeaWebGLRendererLittlestTokyoScene(
  renderer: GeaWebGLRenderer,
  demoCode: number,
  scenePath: string,
): number {
  return createAngleWebGL2LittlestTokyoScene(renderer, demoCode, scenePath)
}

export function renderGeaWebGLRendererMeshBufferHandleFrame(
  renderer: GeaWebGLRenderer,
  handle: number,
  demoCode: number,
  materialCode: number,
  materialColor: number,
  backgroundColor: number,
  cameraFov: number,
  cameraAspect: number,
  cameraNear: number,
  cameraFar: number,
  cameraX: number,
  cameraY: number,
  cameraZ: number,
  cameraLookAtX: number,
  cameraLookAtY: number,
  cameraLookAtZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  timestampMs: number,
): void {
  renderAngleWebGL2MeshBufferHandleFrame(
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
    rotationX,
    rotationY,
    rotationZ,
    timestampMs,
  )
}

export function renderGeaWebGLRendererMeshSceneFrame(
  renderer: GeaWebGLRenderer,
  sceneHandle: number,
  demoCode: number,
  materialCode: number,
  materialColor: number,
  backgroundColor: number,
  cameraFov: number,
  cameraAspect: number,
  cameraNear: number,
  cameraFar: number,
  cameraX: number,
  cameraY: number,
  cameraZ: number,
  cameraLookAtX: number,
  cameraLookAtY: number,
  cameraLookAtZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  timestampMs: number,
): void {
  renderAngleWebGL2MeshSceneFrame(
    renderer,
    sceneHandle,
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
    rotationX,
    rotationY,
    rotationZ,
    timestampMs,
  )
}

export function renderGeaWebGLRendererMeshBufferHandleFramePart(
  renderer: GeaWebGLRenderer,
  handle: number,
  demoCode: number,
  materialCode: number,
  materialColor: number,
  backgroundColor: number,
  cameraFov: number,
  cameraAspect: number,
  cameraNear: number,
  cameraFar: number,
  cameraX: number,
  cameraY: number,
  cameraZ: number,
  cameraLookAtX: number,
  cameraLookAtY: number,
  cameraLookAtZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  timestampMs: number,
  clearFrame: boolean,
  swapFrame: boolean,
): void {
  renderAngleWebGL2MeshBufferHandleFramePart(
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
    rotationX,
    rotationY,
    rotationZ,
    timestampMs,
    clearFrame,
    swapFrame,
  )
}
