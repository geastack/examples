export default {
  name: 'three-angle-metal-host',
  configure() {
    return {
      hostShims: {
          embeddedHostFunctions: {
            angleHostAttach: 'gea_three_angle_host_attach',
            angleHostCreateAnimatedMeshScene: 'gea_three_angle_host_create_animated_mesh_scene',
            angleHostCreateLittlestTokyoScene: 'gea_three_angle_host_create_littlest_tokyo_scene',
            angleHostCreateMeshBuffer: 'gea_three_angle_host_create_mesh_buffer',
            angleHostCreateMeshScene: 'gea_three_angle_host_create_mesh_scene',
            angleHostCreateTexture: 'gea_three_angle_host_create_texture',
            angleHostCreateTexturedMeshBuffer: 'gea_three_angle_host_create_textured_mesh_buffer',
            angleHostRenderMeshBuffer: 'gea_three_angle_host_render_mesh_buffer',
            angleHostRenderMeshBufferPart: 'gea_three_angle_host_render_mesh_buffer_part',
            angleHostRenderMeshScene: 'gea_three_angle_host_render_mesh_scene',
            angleHostSmokeLog: 'gea_three_angle_smoke_log',
            angleHostSyncSize: 'gea_three_angle_host_sync_size',
          },
          embeddedHostFunctionReturnTypes: {
            angleHostAttach: 'bool',
            angleHostCreateAnimatedMeshScene: 'double',
            angleHostCreateLittlestTokyoScene: 'double',
            angleHostCreateMeshBuffer: 'double',
            angleHostCreateMeshScene: 'double',
            angleHostCreateTexture: 'double',
            angleHostCreateTexturedMeshBuffer: 'double',
            angleHostRenderMeshBuffer: 'void',
            angleHostRenderMeshBufferPart: 'void',
            angleHostRenderMeshScene: 'void',
            angleHostSmokeLog: 'void',
            angleHostSyncSize: 'double',
          },
          embeddedHostNoThrowFunctions: [
            'angleHostAttach',
            'angleHostCreateAnimatedMeshScene',
            'angleHostCreateLittlestTokyoScene',
            'angleHostCreateMeshBuffer',
            'angleHostCreateMeshScene',
            'angleHostCreateTexture',
            'angleHostCreateTexturedMeshBuffer',
            'angleHostRenderMeshBuffer',
            'angleHostRenderMeshBufferPart',
            'angleHostRenderMeshScene',
            'angleHostSmokeLog',
            'angleHostSyncSize',
          ],
          hostExternDeclarations: {
            gea_three_angle_host_attach: [
              'extern "C" bool gea_three_angle_host_attach(gea::apple::AppKit::NSView view, double width, double height, double devicePixelRatio);',
            ],
            gea_three_angle_host_create_animated_mesh_scene: [
              'extern "C" double gea_three_angle_host_create_animated_mesh_scene(double demoCode, const std::vector<gea_f32> &meshBufferHandles, const std::vector<gea_f32> &meshBufferNodeIndices, const std::vector<gea_f32> &nodeParentIndices, const std::vector<gea_f32> &nodeTrsModes, const std::vector<gea_f32> &nodeBaseMatrices, const std::vector<gea_f32> &nodeBaseTranslations, const std::vector<gea_f32> &nodeBaseRotations, const std::vector<gea_f32> &nodeBaseScales, const std::vector<gea_f32> &modelMatrix, const std::vector<gea_f32> &animationChannelNodeIndices, const std::vector<gea_f32> &animationChannelPathCodes, const std::vector<gea_f32> &animationChannelInputOffsets, const std::vector<gea_f32> &animationChannelInputCounts, const std::vector<gea_f32> &animationChannelOutputOffsets, const std::vector<gea_f32> &animationTimes, const std::vector<gea_f32> &animationValues, double animationDuration);',
            ],
            gea_three_angle_host_create_littlest_tokyo_scene: [
              'extern "C" double gea_three_angle_host_create_littlest_tokyo_scene(double demoCode, std::string scenePath);',
            ],
            gea_three_angle_host_create_mesh_buffer: [
              'extern "C" double gea_three_angle_host_create_mesh_buffer(double demoCode, double materialCode, double materialColor, const std::vector<gea_f32> &positions, const std::vector<gea_f32> &normals, const std::vector<gea_f32> &indices, const std::vector<gea_f32> &colors);',
            ],
            gea_three_angle_host_create_mesh_scene: [
              'extern "C" double gea_three_angle_host_create_mesh_scene(double demoCode, const std::vector<gea_f32> &meshBufferHandles);',
            ],
            gea_three_angle_host_create_texture: [
              'extern "C" double gea_three_angle_host_create_texture(std::string imagePath);',
            ],
            gea_three_angle_host_create_textured_mesh_buffer: [
              'extern "C" double gea_three_angle_host_create_textured_mesh_buffer(double demoCode, double materialCode, double materialColor, const std::vector<gea_f32> &positions, const std::vector<gea_f32> &normals, const std::vector<gea_f32> &indices, const std::vector<gea_f32> &colors, const std::vector<gea_f32> &uv0s, const std::vector<gea_f32> &uv1s, double textureHandle, double metallicRoughnessTextureHandle, double occlusionTextureHandle, double emissiveTextureHandle, double baseColorTexCoord, double metallicRoughnessTexCoord, double occlusionTexCoord, double emissiveTexCoord, double metallicFactor, double roughnessFactor, double occlusionStrength, double emissiveR, double emissiveG, double emissiveB, double sideMode, double alphaMode, double alphaCutoff, double alphaFactor);',
            ],
            gea_three_angle_host_render_mesh_buffer: [
              'extern "C" void gea_three_angle_host_render_mesh_buffer(double handle, double demoCode, double materialCode, double materialColor, double backgroundColor, double cameraFov, double cameraAspect, double cameraNear, double cameraFar, double cameraX, double cameraY, double cameraZ, double cameraLookAtX, double cameraLookAtY, double cameraLookAtZ, double rotationX, double rotationY, double rotationZ, double timestampMs);',
            ],
            gea_three_angle_host_render_mesh_buffer_part: [
              'extern "C" void gea_three_angle_host_render_mesh_buffer_part(double handle, double demoCode, double materialCode, double materialColor, double backgroundColor, double cameraFov, double cameraAspect, double cameraNear, double cameraFar, double cameraX, double cameraY, double cameraZ, double cameraLookAtX, double cameraLookAtY, double cameraLookAtZ, double rotationX, double rotationY, double rotationZ, double timestampMs, bool clearFrame, bool swapFrame);',
            ],
            gea_three_angle_host_render_mesh_scene: [
              'extern "C" void gea_three_angle_host_render_mesh_scene(double sceneHandle, double demoCode, double materialCode, double materialColor, double backgroundColor, double cameraFov, double cameraAspect, double cameraNear, double cameraFar, double cameraX, double cameraY, double cameraZ, double cameraLookAtX, double cameraLookAtY, double cameraLookAtZ, double rotationX, double rotationY, double rotationZ, double timestampMs);',
            ],
            gea_three_angle_smoke_log: [
              'extern "C" void gea_three_angle_smoke_log(std::string message);',
            ],
            gea_three_angle_host_sync_size: [
              'extern "C" double gea_three_angle_host_sync_size(double fallbackAspect);',
            ],
          },
      },
    }
  },
}
