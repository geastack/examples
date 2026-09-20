#include "gea/apple/native_bridge.h"
#include "gea_f32.h"

#import <AppKit/AppKit.h>
#import <ImageIO/ImageIO.h>
#import <QuartzCore/QuartzCore.h>
#import <dispatch/dispatch.h>

#include <dlfcn.h>
#include <algorithm>
#include <cstdarg>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <limits>
#include <memory>
#include <string>
#include <utility>
#include <vector>

#define CGLTF_IMPLEMENTATION
#include "cgltf.h"
#include "draco/attributes/point_attribute.h"
#include "draco/compression/decode.h"
#include "draco/core/decoder_buffer.h"
#include "draco/mesh/mesh.h"

using EGLBoolean = unsigned int;
using EGLenum = unsigned int;
using EGLint = int;
using EGLDisplay = void *;
using EGLConfig = void *;
using EGLContext = void *;
using EGLSurface = void *;
using EGLNativeDisplayType = void *;
using EGLNativeWindowType = void *;

using GLenum = unsigned int;
using GLboolean = unsigned char;
using GLbitfield = unsigned int;
using GLchar = char;
using GLint = int;
using GLsizei = int;
using GLsizeiptr = std::ptrdiff_t;
using GLuint = unsigned int;
using GLfloat = float;

static void handleNativeOrbitMouseDown(NSEvent *event, int button);
static void handleNativeOrbitMouseDragged(NSEvent *event, int button);
static void handleNativeOrbitMouseUp(NSEvent *event, int button);
static void handleNativeOrbitScroll(NSEvent *event);

@interface GeaAngleMetalHostView : NSView
@end

@implementation GeaAngleMetalHostView
- (instancetype)initWithFrame:(NSRect)frame {
  self = [super initWithFrame:frame];
  if (self) {
    self.wantsLayer = YES;
    self.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
  }
  return self;
}

- (CALayer *)makeBackingLayer {
  CAMetalLayer *layer = [CAMetalLayer layer];
  layer.opaque = YES;
  layer.backgroundColor = NSColor.blackColor.CGColor;
  layer.autoresizingMask = kCALayerWidthSizable | kCALayerHeightSizable;
  layer.needsDisplayOnBoundsChange = YES;
  layer.presentsWithTransaction = NO;
  layer.displaySyncEnabled = YES;
  return layer;
}

- (BOOL)acceptsFirstResponder {
  return YES;
}

- (void)viewDidMoveToWindow {
  [super viewDidMoveToWindow];
  if (self.window) [self.window makeFirstResponder:self];
}

- (void)mouseDown:(NSEvent *)event {
  handleNativeOrbitMouseDown(event, 0);
}

- (void)mouseDragged:(NSEvent *)event {
  handleNativeOrbitMouseDragged(event, 0);
}

- (void)mouseUp:(NSEvent *)event {
  handleNativeOrbitMouseUp(event, 0);
}

- (void)rightMouseDown:(NSEvent *)event {
  handleNativeOrbitMouseDown(event, 1);
}

- (void)rightMouseDragged:(NSEvent *)event {
  handleNativeOrbitMouseDragged(event, 1);
}

- (void)rightMouseUp:(NSEvent *)event {
  handleNativeOrbitMouseUp(event, 1);
}

- (void)otherMouseDown:(NSEvent *)event {
  handleNativeOrbitMouseDown(event, 2);
}

- (void)otherMouseDragged:(NSEvent *)event {
  handleNativeOrbitMouseDragged(event, 2);
}

- (void)otherMouseUp:(NSEvent *)event {
  handleNativeOrbitMouseUp(event, 2);
}

- (void)scrollWheel:(NSEvent *)event {
  handleNativeOrbitScroll(event);
}
@end

static constexpr EGLDisplay EGL_NO_DISPLAY = nullptr;
static constexpr EGLSurface EGL_NO_SURFACE = nullptr;
static constexpr EGLContext EGL_NO_CONTEXT = nullptr;
static constexpr EGLNativeDisplayType EGL_DEFAULT_DISPLAY = nullptr;
static constexpr EGLBoolean EGL_FALSE_VALUE = 0;

static constexpr EGLint EGL_NONE = 0x3038;
static constexpr EGLint EGL_WIDTH = 0x3057;
static constexpr EGLint EGL_HEIGHT = 0x3056;
static constexpr EGLint EGL_SURFACE_TYPE = 0x3033;
static constexpr EGLint EGL_WINDOW_BIT = 0x0004;
static constexpr EGLint EGL_PBUFFER_BIT = 0x0001;
static constexpr EGLint EGL_RENDERABLE_TYPE = 0x3040;
static constexpr EGLint EGL_OPENGL_ES2_BIT = 0x0004;
static constexpr EGLint EGL_OPENGL_ES3_BIT = 0x0040;
static constexpr EGLint EGL_RED_SIZE = 0x3024;
static constexpr EGLint EGL_GREEN_SIZE = 0x3023;
static constexpr EGLint EGL_BLUE_SIZE = 0x3022;
static constexpr EGLint EGL_ALPHA_SIZE = 0x3021;
static constexpr EGLint EGL_DEPTH_SIZE = 0x3025;
static constexpr EGLint EGL_CONTEXT_CLIENT_VERSION = 0x3098;
static constexpr EGLenum EGL_OPENGL_ES_API = 0x30A0;
static constexpr EGLenum EGL_PLATFORM_ANGLE_ANGLE = 0x3202;
static constexpr EGLint EGL_PLATFORM_ANGLE_TYPE_ANGLE = 0x3203;
static constexpr EGLint EGL_PLATFORM_ANGLE_TYPE_METAL_ANGLE = 0x3489;

static constexpr GLenum GL_ARRAY_BUFFER = 0x8892;
static constexpr GLenum GL_BLEND = 0x0BE2;
static constexpr GLenum GL_COLOR_ATTACHMENT0 = 0x8CE0;
static constexpr GLenum GL_COLOR_BUFFER_BIT = 0x00004000;
static constexpr GLenum GL_COMPILE_STATUS = 0x8B81;
static constexpr GLenum GL_CULL_FACE = 0x0B44;
static constexpr GLenum GL_BACK = 0x0405;
static constexpr GLenum GL_FRONT = 0x0404;
static constexpr GLenum GL_DEPTH_BUFFER_BIT = 0x00000100;
static constexpr GLenum GL_DEPTH_TEST = 0x0B71;
static constexpr GLenum GL_ELEMENT_ARRAY_BUFFER = 0x8893;
static constexpr GLenum GL_FLOAT = 0x1406;
static constexpr GLenum GL_FRAGMENT_SHADER = 0x8B30;
static constexpr GLenum GL_FRAMEBUFFER = 0x8D40;
static constexpr GLenum GL_FRAMEBUFFER_COMPLETE = 0x8CD5;
static constexpr GLenum GL_HALF_FLOAT = 0x140B;
static constexpr GLenum GL_LINK_STATUS = 0x8B82;
static constexpr GLenum GL_LINEAR = 0x2601;
static constexpr GLenum GL_LINEAR_MIPMAP_LINEAR = 0x2703;
static constexpr GLenum GL_ONE_MINUS_SRC_ALPHA = 0x0303;
static constexpr GLenum GL_CLAMP_TO_EDGE = 0x812F;
static constexpr GLenum GL_REPEAT = 0x2901;
static constexpr GLenum GL_RGBA = 0x1908;
static constexpr GLenum GL_RGBA16F = 0x881A;
static constexpr GLenum GL_SRC_ALPHA = 0x0302;
static constexpr GLenum GL_STATIC_DRAW = 0x88E4;
static constexpr GLenum GL_TEXTURE0 = 0x84C0;
static constexpr GLenum GL_TEXTURE1 = 0x84C1;
static constexpr GLenum GL_TEXTURE2 = 0x84C2;
static constexpr GLenum GL_TEXTURE3 = 0x84C3;
static constexpr GLenum GL_TEXTURE4 = 0x84C4;
static constexpr GLenum GL_TEXTURE_2D = 0x0DE1;
static constexpr GLenum GL_TEXTURE_MAG_FILTER = 0x2800;
static constexpr GLenum GL_TEXTURE_MIN_FILTER = 0x2801;
static constexpr GLenum GL_TEXTURE_WRAP_S = 0x2802;
static constexpr GLenum GL_TEXTURE_WRAP_T = 0x2803;
static constexpr GLenum GL_TRIANGLES = 0x0004;
static constexpr GLenum GL_UNSIGNED_BYTE = 0x1401;
static constexpr GLenum GL_UNSIGNED_SHORT = 0x1403;
static constexpr GLenum GL_VERTEX_SHADER = 0x8B31;
static constexpr GLboolean GL_FALSE_VALUE = 0;
static constexpr GLboolean GL_TRUE_VALUE = 1;

using PFNEGLGETPROCADDRESS = void *(*)(const char *);
using PFNEGLGETPLATFORMDISPLAYEXTPROC = EGLDisplay (*)(EGLenum, void *, const EGLint *);
using PFNEGLGETERRORPROC = EGLint (*)();
using PFNEGLINITIALIZEPROC = EGLBoolean (*)(EGLDisplay, EGLint *, EGLint *);
using PFNEGLBINDAPIPROC = EGLBoolean (*)(EGLenum);
using PFNEGLCHOOSECONFIGPROC = EGLBoolean (*)(EGLDisplay, const EGLint *, EGLConfig *, EGLint, EGLint *);
using PFNEGLCREATEWINDOWSURFACEPROC = EGLSurface (*)(EGLDisplay, EGLConfig, EGLNativeWindowType, const EGLint *);
using PFNEGLCREATEPBUFFERSURFACEPROC = EGLSurface (*)(EGLDisplay, EGLConfig, const EGLint *);
using PFNEGLCREATECONTEXTPROC = EGLContext (*)(EGLDisplay, EGLConfig, EGLContext, const EGLint *);
using PFNEGLDESTROYSURFACEPROC = EGLBoolean (*)(EGLDisplay, EGLSurface);
using PFNEGLMAKECURRENTPROC = EGLBoolean (*)(EGLDisplay, EGLSurface, EGLSurface, EGLContext);
using PFNEGLSWAPBUFFERSPROC = EGLBoolean (*)(EGLDisplay, EGLSurface);

using PFNGLATTACHSHADERPROC = void (*)(GLuint, GLuint);
using PFNGLACTIVETEXTUREPROC = void (*)(GLenum);
using PFNGLBINDBUFFERPROC = void (*)(GLenum, GLuint);
using PFNGLBINDFRAMEBUFFERPROC = void (*)(GLenum, GLuint);
using PFNGLBINDTEXTUREPROC = void (*)(GLenum, GLuint);
using PFNGLBINDATTRIBLOCATIONPROC = void (*)(GLuint, GLuint, const GLchar *);
using PFNGLBLENDFUNCPROC = void (*)(GLenum, GLenum);
using PFNGLBUFFERDATAPROC = void (*)(GLenum, GLsizeiptr, const void *, GLenum);
using PFNGLCLEARPROC = void (*)(GLbitfield);
using PFNGLCLEARCOLORPROC = void (*)(GLfloat, GLfloat, GLfloat, GLfloat);
using PFNGLCOMPILESHADERPROC = void (*)(GLuint);
using PFNGLCHECKFRAMEBUFFERSTATUSPROC = GLenum (*)(GLenum);
using PFNGLCREATEPROGRAMPROC = GLuint (*)();
using PFNGLCREATESHADERPROC = GLuint (*)(GLenum);
using PFNGLCULLFACEPROC = void (*)(GLenum);
using PFNGLDELETEPROGRAMPROC = void (*)(GLuint);
using PFNGLDELETESHADERPROC = void (*)(GLuint);
using PFNGLDEPTHMASKPROC = void (*)(GLboolean);
using PFNGLDISABLEPROC = void (*)(GLenum);
using PFNGLDRAWARRAYSPROC = void (*)(GLenum, GLint, GLsizei);
using PFNGLDRAWELEMENTSPROC = void (*)(GLenum, GLsizei, GLenum, const void *);
using PFNGLENABLEPROC = void (*)(GLenum);
using PFNGLENABLEVERTEXATTRIBARRAYPROC = void (*)(GLuint);
using PFNGLFRAMEBUFFERTEXTURE2DPROC = void (*)(GLenum, GLenum, GLenum, GLuint, GLint);
using PFNGLGENBUFFERSPROC = void (*)(GLsizei, GLuint *);
using PFNGLGENFRAMEBUFFERSPROC = void (*)(GLsizei, GLuint *);
using PFNGLGENTEXTURESPROC = void (*)(GLsizei, GLuint *);
using PFNGLGENERATEMIPMAPPROC = void (*)(GLenum);
using PFNGLGETPROGRAMINFOLOGPROC = void (*)(GLuint, GLsizei, GLsizei *, GLchar *);
using PFNGLGETPROGRAMIVPROC = void (*)(GLuint, GLenum, GLint *);
using PFNGLGETSHADERINFOLOGPROC = void (*)(GLuint, GLsizei, GLsizei *, GLchar *);
using PFNGLGETSHADERIVPROC = void (*)(GLuint, GLenum, GLint *);
using PFNGLGETUNIFORMLOCATIONPROC = GLint (*)(GLuint, const GLchar *);
using PFNGLLINKPROGRAMPROC = void (*)(GLuint);
using PFNGLSHADERSOURCEPROC = void (*)(GLuint, GLsizei, const GLchar *const *, const GLint *);
using PFNGLTEXIMAGE2DPROC = void (*)(GLenum, GLint, GLint, GLsizei, GLsizei, GLint, GLenum, GLenum, const void *);
using PFNGLTEXPARAMETERIPROC = void (*)(GLenum, GLenum, GLint);
using PFNGLUNIFORM1FPROC = void (*)(GLint, GLfloat);
using PFNGLUNIFORM1IPROC = void (*)(GLint, GLint);
using PFNGLUNIFORM3FPROC = void (*)(GLint, GLfloat, GLfloat, GLfloat);
using PFNGLUNIFORMMATRIX4FVPROC = void (*)(GLint, GLsizei, GLboolean, const GLfloat *);
using PFNGLUSEPROGRAMPROC = void (*)(GLuint);
using PFNGLVERTEXATTRIBPOINTERPROC = void (*)(GLuint, GLint, GLenum, GLboolean, GLsizei, const void *);
using PFNGLVIEWPORTPROC = void (*)(GLint, GLint, GLsizei, GLsizei);

struct Vec3 {
  float x = 0.0f;
  float y = 0.0f;
  float z = 0.0f;
};

struct Quat {
  float x = 0.0f;
  float y = 0.0f;
  float z = 0.0f;
  float w = 1.0f;
};

struct Color4 {
  float r = 1.0f;
  float g = 1.0f;
  float b = 1.0f;
  float a = 1.0f;
};

struct SceneFrame {
  int demoCode = 0;
  int materialCode = 0;
  float materialColor = 0xffffff;
  float backgroundColor = 0x101820;
  float cameraFov = 70.0f;
  float cameraAspect = 1.0f;
  float cameraNear = 0.01f;
  float cameraFar = 100.0f;
  float cameraX = 0.0f;
  float cameraY = 0.0f;
  float cameraZ = 4.0f;
  float cameraLookAtX = 0.0f;
  float cameraLookAtY = 0.0f;
  float cameraLookAtZ = 0.0f;
  float rotationX = 0.0f;
  float rotationY = 0.0f;
  float rotationZ = 0.0f;
  double timestampMs = 0.0;
};

struct Mat4 {
  float m[16] = {};
};

struct AnimatedNode {
  int parent = -1;
  int trsMode = 1;
  Mat4 baseMatrix;
  Vec3 baseTranslation;
  Quat baseRotation;
  Vec3 baseScale{1.0f, 1.0f, 1.0f};
};

struct AnimationChannel {
  int nodeIndex = 0;
  int pathCode = 0;
  int inputOffset = 0;
  int inputCount = 0;
  int outputOffset = 0;
};

struct UploadedSkin {
  std::vector<int> jointNodeIndices;
  std::vector<Mat4> inverseBindMatrices;
};

struct UploadedMeshBuffer {
  int handle = 0;
  int demoCode = 0;
  int materialCode = 0;
  GLuint vbo = 0;
  GLuint ibo = 0;
  GLuint texture = 0;
  GLuint metallicRoughnessTexture = 0;
  GLuint occlusionTexture = 0;
  GLuint emissiveTexture = 0;
  int textureHandle = 0;
  int metallicRoughnessTextureHandle = 0;
  int occlusionTextureHandle = 0;
  int emissiveTextureHandle = 0;
  int baseColorTexCoord = 0;
  int metallicRoughnessTexCoord = 0;
  int occlusionTexCoord = 0;
  int emissiveTexCoord = 0;
  int alphaMode = 0;
  float alphaCutoff = 0.5f;
  float alphaFactor = 1.0f;
  float metallicFactor = 0.0f;
  float roughnessFactor = 1.0f;
  float occlusionStrength = 1.0f;
  float emissiveR = 0.0f;
  float emissiveG = 0.0f;
  float emissiveB = 0.0f;
  int sideMode = 2;
  GLsizei vertexCount = 0;
  GLsizei indexCount = 0;
  std::size_t sourceVertexCount = 0;
  std::size_t sourceNormalCount = 0;
  std::size_t sourceIndexCount = 0;
  bool skinned = false;
  int skinIndex = -1;
  int meshNodeIndex = -1;
  std::vector<float> sourcePositions;
  std::vector<float> sourceNormals;
  std::vector<float> sourceColors;
  std::vector<float> sourceUv0s;
  std::vector<float> sourceUv1s;
  std::vector<int> sourceJoints0;
  std::vector<float> sourceWeights0;
  std::vector<float> skinnedVertices;
};

struct UploadedTexture {
  int handle = 0;
  GLuint texture = 0;
  int width = 0;
  int height = 0;
  std::string path;
};

struct UploadedMeshScene {
  int handle = 0;
  int demoCode = 0;
  bool animated = false;
  std::vector<int> meshBufferHandles;
  std::vector<int> meshBufferNodeIndices;
  std::vector<AnimatedNode> nodes;
  std::vector<UploadedSkin> skins;
  Mat4 modelMatrix;
  std::vector<AnimationChannel> animationChannels;
  std::vector<float> animationTimes;
  std::vector<float> animationValues;
  float animationDuration = 0.0f;
  double animationStartTimestampMs = -1.0;
  std::vector<Mat4> nodeWorldMatrices;
  std::vector<Mat4> nodeBindWorldMatrices;
  std::size_t sourceVertexCount = 0;
  std::size_t sourceIndexCount = 0;
};

struct NativeOrbitControls {
  bool initialized = false;
  bool userInteracted = false;
  bool dragging = false;
  int activeButton = -1;
  CGFloat lastX = 0.0;
  CGFloat lastY = 0.0;
  float targetX = 0.0f;
  float targetY = 0.7f;
  float targetZ = 0.0f;
  float radius = 1.0f;
  float theta = 0.0f;
  float phi = 1.57079632679f;
};

struct AngleProbeState {
  void *egl = nullptr;
  void *gles = nullptr;
  EGLDisplay display = EGL_NO_DISPLAY;
  EGLConfig config = nullptr;
  EGLSurface surface = EGL_NO_SURFACE;
  EGLContext context = EGL_NO_CONTEXT;
  PFNEGLGETERRORPROC eglGetError = nullptr;
  PFNEGLCREATEWINDOWSURFACEPROC eglCreateWindowSurface = nullptr;
  PFNEGLDESTROYSURFACEPROC eglDestroySurface = nullptr;
  PFNEGLMAKECURRENTPROC eglMakeCurrent = nullptr;
  PFNEGLSWAPBUFFERSPROC eglSwapBuffers = nullptr;

  PFNGLATTACHSHADERPROC glAttachShader = nullptr;
  PFNGLACTIVETEXTUREPROC glActiveTexture = nullptr;
  PFNGLBINDBUFFERPROC glBindBuffer = nullptr;
  PFNGLBINDFRAMEBUFFERPROC glBindFramebuffer = nullptr;
  PFNGLBINDTEXTUREPROC glBindTexture = nullptr;
  PFNGLBINDATTRIBLOCATIONPROC glBindAttribLocation = nullptr;
  PFNGLBLENDFUNCPROC glBlendFunc = nullptr;
  PFNGLBUFFERDATAPROC glBufferData = nullptr;
  PFNGLCLEARPROC glClear = nullptr;
  PFNGLCLEARCOLORPROC glClearColor = nullptr;
  PFNGLCOMPILESHADERPROC glCompileShader = nullptr;
  PFNGLCHECKFRAMEBUFFERSTATUSPROC glCheckFramebufferStatus = nullptr;
  PFNGLCREATEPROGRAMPROC glCreateProgram = nullptr;
  PFNGLCREATESHADERPROC glCreateShader = nullptr;
  PFNGLCULLFACEPROC glCullFace = nullptr;
  PFNGLDELETEPROGRAMPROC glDeleteProgram = nullptr;
  PFNGLDELETESHADERPROC glDeleteShader = nullptr;
  PFNGLDEPTHMASKPROC glDepthMask = nullptr;
  PFNGLDISABLEPROC glDisable = nullptr;
  PFNGLDRAWARRAYSPROC glDrawArrays = nullptr;
  PFNGLDRAWELEMENTSPROC glDrawElements = nullptr;
  PFNGLENABLEPROC glEnable = nullptr;
  PFNGLENABLEVERTEXATTRIBARRAYPROC glEnableVertexAttribArray = nullptr;
  PFNGLFRAMEBUFFERTEXTURE2DPROC glFramebufferTexture2D = nullptr;
  PFNGLGENBUFFERSPROC glGenBuffers = nullptr;
  PFNGLGENFRAMEBUFFERSPROC glGenFramebuffers = nullptr;
  PFNGLGENTEXTURESPROC glGenTextures = nullptr;
  PFNGLGETPROGRAMINFOLOGPROC glGetProgramInfoLog = nullptr;
  PFNGLGETPROGRAMIVPROC glGetProgramiv = nullptr;
  PFNGLGETSHADERINFOLOGPROC glGetShaderInfoLog = nullptr;
  PFNGLGETSHADERIVPROC glGetShaderiv = nullptr;
  PFNGLGETUNIFORMLOCATIONPROC glGetUniformLocation = nullptr;
  PFNGLGENERATEMIPMAPPROC glGenerateMipmap = nullptr;
  PFNGLLINKPROGRAMPROC glLinkProgram = nullptr;
  PFNGLSHADERSOURCEPROC glShaderSource = nullptr;
  PFNGLTEXIMAGE2DPROC glTexImage2D = nullptr;
  PFNGLTEXPARAMETERIPROC glTexParameteri = nullptr;
  PFNGLUNIFORM1FPROC glUniform1f = nullptr;
  PFNGLUNIFORM1IPROC glUniform1i = nullptr;
  PFNGLUNIFORM3FPROC glUniform3f = nullptr;
  PFNGLUNIFORMMATRIX4FVPROC glUniformMatrix4fv = nullptr;
  PFNGLUSEPROGRAMPROC glUseProgram = nullptr;
  PFNGLVERTEXATTRIBPOINTERPROC glVertexAttribPointer = nullptr;
  PFNGLVIEWPORTPROC glViewport = nullptr;

  GLuint program = 0;
  GLuint skyProgram = 0;
  GLuint skyVbo = 0;
  GLuint pmremTexture = 0;
  GLuint pmremPingPongTexture = 0;
  GLuint pmremFbo = 0;
  GLuint pmremSkyProgram = 0;
  GLuint pmremGgxProgram = 0;
  GLuint pmremVbo = 0;
  GLint uPmremGgxEnvMap = -1;
  GLint uPmremGgxRoughness = -1;
  GLint uPmremGgxMipInt = -1;
  GLint uMvp = -1;
  GLint uModel = -1;
  GLint uCameraPosition = -1;
  GLint uTexture = -1;
  GLint uMetallicRoughnessTexture = -1;
  GLint uOcclusionTexture = -1;
  GLint uEmissiveTexture = -1;
  GLint uPmremTexture = -1;
  GLint uUseTexture = -1;
  GLint uUseMetallicRoughnessTexture = -1;
  GLint uUseOcclusionTexture = -1;
  GLint uUseEmissiveTexture = -1;
  GLint uBaseColorTexCoord = -1;
  GLint uMetallicRoughnessTexCoord = -1;
  GLint uOcclusionTexCoord = -1;
  GLint uEmissiveTexCoord = -1;
  GLint uAlphaMode = -1;
  GLint uAlphaCutoff = -1;
  GLint uAlphaFactor = -1;
  GLint uMetallicFactor = -1;
  GLint uRoughnessFactor = -1;
  GLint uOcclusionStrength = -1;
  GLint uEmissiveFactor = -1;
  int widthPx = 1;
  int heightPx = 1;
  double devicePixelRatio = 1.0;
  NSView *hostView = nil;
  CAMetalLayer *metalLayer = nil;
  NativeOrbitControls orbit;
  bool ready = false;
  bool rendererReady = false;
  bool loggedFirstBufferFrame = false;
  bool loggedBufferDemo[16] = {};
  int fpsFrameCount = 0;
  double fpsWindowStartMs = 0.0;
  int nextMeshBufferHandle = 1;
  int nextMeshSceneHandle = 1;
  int nextTextureHandle = 1;
  std::vector<UploadedTexture> textures;
  std::vector<UploadedMeshBuffer> meshBuffers;
  std::vector<UploadedMeshScene> meshScenes;
};

static AngleProbeState gAngle;

static CGFloat backingScaleForHostView(NSView *nativeView) {
  CGFloat scale = nativeView.window ? nativeView.window.backingScaleFactor : 0.0;
  if (scale <= 0.0 && nativeView.window.screen) scale = nativeView.window.screen.backingScaleFactor;
  if (scale <= 0.0 && NSScreen.mainScreen) scale = NSScreen.mainScreen.backingScaleFactor;
  if (scale <= 0.0) scale = static_cast<CGFloat>(gAngle.devicePixelRatio > 0.0 ? gAngle.devicePixelRatio : 1.0);
  return std::max<CGFloat>(1.0, scale);
}

static NSRect resolvedHostBounds(NSView *nativeView) {
  if (NSView *contentView = nativeView.window.contentView) {
    [contentView layoutSubtreeIfNeeded];
  }

  NSView *containerView = nativeView.superview;
  if (containerView) {
    [containerView layoutSubtreeIfNeeded];
  }

  NSRect targetBounds = containerView ? containerView.bounds : nativeView.bounds;
  if ((targetBounds.size.width <= 0.0 || targetBounds.size.height <= 0.0) && nativeView.window.contentView) {
    targetBounds = nativeView.window.contentView.bounds;
  }
  return targetBounds;
}

static double syncHostViewSize(double fallbackAspect) {
  NSView *nativeView = gAngle.hostView;
  if (!nativeView) return fallbackAspect > 0.0 ? fallbackAspect : 1.0;

  NSRect targetBounds = resolvedHostBounds(nativeView);
  if (targetBounds.size.width <= 0.0 || targetBounds.size.height <= 0.0) {
    return fallbackAspect > 0.0 ? fallbackAspect : 1.0;
  }

  [CATransaction begin];
  [CATransaction setDisableActions:YES];
  nativeView.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
  NSRect targetFrame = NSMakeRect(0.0, 0.0, targetBounds.size.width, targetBounds.size.height);
  nativeView.frame = targetFrame;
  nativeView.bounds = targetFrame;
  [nativeView layoutSubtreeIfNeeded];

  CGFloat scale = backingScaleForHostView(nativeView);

  const int widthPx = std::max(1, static_cast<int>(std::round(targetBounds.size.width * scale)));
  const int heightPx = std::max(1, static_cast<int>(std::round(targetBounds.size.height * scale)));
  gAngle.widthPx = widthPx;
  gAngle.heightPx = heightPx;
  gAngle.devicePixelRatio = static_cast<double>(scale);

  CALayer *layer = nativeView.layer;
  if ([layer isKindOfClass:CAMetalLayer.class]) {
    CAMetalLayer *metalLayer = (CAMetalLayer *)layer;
    metalLayer.frame = nativeView.bounds;
    metalLayer.bounds = nativeView.bounds;
    metalLayer.contentsScale = scale;
    metalLayer.drawableSize = CGSizeMake(widthPx, heightPx);
    metalLayer.needsDisplayOnBoundsChange = YES;
  }

  [CATransaction commit];

  return static_cast<double>(targetBounds.size.width) / static_cast<double>(targetBounds.size.height);
}

static void smokeLog(const char *format, ...) {
  char message[1024] = {};
  va_list args;
  va_start(args, format);
  std::vsnprintf(message, sizeof(message), format, args);
  va_end(args);

  const char *path = std::getenv("GEA_THREE_ANGLE_SMOKE_LOG");
  if (!path || path[0] == '\0') path = "/tmp/three-angle-metal-smoke.log";
  if (FILE *file = std::fopen(path, "a")) {
    std::fprintf(file, "%s\n", message);
    std::fclose(file);
  }
  std::fprintf(stderr, "%s\n", message);
}

extern "C" void gea_three_angle_smoke_log(std::string message) {
  smokeLog("[three-angle-metal] %s", message.c_str());
}

static void *openFirst(const char *envName, const char *const *paths) {
  if (const char *overridePath = std::getenv(envName)) {
    if (void *handle = dlopen(overridePath, RTLD_NOW | RTLD_LOCAL)) {
      std::fprintf(stderr, "[three-angle-metal] loaded %s from %s\n", envName, overridePath);
      return handle;
    }
    std::fprintf(stderr, "[three-angle-metal] failed to load %s from %s: %s\n", envName, overridePath, dlerror());
  }
  for (int i = 0; paths[i] != nullptr; i++) {
    if (void *handle = dlopen(paths[i], RTLD_NOW | RTLD_LOCAL)) {
      std::fprintf(stderr, "[three-angle-metal] loaded %s\n", paths[i]);
      return handle;
    }
  }
  return nullptr;
}

template <typename Fn>
static Fn loadSymbol(void *library, const char *name) {
  return reinterpret_cast<Fn>(dlsym(library, name));
}

static EGLint lastEglError() {
  return gAngle.eglGetError ? gAngle.eglGetError() : 0;
}

static void logEglFailure(const char *step) {
  std::fprintf(stderr, "[three-angle-metal] %s failed, EGL error 0x%04x\n", step, lastEglError());
}

static bool rebuildWindowSurface(const char *label) {
  if (!gAngle.eglCreateWindowSurface || !gAngle.eglDestroySurface || !gAngle.eglMakeCurrent ||
      !gAngle.metalLayer || !gAngle.config || gAngle.context == EGL_NO_CONTEXT) {
    return false;
  }

  syncHostViewSize(static_cast<double>(gAngle.widthPx) / static_cast<double>(std::max(1, gAngle.heightPx)));
  const EGLSurface oldSurface = gAngle.surface;
  gAngle.eglMakeCurrent(gAngle.display, EGL_NO_SURFACE, EGL_NO_SURFACE, EGL_NO_CONTEXT);
  if (oldSurface != EGL_NO_SURFACE) {
    gAngle.eglDestroySurface(gAngle.display, oldSurface);
  }

  gAngle.surface = gAngle.eglCreateWindowSurface(
    gAngle.display,
    gAngle.config,
    (__bridge EGLNativeWindowType)gAngle.metalLayer,
    nullptr
  );
  if (gAngle.surface == EGL_NO_SURFACE) {
    logEglFailure(label);
    return false;
  }
  if (gAngle.eglMakeCurrent(gAngle.display, gAngle.surface, gAngle.surface, gAngle.context) == EGL_FALSE_VALUE) {
    logEglFailure("eglMakeCurrent(rebound-window-surface)");
    return false;
  }
  if (gAngle.rendererReady && gAngle.glViewport) {
    gAngle.glViewport(0, 0, gAngle.widthPx, gAngle.heightPx);
  }
  return true;
}

static float radians(float degrees) {
  return degrees * 0.017453292519943295f;
}

static Mat4 identity() {
  Mat4 out;
  out.m[0] = 1.0f;
  out.m[5] = 1.0f;
  out.m[10] = 1.0f;
  out.m[15] = 1.0f;
  return out;
}

static Mat4 matFromColumnMajorVector(const std::vector<gea_f32> &values, std::size_t offset) {
  Mat4 out = identity();
  if (offset + 15 >= values.size()) return out;
  for (int i = 0; i < 16; i++) {
    out.m[i] = static_cast<float>(values[offset + static_cast<std::size_t>(i)]);
  }
  return out;
}

static Mat4 perspective(float fovY, float aspect, float nearZ, float farZ) {
  Mat4 out;
  const float f = 1.0f / std::tan(fovY * 0.5f);
  out.m[0] = f / aspect;
  out.m[5] = f;
  out.m[10] = (farZ + nearZ) / (nearZ - farZ);
  out.m[11] = -1.0f;
  out.m[14] = (2.0f * farZ * nearZ) / (nearZ - farZ);
  return out;
}

static Mat4 translate(float x, float y, float z) {
  Mat4 out = identity();
  out.m[12] = x;
  out.m[13] = y;
  out.m[14] = z;
  return out;
}

static Mat4 rotateX(float angle) {
  Mat4 out = identity();
  const float c = std::cos(angle);
  const float s = std::sin(angle);
  out.m[5] = c;
  out.m[6] = s;
  out.m[9] = -s;
  out.m[10] = c;
  return out;
}

static Mat4 rotateY(float angle) {
  Mat4 out = identity();
  const float c = std::cos(angle);
  const float s = std::sin(angle);
  out.m[0] = c;
  out.m[2] = -s;
  out.m[8] = s;
  out.m[10] = c;
  return out;
}

static Mat4 rotateZ(float angle) {
  Mat4 out = identity();
  const float c = std::cos(angle);
  const float s = std::sin(angle);
  out.m[0] = c;
  out.m[1] = s;
  out.m[4] = -s;
  out.m[5] = c;
  return out;
}

static Mat4 scale(float x, float y, float z) {
  Mat4 out = identity();
  out.m[0] = x;
  out.m[5] = y;
  out.m[10] = z;
  return out;
}

static Vec3 subtract(Vec3 a, Vec3 b) {
  return Vec3{a.x - b.x, a.y - b.y, a.z - b.z};
}

static Vec3 add(Vec3 a, Vec3 b) {
  return Vec3{a.x + b.x, a.y + b.y, a.z + b.z};
}

static Vec3 scaleVec(Vec3 value, float scale) {
  return Vec3{value.x * scale, value.y * scale, value.z * scale};
}

static float dot(Vec3 a, Vec3 b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

static Vec3 cross(Vec3 a, Vec3 b) {
  return Vec3{
    a.y * b.z - a.z * b.y,
    a.z * b.x - a.x * b.z,
    a.x * b.y - a.y * b.x,
  };
}

static Vec3 normalize(Vec3 value, Vec3 fallback) {
  const float length = std::sqrt(dot(value, value));
  if (length <= 0.00001f) return fallback;
  return Vec3{value.x / length, value.y / length, value.z / length};
}

static float lengthOf(Vec3 value) {
  return std::sqrt(dot(value, value));
}

static Vec3 lerp(Vec3 a, Vec3 b, float t) {
  return Vec3{
    a.x + (b.x - a.x) * t,
    a.y + (b.y - a.y) * t,
    a.z + (b.z - a.z) * t,
  };
}

static Quat normalizeQuat(Quat value) {
  const float length = std::sqrt(value.x * value.x + value.y * value.y + value.z * value.z + value.w * value.w);
  if (length <= 0.00001f) return Quat{};
  return Quat{value.x / length, value.y / length, value.z / length, value.w / length};
}

static Quat slerpQuat(Quat a, Quat b, float t) {
  a = normalizeQuat(a);
  b = normalizeQuat(b);
  float cosHalfTheta = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
  if (cosHalfTheta < 0.0f) {
    b = Quat{-b.x, -b.y, -b.z, -b.w};
    cosHalfTheta = -cosHalfTheta;
  }
  if (cosHalfTheta > 0.9995f) {
    return normalizeQuat(Quat{
      a.x + (b.x - a.x) * t,
      a.y + (b.y - a.y) * t,
      a.z + (b.z - a.z) * t,
      a.w + (b.w - a.w) * t,
    });
  }
  const float halfTheta = std::acos(std::max(-1.0f, std::min(1.0f, cosHalfTheta)));
  const float sinHalfTheta = std::sin(halfTheta);
  if (std::fabs(sinHalfTheta) <= 0.00001f) return a;
  const float ratioA = std::sin((1.0f - t) * halfTheta) / sinHalfTheta;
  const float ratioB = std::sin(t * halfTheta) / sinHalfTheta;
  return Quat{
    a.x * ratioA + b.x * ratioB,
    a.y * ratioA + b.y * ratioB,
    a.z * ratioA + b.z * ratioB,
    a.w * ratioA + b.w * ratioB,
  };
}

static Mat4 lookAt(Vec3 eye, Vec3 center, Vec3 up) {
  const Vec3 f = normalize(subtract(center, eye), Vec3{0.0f, 0.0f, -1.0f});
  const Vec3 s = normalize(cross(f, up), Vec3{1.0f, 0.0f, 0.0f});
  const Vec3 u = cross(s, f);
  Mat4 out = identity();
  out.m[0] = s.x;
  out.m[4] = s.y;
  out.m[8] = s.z;
  out.m[1] = u.x;
  out.m[5] = u.y;
  out.m[9] = u.z;
  out.m[2] = -f.x;
  out.m[6] = -f.y;
  out.m[10] = -f.z;
  out.m[12] = -dot(s, eye);
  out.m[13] = -dot(u, eye);
  out.m[14] = dot(f, eye);
  return out;
}

static Mat4 multiply(const Mat4 &a, const Mat4 &b) {
  Mat4 out;
  for (int col = 0; col < 4; col++) {
    for (int row = 0; row < 4; row++) {
      float value = 0.0f;
      for (int k = 0; k < 4; k++) {
        value += a.m[k * 4 + row] * b.m[col * 4 + k];
      }
      out.m[col * 4 + row] = value;
    }
  }
  return out;
}

static Vec3 transformPoint(const Mat4 &matrix, Vec3 value) {
  const float x = matrix.m[0] * value.x + matrix.m[4] * value.y + matrix.m[8] * value.z + matrix.m[12];
  const float y = matrix.m[1] * value.x + matrix.m[5] * value.y + matrix.m[9] * value.z + matrix.m[13];
  const float z = matrix.m[2] * value.x + matrix.m[6] * value.y + matrix.m[10] * value.z + matrix.m[14];
  const float w = matrix.m[3] * value.x + matrix.m[7] * value.y + matrix.m[11] * value.z + matrix.m[15];
  if (std::fabs(w) > 0.00001f && std::fabs(w - 1.0f) > 0.00001f) {
    return Vec3{x / w, y / w, z / w};
  }
  return Vec3{x, y, z};
}

static Vec3 transformDirection(const Mat4 &matrix, Vec3 value) {
  return Vec3{
    matrix.m[0] * value.x + matrix.m[4] * value.y + matrix.m[8] * value.z,
    matrix.m[1] * value.x + matrix.m[5] * value.y + matrix.m[9] * value.z,
    matrix.m[2] * value.x + matrix.m[6] * value.y + matrix.m[10] * value.z,
  };
}

static Mat4 inverse(const Mat4 &matrix) {
  const float *m = matrix.m;
  Mat4 out;
  out.m[0] = m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15] +
             m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10];
  out.m[4] = -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15] -
             m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10];
  out.m[8] = m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15] +
             m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9];
  out.m[12] = -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14] -
              m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9];
  out.m[1] = -m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15] -
             m[9] * m[3] * m[14] - m[13] * m[2] * m[11] + m[13] * m[3] * m[10];
  out.m[5] = m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15] +
             m[8] * m[3] * m[14] + m[12] * m[2] * m[11] - m[12] * m[3] * m[10];
  out.m[9] = -m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15] -
             m[8] * m[3] * m[13] - m[12] * m[1] * m[11] + m[12] * m[3] * m[9];
  out.m[13] = m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14] +
              m[8] * m[2] * m[13] + m[12] * m[1] * m[10] - m[12] * m[2] * m[9];
  out.m[2] = m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15] +
             m[5] * m[3] * m[14] + m[13] * m[2] * m[7] - m[13] * m[3] * m[6];
  out.m[6] = -m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15] -
             m[4] * m[3] * m[14] - m[12] * m[2] * m[7] + m[12] * m[3] * m[6];
  out.m[10] = m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15] +
              m[4] * m[3] * m[13] + m[12] * m[1] * m[7] - m[12] * m[3] * m[5];
  out.m[14] = -m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14] -
              m[4] * m[2] * m[13] - m[12] * m[1] * m[6] + m[12] * m[2] * m[5];
  out.m[3] = -m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11] -
             m[5] * m[3] * m[10] - m[9] * m[2] * m[7] + m[9] * m[3] * m[6];
  out.m[7] = m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11] +
             m[4] * m[3] * m[10] + m[8] * m[2] * m[7] - m[8] * m[3] * m[6];
  out.m[11] = -m[0] * m[5] * m[11] + m[0] * m[7] * m[9] + m[4] * m[1] * m[11] -
              m[4] * m[3] * m[9] - m[8] * m[1] * m[7] + m[8] * m[3] * m[5];
  out.m[15] = m[0] * m[5] * m[10] - m[0] * m[6] * m[9] - m[4] * m[1] * m[10] +
              m[4] * m[2] * m[9] + m[8] * m[1] * m[6] - m[8] * m[2] * m[5];

  const float determinant = m[0] * out.m[0] + m[1] * out.m[4] + m[2] * out.m[8] + m[3] * out.m[12];
  if (std::fabs(determinant) <= 0.0000001f) return identity();
  const float invDeterminant = 1.0f / determinant;
  for (float &value : out.m) value *= invDeterminant;
  return out;
}

static Mat4 matFromTrs(Vec3 translation, Quat rotation, Vec3 scaleValue) {
  rotation = normalizeQuat(rotation);
  const float x = rotation.x;
  const float y = rotation.y;
  const float z = rotation.z;
  const float w = rotation.w;
  const float xx = x * x;
  const float yy = y * y;
  const float zz = z * z;
  const float xy = x * y;
  const float xz = x * z;
  const float yz = y * z;
  const float wx = w * x;
  const float wy = w * y;
  const float wz = w * z;
  Mat4 out = identity();
  out.m[0] = (1.0f - 2.0f * (yy + zz)) * scaleValue.x;
  out.m[1] = (2.0f * (xy + wz)) * scaleValue.x;
  out.m[2] = (2.0f * (xz - wy)) * scaleValue.x;
  out.m[4] = (2.0f * (xy - wz)) * scaleValue.y;
  out.m[5] = (1.0f - 2.0f * (xx + zz)) * scaleValue.y;
  out.m[6] = (2.0f * (yz + wx)) * scaleValue.y;
  out.m[8] = (2.0f * (xz + wy)) * scaleValue.z;
  out.m[9] = (2.0f * (yz - wx)) * scaleValue.z;
  out.m[10] = (1.0f - 2.0f * (xx + yy)) * scaleValue.z;
  out.m[12] = translation.x;
  out.m[13] = translation.y;
  out.m[14] = translation.z;
  return out;
}

static Mat4 viewProjectionForFrame(const SceneFrame &frame) {
  const float fallbackAspect = static_cast<float>(std::max(gAngle.widthPx, 1)) /
                              static_cast<float>(std::max(gAngle.heightPx, 1));
  const float aspect = frame.cameraAspect > 0.0001f ? frame.cameraAspect : fallbackAspect;
  const Mat4 proj = perspective(radians(frame.cameraFov), aspect, frame.cameraNear, frame.cameraFar);
  const Mat4 view = lookAt(
    Vec3{frame.cameraX, frame.cameraY, frame.cameraZ},
    Vec3{frame.cameraLookAtX, frame.cameraLookAtY, frame.cameraLookAtZ},
    Vec3{0.0f, 1.0f, 0.0f}
  );
  return multiply(proj, view);
}

static Mat4 frameModelForFrame(const SceneFrame &frame) {
  return multiply(rotateZ(frame.rotationZ), multiply(rotateY(frame.rotationY), rotateX(frame.rotationX)));
}

static Mat4 worldModelForFrame(const SceneFrame &frame, const Mat4 &model) {
  return multiply(frameModelForFrame(frame), model);
}

static Mat4 mvpForModel(const SceneFrame &frame, const Mat4 &model) {
  return multiply(viewProjectionForFrame(frame), worldModelForFrame(frame, model));
}

static Mat4 mvpForFrame(const SceneFrame &frame) {
  return mvpForModel(frame, identity());
}

static Color4 colorFromHex(float value, float alpha = 1.0f) {
  const unsigned int color = static_cast<unsigned int>(std::max(value, 0.0f));
  return Color4{
    static_cast<float>((color >> 16) & 0xff) / 255.0f,
    static_cast<float>((color >> 8) & 0xff) / 255.0f,
    static_cast<float>(color & 0xff) / 255.0f,
    alpha,
  };
}

static bool hostEventPoint(NSEvent *event, NSPoint &point) {
  NSView *view = gAngle.hostView;
  if (!view || !view.window || event.window != view.window) return false;
  point = [view convertPoint:event.locationInWindow fromView:nil];
  return true;
}

static void initializeOrbitFromFrame(const SceneFrame &frame) {
  NativeOrbitControls &orbit = gAngle.orbit;
  orbit.targetX = frame.cameraLookAtX;
  orbit.targetY = frame.cameraLookAtY;
  orbit.targetZ = frame.cameraLookAtZ;
  const Vec3 eye{frame.cameraX, frame.cameraY, frame.cameraZ};
  const Vec3 target{orbit.targetX, orbit.targetY, orbit.targetZ};
  const Vec3 offset = subtract(eye, target);
  orbit.radius = std::max(0.05f, lengthOf(offset));
  orbit.theta = std::atan2(offset.x, offset.z);
  orbit.phi = std::acos(std::max(-1.0f, std::min(1.0f, offset.y / orbit.radius)));
  orbit.initialized = true;
}

static Vec3 orbitEyePosition() {
  const NativeOrbitControls &orbit = gAngle.orbit;
  const float sinPhiRadius = std::sin(orbit.phi) * orbit.radius;
  return Vec3{
    orbit.targetX + sinPhiRadius * std::sin(orbit.theta),
    orbit.targetY + std::cos(orbit.phi) * orbit.radius,
    orbit.targetZ + sinPhiRadius * std::cos(orbit.theta),
  };
}

static void applyNativeOrbitCamera(SceneFrame &frame) {
  if (frame.demoCode != 8) return;
  if (!gAngle.orbit.initialized) initializeOrbitFromFrame(frame);
  if (!gAngle.orbit.userInteracted) return;
  const Vec3 eye = orbitEyePosition();
  frame.cameraX = eye.x;
  frame.cameraY = eye.y;
  frame.cameraZ = eye.z;
  frame.cameraLookAtX = gAngle.orbit.targetX;
  frame.cameraLookAtY = gAngle.orbit.targetY;
  frame.cameraLookAtZ = gAngle.orbit.targetZ;
}

static void panNativeOrbit(CGFloat deltaX, CGFloat deltaY) {
  NativeOrbitControls &orbit = gAngle.orbit;
  const Vec3 eye = orbitEyePosition();
  const Vec3 target{orbit.targetX, orbit.targetY, orbit.targetZ};
  const Vec3 forward = normalize(subtract(target, eye), Vec3{0.0f, 0.0f, -1.0f});
  const Vec3 right = normalize(cross(forward, Vec3{0.0f, 1.0f, 0.0f}), Vec3{1.0f, 0.0f, 0.0f});
  const Vec3 up = normalize(cross(right, forward), Vec3{0.0f, 1.0f, 0.0f});
  const float viewHeight = std::max(1.0f, static_cast<float>(gAngle.heightPx) / static_cast<float>(std::max(0.001, gAngle.devicePixelRatio)));
  const float worldPerPoint = 2.0f * orbit.radius * std::tan(radians(40.0f) * 0.5f) / viewHeight;
  const Vec3 move = add(
    scaleVec(right, static_cast<float>(-deltaX) * worldPerPoint),
    scaleVec(up, static_cast<float>(deltaY) * worldPerPoint)
  );
  orbit.targetX += move.x;
  orbit.targetY += move.y;
  orbit.targetZ += move.z;
}

static bool eventIsInsideHost(NSEvent *event) {
  NSPoint point = NSZeroPoint;
  if (!hostEventPoint(event, point)) return false;
  NSView *view = gAngle.hostView;
  return view && NSPointInRect(point, view.bounds);
}

static void handleNativeOrbitMouseDown(NSEvent *event, int button) {
  if (!eventIsInsideHost(event)) return;
  if (gAngle.hostView.window) [gAngle.hostView.window makeFirstResponder:gAngle.hostView];
  NSPoint point = NSZeroPoint;
  if (!hostEventPoint(event, point)) return;
  NativeOrbitControls &orbit = gAngle.orbit;
  orbit.dragging = true;
  orbit.activeButton = button;
  orbit.lastX = point.x;
  orbit.lastY = point.y;
  orbit.userInteracted = true;
}

static void handleNativeOrbitMouseDragged(NSEvent *event, int button) {
  NativeOrbitControls &orbit = gAngle.orbit;
  if (!orbit.dragging || orbit.activeButton != button) return;
  NSPoint point = NSZeroPoint;
  if (!hostEventPoint(event, point)) return;
  const CGFloat deltaX = point.x - orbit.lastX;
  const CGFloat deltaY = point.y - orbit.lastY;
  orbit.lastX = point.x;
  orbit.lastY = point.y;
  const bool pan = button != 0 || ((event.modifierFlags & NSEventModifierFlagShift) != 0);
  if (pan) {
    panNativeOrbit(deltaX, deltaY);
    return;
  }
  const float rotateScale = 2.0f * 3.14159265359f / std::max(320.0f, static_cast<float>(std::max(gAngle.widthPx, gAngle.heightPx)) / static_cast<float>(std::max(0.001, gAngle.devicePixelRatio)));
  orbit.theta -= static_cast<float>(deltaX) * rotateScale;
  orbit.phi -= static_cast<float>(deltaY) * rotateScale;
  orbit.phi = std::max(0.01f, std::min(3.1315926f, orbit.phi));
}

static void handleNativeOrbitMouseUp(NSEvent *event, int button) {
  (void)event;
  NativeOrbitControls &orbit = gAngle.orbit;
  if (orbit.activeButton != button) return;
  orbit.dragging = false;
  orbit.activeButton = -1;
}

static void handleNativeOrbitScroll(NSEvent *event) {
  if (!eventIsInsideHost(event)) return;
  NativeOrbitControls &orbit = gAngle.orbit;
  orbit.userInteracted = true;
  const CGFloat rawDelta = event.hasPreciseScrollingDeltas ? event.scrollingDeltaY : event.deltaY * 12.0;
  const float zoomScale = std::exp(static_cast<float>(-rawDelta) * 0.0025f);
  orbit.radius = std::max(0.35f, std::min(80.0f, orbit.radius * zoomScale));
}

static GLuint compileShader(GLenum type, const char *source, const char *label);

static constexpr int kPmremCubeSize = 256;
static constexpr int kPmremLodMax = 8;
static constexpr int kPmremLodMin = 4;
static constexpr int kPmremTotalLods = 11;
static constexpr int kPmremAtlasWidth = 768;
static constexpr int kPmremAtlasHeight = 1024;
static constexpr int kPmremSizeLods[kPmremTotalLods] = {256, 128, 64, 32, 16, 16, 16, 16, 16, 16, 16};

static void appendPmremVertex(std::vector<float> &vertices, float x, float y, float z, float u, float v, float face) {
  vertices.push_back(x);
  vertices.push_back(y);
  vertices.push_back(z);
  vertices.push_back(u);
  vertices.push_back(v);
  vertices.push_back(face);
}

static void buildPmremPlaneVertices(int lodIndex, std::vector<float> &vertices) {
  vertices.clear();
  vertices.reserve(6 * 6 * 6);
  const float sizeLod = static_cast<float>(kPmremSizeLods[std::max(0, std::min(kPmremTotalLods - 1, lodIndex))]);
  const float texelSize = 1.0f / (sizeLod - 2.0f);
  const float minUv = -texelSize;
  const float maxUv = 1.0f + texelSize;
  const float uv[12] = {
    minUv, minUv,
    maxUv, minUv,
    maxUv, maxUv,
    minUv, minUv,
    maxUv, maxUv,
    minUv, maxUv,
  };
  for (int face = 0; face < 6; face++) {
    const float x = static_cast<float>(face % 3) * 2.0f / 3.0f - 1.0f;
    const float y = face > 2 ? 0.0f : -1.0f;
    const float p[18] = {
      x, y, 0.0f,
      x + 2.0f / 3.0f, y, 0.0f,
      x + 2.0f / 3.0f, y + 1.0f, 0.0f,
      x, y, 0.0f,
      x + 2.0f / 3.0f, y + 1.0f, 0.0f,
      x, y + 1.0f, 0.0f,
    };
    for (int i = 0; i < 6; i++) {
      appendPmremVertex(vertices, p[i * 3], p[i * 3 + 1], p[i * 3 + 2], uv[i * 2], uv[i * 2 + 1], static_cast<float>(face));
    }
  }
}

static GLuint linkPmremProgram(const char *vertexSource, const char *fragmentSource, const char *label) {
  const GLuint vertex = compileShader(GL_VERTEX_SHADER, vertexSource, label);
  const GLuint fragment = compileShader(GL_FRAGMENT_SHADER, fragmentSource, label);
  if (!vertex || !fragment) return 0;
  const GLuint program = gAngle.glCreateProgram();
  gAngle.glAttachShader(program, vertex);
  gAngle.glAttachShader(program, fragment);
  gAngle.glBindAttribLocation(program, 0, "aPosition");
  gAngle.glBindAttribLocation(program, 1, "aUv");
  gAngle.glBindAttribLocation(program, 2, "aFaceIndex");
  gAngle.glLinkProgram(program);
  GLint linked = 0;
  gAngle.glGetProgramiv(program, GL_LINK_STATUS, &linked);
  gAngle.glDeleteShader(vertex);
  gAngle.glDeleteShader(fragment);
  if (!linked) {
    GLchar info[1024] = {};
    GLsizei length = 0;
    gAngle.glGetProgramInfoLog(program, sizeof(info) - 1, &length, info);
    std::fprintf(stderr, "[three-angle-metal] %s program link failed: %s\n", label, info);
    gAngle.glDeleteProgram(program);
    return 0;
  }
  return program;
}

static bool ensurePmremPrograms() {
  if (gAngle.pmremSkyProgram != 0 && gAngle.pmremGgxProgram != 0) return true;

  static const char *pmremVertexSource = R"GLSL(#version 300 es
precision mediump float;
precision mediump int;

in vec3 aPosition;
in vec2 aUv;
in float aFaceIndex;
out vec3 vOutputDirection;

vec3 getDirection(vec2 uv, float face) {
  uv = 2.0 * uv - 1.0;
  vec3 direction = vec3(uv, 1.0);
  if (face == 0.0) {
    direction = direction.zyx;
  } else if (face == 1.0) {
    direction = direction.xzy;
    direction.xz *= -1.0;
  } else if (face == 2.0) {
    direction.x *= -1.0;
  } else if (face == 3.0) {
    direction = direction.zyx;
    direction.xz *= -1.0;
  } else if (face == 4.0) {
    direction = direction.xzy;
    direction.xy *= -1.0;
  } else if (face == 5.0) {
    direction.z *= -1.0;
  }
  return direction;
}

void main() {
  vOutputDirection = getDirection(aUv, aFaceIndex);
  gl_Position = vec4(aPosition, 1.0);
}
)GLSL";

  static const char *pmremSkyFragmentSource = R"GLSL(#version 300 es
precision highp float;
precision highp int;

in vec3 vOutputDirection;
out vec4 outColor;

const float pi = 3.141592653589793238462643383279502884197169;
const float e = 2.71828182845904523536028747135266249775724709369995957;
const vec3 totalRayleigh = vec3(5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5);
const vec3 MieConst = vec3(1.8399918514433978E14, 2.7798023919660528E14, 4.0790479543861094E14);
const float cutoffAngle = 1.6110731556870734;
const float steepness = 1.5;
const float EE = 1000.0;
const float rayleighZenithLength = 8.4E3;
const float mieZenithLength = 1.25E3;
const float sunAngularDiameterCos = 0.999956676946448443553574619906976478926848692873900859324;
const float THREE_OVER_SIXTEENPI = 0.05968310365946075;
const float ONE_OVER_FOURPI = 0.07957747154594767;
const vec3 skyUp = vec3(0.0, 1.0, 0.0);
const vec3 skySunPosition = vec3(-0.8, 0.19, 0.56);
const float skyTurbidity = 0.0;
const float skyRayleigh = 3.0;
const float skyMieCoefficient = 0.005;
const float skyMieDirectionalG = 0.7;
const float skyCloudScale = 0.0002;
const float skyCloudSpeed = 0.0001;
const float skyCloudCoverage = 0.4;
const float skyCloudDensity = 0.4;
const float skyCloudElevation = 1.0;
const float skyShowSunDisc = 1.0;
const float skyTime = 0.0;

float sunIntensity(float zenithAngleCos) {
  zenithAngleCos = clamp(zenithAngleCos, -1.0, 1.0);
  return EE * max(0.0, 1.0 - pow(e, -((cutoffAngle - acos(zenithAngleCos)) / steepness)));
}

vec3 totalMie(float T) {
  float c = (0.2 * T) * 10E-18;
  return 0.434 * c * MieConst;
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

float rayleighPhase(float cosTheta) {
  return THREE_OVER_SIXTEENPI * (1.0 + pow(cosTheta, 2.0));
}

float hgPhase(float cosTheta, float g) {
  float g2 = pow(g, 2.0);
  float inverse = 1.0 / pow(1.0 - 2.0 * g * cosTheta + g2, 1.5);
  return ONE_OVER_FOURPI * ((1.0 - g2) * inverse);
}

vec3 skyRadiance(vec3 direction) {
  vec3 sunDirection = normalize(skySunPosition);
  float sunE = sunIntensity(dot(sunDirection, skyUp));
  float sunfade = 1.0 - clamp(1.0 - exp((skySunPosition.y / 450000.0)), 0.0, 1.0);
  float rayleighCoefficient = skyRayleigh - (1.0 * (1.0 - sunfade));
  vec3 betaR = totalRayleigh * rayleighCoefficient;
  vec3 betaM = totalMie(skyTurbidity) * skyMieCoefficient;

  float zenithAngle = acos(max(0.0, dot(skyUp, direction)));
  float inverse = 1.0 / (cos(zenithAngle) + 0.15 * pow(93.885 - ((zenithAngle * 180.0) / pi), -1.253));
  float sR = rayleighZenithLength * inverse;
  float sM = mieZenithLength * inverse;
  vec3 Fex = exp(-(betaR * sR + betaM * sM));

  float cosTheta = dot(direction, sunDirection);
  float rPhase = rayleighPhase(cosTheta * 0.5 + 0.5);
  vec3 betaRTheta = betaR * rPhase;
  float mPhase = hgPhase(cosTheta, skyMieDirectionalG);
  vec3 betaMTheta = betaM * mPhase;

  vec3 Lin = pow(sunE * ((betaRTheta + betaMTheta) / (betaR + max(betaM, vec3(1.0e-9)))) * (1.0 - Fex), vec3(1.5));
  Lin *= mix(vec3(1.0), pow(sunE * ((betaRTheta + betaMTheta) / (betaR + max(betaM, vec3(1.0e-9)))) * Fex, vec3(1.0 / 2.0)), clamp(pow(1.0 - dot(skyUp, sunDirection), 5.0), 0.0, 1.0));

  vec3 L0 = vec3(0.1) * Fex;
  float sundisc = smoothstep(sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta) * skyShowSunDisc;
  L0 += (sunE * 19000.0 * Fex) * sundisc;
  vec3 texColor = (Lin + L0) * 0.04 + vec3(0.0, 0.0003, 0.00075);

  if (direction.y > 0.0 && skyCloudCoverage > 0.0) {
    float elevation = mix(1.0, 0.1, skyCloudElevation);
    vec2 cloudUV = direction.xz / (direction.y * elevation);
    cloudUV *= skyCloudScale;
    cloudUV += skyTime * skyCloudSpeed;
    float cloudNoise = fbm(cloudUV * 1000.0);
    cloudNoise += 0.5 * fbm(cloudUV * 2000.0 + 3.7);
    cloudNoise = cloudNoise * 0.5 + 0.5;
    float cloudMask = smoothstep(1.0 - skyCloudCoverage, 1.0 - skyCloudCoverage + 0.3, cloudNoise);
    float horizonFade = smoothstep(0.0, 0.1 + 0.2 * skyCloudElevation, direction.y);
    cloudMask *= horizonFade;
    float sunInfluence = dot(direction, sunDirection) * 0.5 + 0.5;
    float daylight = max(0.0, sunDirection.y * 2.0);
    vec3 atmosphereColor = Lin * 0.04;
    vec3 cloudColor = mix(vec3(0.3), vec3(1.0), daylight);
    cloudColor = mix(cloudColor, atmosphereColor + vec3(1.0), sunInfluence * 0.5);
    cloudColor *= sunE * 0.00002;
    texColor = mix(texColor, cloudColor, cloudMask * skyCloudDensity);
  }

  return texColor;
}

void main() {
  outColor = vec4(skyRadiance(normalize(vOutputDirection)), 1.0);
}
)GLSL";

  static const char *pmremGgxFragmentSource = R"GLSL(#version 300 es
precision highp float;
precision highp int;

in vec3 vOutputDirection;
out vec4 outColor;

uniform sampler2D envMap;
uniform float roughness;
uniform float mipInt;

#define GGX_SAMPLES 256
#define CUBEUV_TEXEL_WIDTH 0.0013020833333333333
#define CUBEUV_TEXEL_HEIGHT 0.0009765625
#define CUBEUV_MAX_MIP 8.0
#define cubeUV_minMipLevel 4.0
#define cubeUV_minTileSize 16.0
#define PI 3.14159265359

float getFace(vec3 direction) {
  vec3 absDirection = abs(direction);
  float face = -1.0;
  if (absDirection.x > absDirection.z) {
    if (absDirection.x > absDirection.y) face = direction.x > 0.0 ? 0.0 : 3.0;
    else face = direction.y > 0.0 ? 1.0 : 4.0;
  } else {
    if (absDirection.z > absDirection.y) face = direction.z > 0.0 ? 2.0 : 5.0;
    else face = direction.y > 0.0 ? 1.0 : 4.0;
  }
  return face;
}

vec2 getUV(vec3 direction, float face) {
  vec2 uv;
  if (face == 0.0) uv = vec2(direction.z, direction.y) / abs(direction.x);
  else if (face == 1.0) uv = vec2(-direction.x, -direction.z) / abs(direction.y);
  else if (face == 2.0) uv = vec2(-direction.x, direction.y) / abs(direction.z);
  else if (face == 3.0) uv = vec2(-direction.z, direction.y) / abs(direction.x);
  else if (face == 4.0) uv = vec2(-direction.x, direction.z) / abs(direction.y);
  else uv = vec2(direction.x, direction.y) / abs(direction.z);
  return 0.5 * (uv + 1.0);
}

vec3 bilinearCubeUV(sampler2D cubeUvEnvMap, vec3 direction, float mipLevel) {
  float face = getFace(direction);
  float filterInt = max(cubeUV_minMipLevel - mipLevel, 0.0);
  mipLevel = max(mipLevel, cubeUV_minMipLevel);
  float faceSize = exp2(mipLevel);
  highp vec2 uv = getUV(direction, face) * (faceSize - 2.0) + 1.0;
  if (face > 2.0) {
    uv.y += faceSize;
    face -= 3.0;
  }
  uv.x += face * faceSize;
  uv.x += filterInt * 3.0 * cubeUV_minTileSize;
  uv.y += 4.0 * (exp2(CUBEUV_MAX_MIP) - faceSize);
  uv.x *= CUBEUV_TEXEL_WIDTH;
  uv.y *= CUBEUV_TEXEL_HEIGHT;
  return texture(cubeUvEnvMap, uv).rgb;
}

float radicalInverse_VdC(uint bits) {
  bits = (bits << 16u) | (bits >> 16u);
  bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
  bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
  bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
  bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
  return float(bits) * 2.3283064365386963e-10;
}

vec2 hammersley(uint i, uint N) {
  return vec2(float(i) / float(N), radicalInverse_VdC(i));
}

vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float sampleRoughness) {
  float alpha = sampleRoughness * sampleRoughness;
  vec3 T1 = vec3(1.0, 0.0, 0.0);
  vec3 T2 = cross(V, T1);
  float r = sqrt(Xi.x);
  float phi = 2.0 * PI * Xi.y;
  float t1 = r * cos(phi);
  float t2 = r * sin(phi);
  float s = 0.5 * (1.0 + V.z);
  t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;
  vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;
  return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
}

void main() {
  vec3 N = normalize(vOutputDirection);
  vec3 V = N;
  vec3 prefilteredColor = vec3(0.0);
  float totalWeight = 0.0;

  if (roughness < 0.001) {
    outColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
    return;
  }

  vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
  vec3 tangent = normalize(cross(up, N));
  vec3 bitangent = cross(N, tangent);

  for (uint i = 0u; i < uint(GGX_SAMPLES); i++) {
    vec2 Xi = hammersley(i, uint(GGX_SAMPLES));
    vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);
    vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
    vec3 L = normalize(2.0 * dot(V, H) * H - V);
    float NdotL = max(dot(N, L), 0.0);
    if (NdotL > 0.0) {
      prefilteredColor += bilinearCubeUV(envMap, L, mipInt) * NdotL;
      totalWeight += NdotL;
    }
  }

  if (totalWeight > 0.0) {
    prefilteredColor = prefilteredColor / totalWeight;
  }
  outColor = vec4(prefilteredColor, 1.0);
}
)GLSL";

  gAngle.pmremSkyProgram = linkPmremProgram(pmremVertexSource, pmremSkyFragmentSource, "PMREM sky");
  gAngle.pmremGgxProgram = linkPmremProgram(pmremVertexSource, pmremGgxFragmentSource, "PMREM GGX");
  if (gAngle.pmremSkyProgram == 0 || gAngle.pmremGgxProgram == 0) return false;
  gAngle.uPmremGgxEnvMap = gAngle.glGetUniformLocation(gAngle.pmremGgxProgram, "envMap");
  gAngle.uPmremGgxRoughness = gAngle.glGetUniformLocation(gAngle.pmremGgxProgram, "roughness");
  gAngle.uPmremGgxMipInt = gAngle.glGetUniformLocation(gAngle.pmremGgxProgram, "mipInt");
  return true;
}

static GLuint createPmremRenderTexture(bool halfFloat) {
  GLuint textureName = 0;
  gAngle.glGenTextures(1, &textureName);
  if (textureName == 0) return 0;
  gAngle.glBindTexture(GL_TEXTURE_2D, textureName);
  gAngle.glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
  gAngle.glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
  gAngle.glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
  gAngle.glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
  gAngle.glTexImage2D(
    GL_TEXTURE_2D,
    0,
    halfFloat ? GL_RGBA16F : GL_RGBA,
    kPmremAtlasWidth,
    kPmremAtlasHeight,
    0,
    GL_RGBA,
    halfFloat ? GL_HALF_FLOAT : GL_UNSIGNED_BYTE,
    nullptr
  );
  return textureName;
}

static bool pmremFramebufferComplete(GLuint textureName) {
  gAngle.glBindFramebuffer(GL_FRAMEBUFFER, gAngle.pmremFbo);
  gAngle.glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, textureName, 0);
  return gAngle.glCheckFramebufferStatus(GL_FRAMEBUFFER) == GL_FRAMEBUFFER_COMPLETE;
}

static void drawPmremPlane(int lodIndex) {
  std::vector<float> vertices;
  buildPmremPlaneVertices(lodIndex, vertices);
  gAngle.glBindBuffer(GL_ARRAY_BUFFER, gAngle.pmremVbo);
  gAngle.glBufferData(GL_ARRAY_BUFFER, static_cast<GLsizeiptr>(vertices.size() * sizeof(float)), vertices.data(), GL_STATIC_DRAW);
  const GLsizei stride = static_cast<GLsizei>(6 * sizeof(float));
  gAngle.glEnableVertexAttribArray(0);
  gAngle.glEnableVertexAttribArray(1);
  gAngle.glEnableVertexAttribArray(2);
  gAngle.glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE_VALUE, stride, reinterpret_cast<const void *>(0));
  gAngle.glVertexAttribPointer(1, 2, GL_FLOAT, GL_FALSE_VALUE, stride, reinterpret_cast<const void *>(3 * sizeof(float)));
  gAngle.glVertexAttribPointer(2, 1, GL_FLOAT, GL_FALSE_VALUE, stride, reinterpret_cast<const void *>(5 * sizeof(float)));
  gAngle.glDrawArrays(GL_TRIANGLES, 0, 36);
}

static void renderPmremGgxPass(GLuint targetTexture, GLuint sourceTexture, int lodOut, float roughness, float mipInt) {
  const int outputSize = kPmremSizeLods[lodOut];
  const int x = 3 * outputSize * (lodOut > kPmremLodMax - kPmremLodMin ? lodOut - kPmremLodMax + kPmremLodMin : 0);
  const int y = 4 * (kPmremCubeSize - outputSize);
  gAngle.glBindFramebuffer(GL_FRAMEBUFFER, gAngle.pmremFbo);
  gAngle.glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, targetTexture, 0);
  gAngle.glViewport(x, y, 3 * outputSize, 2 * outputSize);
  gAngle.glUseProgram(gAngle.pmremGgxProgram);
  gAngle.glActiveTexture(GL_TEXTURE0);
  gAngle.glBindTexture(GL_TEXTURE_2D, sourceTexture);
  gAngle.glUniform1i(gAngle.uPmremGgxEnvMap, 0);
  gAngle.glUniform1f(gAngle.uPmremGgxRoughness, roughness);
  gAngle.glUniform1f(gAngle.uPmremGgxMipInt, mipInt);
  drawPmremPlane(lodOut);
}

static GLuint createPmremTexture() {
  if (!ensurePmremPrograms()) return 0;
  if (gAngle.pmremFbo == 0) {
    gAngle.glGenFramebuffers(1, &gAngle.pmremFbo);
  }
  if (gAngle.pmremVbo == 0) {
    gAngle.glGenBuffers(1, &gAngle.pmremVbo);
  }
  if (gAngle.pmremFbo == 0 || gAngle.pmremVbo == 0) return 0;

  bool usingHalfFloat = true;
  GLuint textureName = createPmremRenderTexture(true);
  GLuint pingPongTexture = createPmremRenderTexture(true);
  if (textureName == 0 || pingPongTexture == 0 ||
      !pmremFramebufferComplete(textureName) ||
      !pmremFramebufferComplete(pingPongTexture)) {
    std::fprintf(stderr, "[three-angle-metal] half-float PMREM target unavailable; falling back to RGBA8\n");
    usingHalfFloat = false;
    textureName = createPmremRenderTexture(false);
    pingPongTexture = createPmremRenderTexture(false);
    if (textureName == 0 || pingPongTexture == 0 ||
        !pmremFramebufferComplete(textureName) ||
        !pmremFramebufferComplete(pingPongTexture)) {
      gAngle.glBindFramebuffer(GL_FRAMEBUFFER, 0);
      return 0;
    }
  }
  gAngle.pmremPingPongTexture = pingPongTexture;

  gAngle.glDisable(GL_BLEND);
  gAngle.glDisable(GL_CULL_FACE);
  gAngle.glDisable(GL_DEPTH_TEST);
  gAngle.glDepthMask(GL_FALSE_VALUE);

  gAngle.glBindFramebuffer(GL_FRAMEBUFFER, gAngle.pmremFbo);
  gAngle.glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, textureName, 0);
  gAngle.glViewport(0, 0, kPmremAtlasWidth, kPmremAtlasHeight);
  gAngle.glClearColor(0.0f, 0.0f, 0.0f, 1.0f);
  gAngle.glClear(GL_COLOR_BUFFER_BIT);
  gAngle.glViewport(0, 0, 3 * kPmremCubeSize, 2 * kPmremCubeSize);
  gAngle.glUseProgram(gAngle.pmremSkyProgram);
  drawPmremPlane(0);

  for (int lodOut = 1; lodOut < kPmremTotalLods; lodOut++) {
    const int lodIn = lodOut - 1;
    const float targetRoughness = static_cast<float>(lodOut) / static_cast<float>(kPmremTotalLods - 1);
    const float sourceRoughness = static_cast<float>(lodIn) / static_cast<float>(kPmremTotalLods - 1);
    const float incremental = std::sqrt(std::max(0.0f, targetRoughness * targetRoughness - sourceRoughness * sourceRoughness));
    const float adjustedRoughness = incremental * (targetRoughness * 1.25f);
    renderPmremGgxPass(pingPongTexture, textureName, lodOut, adjustedRoughness, static_cast<float>(kPmremLodMax - lodIn));
    renderPmremGgxPass(textureName, pingPongTexture, lodOut, 0.0f, static_cast<float>(kPmremLodMax - lodOut));
  }

  gAngle.glBindFramebuffer(GL_FRAMEBUFFER, 0);
  gAngle.glViewport(0, 0, gAngle.widthPx, gAngle.heightPx);
  gAngle.glDepthMask(GL_TRUE_VALUE);
  gAngle.glEnable(GL_DEPTH_TEST);
  std::fprintf(stderr, "[three-angle-metal] GPU PMREM CubeUV atlas rendered (%s)\n", usingHalfFloat ? "RGBA16F" : "RGBA8");
  return textureName;
}

static void pushVertex(
  std::vector<float> &vertices,
  Vec3 p,
  Vec3 n,
  Color4 c,
  float u0,
  float v0,
  float u1,
  float v1
) {
  vertices.push_back(p.x);
  vertices.push_back(p.y);
  vertices.push_back(p.z);
  vertices.push_back(n.x);
  vertices.push_back(n.y);
  vertices.push_back(n.z);
  vertices.push_back(c.r);
  vertices.push_back(c.g);
  vertices.push_back(c.b);
  vertices.push_back(c.a);
  vertices.push_back(u0);
  vertices.push_back(v0);
  vertices.push_back(u1);
  vertices.push_back(v1);
}

static GLuint compileShader(GLenum type, const char *source, const char *label) {
  const GLuint shader = gAngle.glCreateShader(type);
  gAngle.glShaderSource(shader, 1, &source, nullptr);
  gAngle.glCompileShader(shader);
  GLint ok = 0;
  gAngle.glGetShaderiv(shader, GL_COMPILE_STATUS, &ok);
  if (!ok) {
    GLchar info[1024] = {};
    GLsizei length = 0;
    gAngle.glGetShaderInfoLog(shader, sizeof(info) - 1, &length, info);
    std::fprintf(stderr, "[three-angle-metal] %s shader compile failed: %s\n", label, info);
    gAngle.glDeleteShader(shader);
    return 0;
  }
  return shader;
}

static bool loadGlSymbols() {
#define LOAD_GL(name, type) \
  gAngle.name = loadSymbol<type>(gAngle.gles, #name); \
  if (!gAngle.name) { \
    std::fprintf(stderr, "[three-angle-metal] missing GL symbol %s\n", #name); \
    return false; \
  }

  LOAD_GL(glAttachShader, PFNGLATTACHSHADERPROC)
  LOAD_GL(glActiveTexture, PFNGLACTIVETEXTUREPROC)
  LOAD_GL(glBindBuffer, PFNGLBINDBUFFERPROC)
  LOAD_GL(glBindFramebuffer, PFNGLBINDFRAMEBUFFERPROC)
  LOAD_GL(glBindTexture, PFNGLBINDTEXTUREPROC)
  LOAD_GL(glBindAttribLocation, PFNGLBINDATTRIBLOCATIONPROC)
  LOAD_GL(glBlendFunc, PFNGLBLENDFUNCPROC)
  LOAD_GL(glBufferData, PFNGLBUFFERDATAPROC)
  LOAD_GL(glClear, PFNGLCLEARPROC)
  LOAD_GL(glClearColor, PFNGLCLEARCOLORPROC)
  LOAD_GL(glCompileShader, PFNGLCOMPILESHADERPROC)
  LOAD_GL(glCheckFramebufferStatus, PFNGLCHECKFRAMEBUFFERSTATUSPROC)
  LOAD_GL(glCreateProgram, PFNGLCREATEPROGRAMPROC)
  LOAD_GL(glCreateShader, PFNGLCREATESHADERPROC)
  LOAD_GL(glCullFace, PFNGLCULLFACEPROC)
  LOAD_GL(glDeleteProgram, PFNGLDELETEPROGRAMPROC)
  LOAD_GL(glDeleteShader, PFNGLDELETESHADERPROC)
  LOAD_GL(glDepthMask, PFNGLDEPTHMASKPROC)
  LOAD_GL(glDisable, PFNGLDISABLEPROC)
  LOAD_GL(glDrawArrays, PFNGLDRAWARRAYSPROC)
  LOAD_GL(glDrawElements, PFNGLDRAWELEMENTSPROC)
  LOAD_GL(glEnable, PFNGLENABLEPROC)
  LOAD_GL(glEnableVertexAttribArray, PFNGLENABLEVERTEXATTRIBARRAYPROC)
  LOAD_GL(glFramebufferTexture2D, PFNGLFRAMEBUFFERTEXTURE2DPROC)
  LOAD_GL(glGenBuffers, PFNGLGENBUFFERSPROC)
  LOAD_GL(glGenFramebuffers, PFNGLGENFRAMEBUFFERSPROC)
  LOAD_GL(glGenTextures, PFNGLGENTEXTURESPROC)
  LOAD_GL(glGetProgramInfoLog, PFNGLGETPROGRAMINFOLOGPROC)
  LOAD_GL(glGetProgramiv, PFNGLGETPROGRAMIVPROC)
  LOAD_GL(glGetShaderInfoLog, PFNGLGETSHADERINFOLOGPROC)
  LOAD_GL(glGetShaderiv, PFNGLGETSHADERIVPROC)
  LOAD_GL(glGetUniformLocation, PFNGLGETUNIFORMLOCATIONPROC)
  LOAD_GL(glGenerateMipmap, PFNGLGENERATEMIPMAPPROC)
  LOAD_GL(glLinkProgram, PFNGLLINKPROGRAMPROC)
  LOAD_GL(glShaderSource, PFNGLSHADERSOURCEPROC)
  LOAD_GL(glTexImage2D, PFNGLTEXIMAGE2DPROC)
  LOAD_GL(glTexParameteri, PFNGLTEXPARAMETERIPROC)
  LOAD_GL(glUniform1f, PFNGLUNIFORM1FPROC)
  LOAD_GL(glUniform1i, PFNGLUNIFORM1IPROC)
  LOAD_GL(glUniform3f, PFNGLUNIFORM3FPROC)
  LOAD_GL(glUniformMatrix4fv, PFNGLUNIFORMMATRIX4FVPROC)
  LOAD_GL(glUseProgram, PFNGLUSEPROGRAMPROC)
  LOAD_GL(glVertexAttribPointer, PFNGLVERTEXATTRIBPOINTERPROC)
  LOAD_GL(glViewport, PFNGLVIEWPORTPROC)

#undef LOAD_GL
  return true;
}

static bool initRenderer() {
  if (gAngle.rendererReady) return true;
  if (!loadGlSymbols()) return false;

  static const char *vertexSource =
    "attribute vec3 aPosition;\n"
    "attribute vec3 aNormal;\n"
    "attribute vec4 aBaseColor;\n"
    "attribute vec2 aUv0;\n"
    "attribute vec2 aUv1;\n"
    "uniform mat4 uMvp;\n"
    "uniform mat4 uModel;\n"
    "varying vec3 vWorldPosition;\n"
    "varying vec3 vNormal;\n"
    "varying vec4 vBaseColor;\n"
    "varying vec2 vUv0;\n"
    "varying vec2 vUv1;\n"
    "void main() {\n"
    "  vec4 worldPosition = uModel * vec4(aPosition, 1.0);\n"
    "  vWorldPosition = worldPosition.xyz;\n"
    "  vNormal = normalize(mat3(uModel) * aNormal);\n"
    "  vBaseColor = aBaseColor;\n"
    "  vUv0 = aUv0;\n"
    "  vUv1 = aUv1;\n"
    "  gl_Position = uMvp * vec4(aPosition, 1.0);\n"
    "}\n";
  static const char *fragmentSource =
    "precision highp float;\n"
    "varying vec3 vWorldPosition;\n"
    "varying vec3 vNormal;\n"
    "varying vec4 vBaseColor;\n"
    "varying vec2 vUv0;\n"
    "varying vec2 vUv1;\n"
    "uniform vec3 uCameraPosition;\n"
    "uniform sampler2D uTexture;\n"
    "uniform sampler2D uMetallicRoughnessTexture;\n"
    "uniform sampler2D uOcclusionTexture;\n"
    "uniform sampler2D uEmissiveTexture;\n"
    "uniform sampler2D uPmremTexture;\n"
    "uniform float uUseTexture;\n"
    "uniform float uUseMetallicRoughnessTexture;\n"
    "uniform float uUseOcclusionTexture;\n"
    "uniform float uUseEmissiveTexture;\n"
    "uniform float uBaseColorTexCoord;\n"
    "uniform float uMetallicRoughnessTexCoord;\n"
    "uniform float uOcclusionTexCoord;\n"
    "uniform float uEmissiveTexCoord;\n"
    "uniform float uAlphaMode;\n"
    "uniform float uAlphaCutoff;\n"
    "uniform float uAlphaFactor;\n"
    "uniform float uMetallicFactor;\n"
    "uniform float uRoughnessFactor;\n"
    "uniform float uOcclusionStrength;\n"
    "uniform vec3 uEmissiveFactor;\n"
    "vec3 srgbToLinear(vec3 value) {\n"
    "  value = clamp(value, 0.0, 1.0);\n"
    "  vec3 cutoff = 1.0 - step(vec3(0.04045), value);\n"
    "  return mix(pow(value * 0.9478672986 + vec3(0.0521327014), vec3(2.4)), value * 0.0773993808, cutoff);\n"
    "}\n"
    "vec3 linearToSrgb(vec3 value) {\n"
    "  value = max(value, vec3(0.0));\n"
    "  vec3 cutoff = 1.0 - step(vec3(0.0031308), value);\n"
    "  return mix(pow(value, vec3(0.41666)) * 1.055 - vec3(0.055), value * 12.92, cutoff);\n"
    "}\n"
    "vec3 RRTAndODTFit(vec3 v) {\n"
    "  vec3 a = v * (v + 0.0245786) - 0.000090537;\n"
    "  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;\n"
    "  return a / b;\n"
    "}\n"
    "vec3 acesFilmicToneMapping(vec3 color) {\n"
    "  const mat3 ACESInputMat = mat3(\n"
    "    vec3(0.59719, 0.07600, 0.02840),\n"
    "    vec3(0.35458, 0.90834, 0.13383),\n"
    "    vec3(0.04823, 0.01566, 0.83777)\n"
    "  );\n"
    "  const mat3 ACESOutputMat = mat3(\n"
    "    vec3( 1.60475, -0.10208, -0.00327),\n"
    "    vec3(-0.53108,  1.10813, -0.07276),\n"
    "    vec3(-0.07367, -0.00605,  1.07602)\n"
    "  );\n"
    "  color *= 1.0 / 0.6;\n"
    "  color = ACESInputMat * color;\n"
    "  color = RRTAndODTFit(color);\n"
    "  color = ACESOutputMat * color;\n"
    "  return clamp(color, 0.0, 1.0);\n"
    "}\n"
    "vec3 skyRadiance(vec3 dir) {\n"
    "  float y = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);\n"
    "  vec3 horizon = srgbToLinear(vec3(0.82, 0.78, 0.70));\n"
    "  vec3 zenith = srgbToLinear(vec3(0.42, 0.67, 0.80));\n"
    "  vec3 sky = mix(horizon, zenith, smoothstep(0.0, 1.0, y));\n"
    "  vec3 sunDir = normalize(vec3(0.0, 0.173648, -0.984807));\n"
    "  float sun = pow(max(dot(dir, sunDir), 0.0), 128.0);\n"
    "  return sky + srgbToLinear(vec3(1.0, 0.84, 0.55)) * sun * 3.0;\n"
    "}\n"
    "vec3 pmremSkyRadianceApprox(vec3 dir, float roughness) {\n"
    "  float spread = clamp(roughness * roughness, 0.0, 1.0);\n"
    "  vec3 helper = abs(dir.y) > 0.92 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);\n"
    "  vec3 tangent = normalize(cross(helper, dir));\n"
    "  vec3 bitangent = normalize(cross(dir, tangent));\n"
    "  vec3 color = skyRadiance(dir) * 0.40;\n"
    "  color += skyRadiance(normalize(dir + tangent * spread)) * 0.14;\n"
    "  color += skyRadiance(normalize(dir - tangent * spread)) * 0.14;\n"
    "  color += skyRadiance(normalize(dir + bitangent * spread)) * 0.14;\n"
    "  color += skyRadiance(normalize(dir - bitangent * spread)) * 0.14;\n"
    "  color += skyRadiance(normalize(mix(dir, vec3(0.0, 1.0, 0.0), spread * 0.5))) * 0.04;\n"
    "  return color;\n"
    "}\n"
    "#define cubeUV_minMipLevel 4.0\n"
    "#define cubeUV_minTileSize 16.0\n"
    "#define CUBEUV_TEXEL_WIDTH 0.0013020833333333333\n"
    "#define CUBEUV_TEXEL_HEIGHT 0.0009765625\n"
    "#define CUBEUV_MAX_MIP 8.0\n"
    "float getFace(vec3 direction) {\n"
    "  vec3 absDirection = abs(direction);\n"
    "  float face = -1.0;\n"
    "  if (absDirection.x > absDirection.z) {\n"
    "    if (absDirection.x > absDirection.y) face = direction.x > 0.0 ? 0.0 : 3.0;\n"
    "    else face = direction.y > 0.0 ? 1.0 : 4.0;\n"
    "  } else {\n"
    "    if (absDirection.z > absDirection.y) face = direction.z > 0.0 ? 2.0 : 5.0;\n"
    "    else face = direction.y > 0.0 ? 1.0 : 4.0;\n"
    "  }\n"
    "  return face;\n"
    "}\n"
    "vec2 getUV(vec3 direction, float face) {\n"
    "  vec2 uv;\n"
    "  if (face == 0.0) uv = vec2(direction.z, direction.y) / abs(direction.x);\n"
    "  else if (face == 1.0) uv = vec2(-direction.x, -direction.z) / abs(direction.y);\n"
    "  else if (face == 2.0) uv = vec2(-direction.x, direction.y) / abs(direction.z);\n"
    "  else if (face == 3.0) uv = vec2(-direction.z, direction.y) / abs(direction.x);\n"
    "  else if (face == 4.0) uv = vec2(-direction.x, direction.z) / abs(direction.y);\n"
    "  else uv = vec2(direction.x, direction.y) / abs(direction.z);\n"
    "  return 0.5 * (uv + 1.0);\n"
    "}\n"
    "vec3 bilinearCubeUV(sampler2D envMap, vec3 direction, float mipInt) {\n"
    "  float face = getFace(direction);\n"
    "  float filterInt = max(cubeUV_minMipLevel - mipInt, 0.0);\n"
    "  mipInt = max(mipInt, cubeUV_minMipLevel);\n"
    "  float faceSize = exp2(mipInt);\n"
    "  vec2 uv = getUV(direction, face) * (faceSize - 2.0) + 1.0;\n"
    "  if (face > 2.0) {\n"
    "    uv.y += faceSize;\n"
    "    face -= 3.0;\n"
    "  }\n"
    "  uv.x += face * faceSize;\n"
    "  uv.x += filterInt * 3.0 * cubeUV_minTileSize;\n"
    "  uv.y += 4.0 * (exp2(CUBEUV_MAX_MIP) - faceSize);\n"
    "  uv.x *= CUBEUV_TEXEL_WIDTH;\n"
    "  uv.y *= CUBEUV_TEXEL_HEIGHT;\n"
    "  return texture2D(envMap, uv).rgb;\n"
    "}\n"
    "#define cubeUV_r0 1.0\n"
    "#define cubeUV_m0 -2.0\n"
    "#define cubeUV_r1 0.8\n"
    "#define cubeUV_m1 -1.0\n"
    "#define cubeUV_r4 0.4\n"
    "#define cubeUV_m4 2.0\n"
    "#define cubeUV_r5 0.305\n"
    "#define cubeUV_m5 3.0\n"
    "#define cubeUV_r6 0.21\n"
    "#define cubeUV_m6 4.0\n"
    "float roughnessToMip(float roughness) {\n"
    "  float mip = 0.0;\n"
    "  if (roughness >= cubeUV_r1) mip = (cubeUV_r0 - roughness) * (cubeUV_m1 - cubeUV_m0) / (cubeUV_r0 - cubeUV_r1) + cubeUV_m0;\n"
    "  else if (roughness >= cubeUV_r4) mip = (cubeUV_r1 - roughness) * (cubeUV_m4 - cubeUV_m1) / (cubeUV_r1 - cubeUV_r4) + cubeUV_m1;\n"
    "  else if (roughness >= cubeUV_r5) mip = (cubeUV_r4 - roughness) * (cubeUV_m5 - cubeUV_m4) / (cubeUV_r4 - cubeUV_r5) + cubeUV_m4;\n"
    "  else if (roughness >= cubeUV_r6) mip = (cubeUV_r5 - roughness) * (cubeUV_m6 - cubeUV_m5) / (cubeUV_r5 - cubeUV_r6) + cubeUV_m5;\n"
    "  else mip = -2.0 * log2(1.16 * roughness);\n"
    "  return mip;\n"
    "}\n"
    "vec4 textureCubeUV(sampler2D envMap, vec3 sampleDir, float roughness) {\n"
    "  float mip = clamp(roughnessToMip(roughness), cubeUV_m0, CUBEUV_MAX_MIP);\n"
    "  float mipF = fract(mip);\n"
    "  float mipInt = floor(mip);\n"
    "  vec3 color0 = bilinearCubeUV(envMap, sampleDir, mipInt);\n"
    "  if (mipF == 0.0) return vec4(color0, 1.0);\n"
    "  vec3 color1 = bilinearCubeUV(envMap, sampleDir, mipInt + 1.0);\n"
    "  return vec4(mix(color0, color1, mipF), 1.0);\n"
    "}\n"
    "vec3 pmremSkyRadiance(vec3 dir, float roughness) {\n"
    "  return textureCubeUV(uPmremTexture, normalize(dir), roughness).rgb;\n"
    "}\n"
    "float saturate(float value) { return clamp(value, 0.0, 1.0); }\n"
    "float pow2(float value) { return value * value; }\n"
    "float pow4(float value) { float v2 = value * value; return v2 * v2; }\n"
    "vec2 environmentBRDFApprox(float roughness, float dotNV) {\n"
    "  const vec4 c0 = vec4(-1.0, -0.0275, -0.572, 0.022);\n"
    "  const vec4 c1 = vec4(1.0, 0.0425, 1.04, -0.04);\n"
    "  vec4 r = roughness * c0 + c1;\n"
    "  float a004 = min(r.x * r.x, exp2(-9.28 * dotNV)) * r.x + r.y;\n"
    "  return vec2(-1.04, 1.04) * a004 + r.zw;\n"
    "}\n"
    "void computeMultiscattering(vec3 normal, vec3 viewDir, vec3 specularColor, float specularF90, float roughness, out vec3 singleScatter, out vec3 multiScatter) {\n"
    "  float dotNV = saturate(dot(normal, viewDir));\n"
    "  vec2 fab = environmentBRDFApprox(roughness, dotNV);\n"
    "  vec3 FssEss = specularColor * fab.x + specularF90 * fab.y;\n"
    "  float Ess = fab.x + fab.y;\n"
    "  float Ems = 1.0 - Ess;\n"
    "  vec3 Favg = specularColor + (1.0 - specularColor) * 0.0476190476;\n"
    "  vec3 Fms = FssEss * Favg / max(vec3(1.0e-4), vec3(1.0) - Ems * Favg);\n"
    "  singleScatter = FssEss;\n"
    "  multiScatter = Fms * Ems;\n"
    "}\n"
    "vec2 textureUv(float texCoord) { return texCoord < 0.5 ? vUv0 : vUv1; }\n"
    "void main() {\n"
    "  vec4 sampled = texture2D(uTexture, textureUv(uBaseColorTexCoord));\n"
    "  vec3 baseColor = srgbToLinear(vBaseColor.rgb);\n"
    "  baseColor = mix(baseColor, baseColor * srgbToLinear(sampled.rgb), uUseTexture);\n"
    "  float alpha = vBaseColor.a * mix(1.0, sampled.a, uUseTexture) * uAlphaFactor;\n"
    "  if (uAlphaMode < 0.5) {\n"
    "    alpha = 1.0;\n"
    "  } else if (uAlphaMode < 1.5) {\n"
    "    if (alpha < uAlphaCutoff) discard;\n"
    "    alpha = 1.0;\n"
    "  }\n"
    "  vec3 N = normalize(vNormal);\n"
    "  vec3 V = normalize(uCameraPosition - vWorldPosition);\n"
    "  vec3 R = reflect(-V, N);\n"
    "  vec4 metallicRoughnessSample = texture2D(uMetallicRoughnessTexture, textureUv(uMetallicRoughnessTexCoord));\n"
    "  float metallic = saturate(uMetallicFactor * mix(1.0, metallicRoughnessSample.b, uUseMetallicRoughnessTexture));\n"
    "  float roughness = clamp(uRoughnessFactor * mix(1.0, metallicRoughnessSample.g, uUseMetallicRoughnessTexture), 0.04, 1.0);\n"
    "  float ao = texture2D(uOcclusionTexture, textureUv(uOcclusionTexCoord)).r;\n"
    "  ao = mix(1.0, ao, uUseOcclusionTexture * uOcclusionStrength);\n"
    "  vec3 irradiance = pmremSkyRadiance(N, 1.0) * 3.14159265359;\n"
    "  vec3 radianceDirection = normalize(mix(R, N, pow4(roughness)));\n"
    "  vec3 radiance = pmremSkyRadiance(radianceDirection, roughness);\n"
    "  vec3 specularColor = mix(vec3(0.04), baseColor, metallic);\n"
    "  vec3 singleScatteringDielectric;\n"
    "  vec3 multiScatteringDielectric;\n"
    "  vec3 singleScatteringMetallic;\n"
    "  vec3 multiScatteringMetallic;\n"
    "  computeMultiscattering(N, V, specularColor, 1.0, roughness, singleScatteringDielectric, multiScatteringDielectric);\n"
    "  computeMultiscattering(N, V, baseColor, 1.0, roughness, singleScatteringMetallic, multiScatteringMetallic);\n"
    "  vec3 singleScattering = mix(singleScatteringDielectric, singleScatteringMetallic, metallic);\n"
    "  vec3 multiScattering = mix(multiScatteringDielectric, multiScatteringMetallic, metallic);\n"
    "  vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;\n"
    "  vec3 diffuse = baseColor * (1.0 - metallic) * (1.0 - totalScatteringDielectric) * irradiance * 0.31830988618;\n"
    "  vec3 specular = radiance * singleScattering + multiScattering * irradiance * 0.31830988618;\n"
    "  diffuse *= ao;\n"
    "  specular *= ao;\n"
    "  vec3 emissiveSample = srgbToLinear(texture2D(uEmissiveTexture, textureUv(uEmissiveTexCoord)).rgb);\n"
    "  vec3 emissive = mix(vec3(1.0), emissiveSample, uUseEmissiveTexture) * uEmissiveFactor;\n"
    "  vec3 color = diffuse + specular + emissive;\n"
    "  color = acesFilmicToneMapping(color);\n"
    "  gl_FragColor = vec4(linearToSrgb(color), alpha);\n"
    "}\n";

  const GLuint vertex = compileShader(GL_VERTEX_SHADER, vertexSource, "vertex");
  const GLuint fragment = compileShader(GL_FRAGMENT_SHADER, fragmentSource, "fragment");
  if (!vertex || !fragment) return false;

  gAngle.program = gAngle.glCreateProgram();
  gAngle.glAttachShader(gAngle.program, vertex);
  gAngle.glAttachShader(gAngle.program, fragment);
  gAngle.glBindAttribLocation(gAngle.program, 0, "aPosition");
  gAngle.glBindAttribLocation(gAngle.program, 1, "aNormal");
  gAngle.glBindAttribLocation(gAngle.program, 2, "aBaseColor");
  gAngle.glBindAttribLocation(gAngle.program, 3, "aUv0");
  gAngle.glBindAttribLocation(gAngle.program, 4, "aUv1");
  gAngle.glLinkProgram(gAngle.program);

  GLint linked = 0;
  gAngle.glGetProgramiv(gAngle.program, GL_LINK_STATUS, &linked);
  gAngle.glDeleteShader(vertex);
  gAngle.glDeleteShader(fragment);
  if (!linked) {
    GLchar info[1024] = {};
    GLsizei length = 0;
    gAngle.glGetProgramInfoLog(gAngle.program, sizeof(info) - 1, &length, info);
    std::fprintf(stderr, "[three-angle-metal] shader program link failed: %s\n", info);
    gAngle.glDeleteProgram(gAngle.program);
    gAngle.program = 0;
    return false;
  }

  static const char *skyVertexSource =
    "attribute vec2 aCorner;\n"
    "varying vec2 vUv;\n"
    "void main() {\n"
    "  vUv = aCorner * 0.5 + 0.5;\n"
    "  gl_Position = vec4(aCorner, 0.0, 1.0);\n"
    "}\n";
  static const char *skyFragmentSource =
    "precision mediump float;\n"
    "varying vec2 vUv;\n"
    "vec3 srgbToLinear(vec3 value) { return pow(max(value, vec3(0.0)), vec3(2.2)); }\n"
    "vec3 linearToSrgb(vec3 value) { return pow(max(value, vec3(0.0)), vec3(1.0 / 2.2)); }\n"
    "vec3 RRTAndODTFit(vec3 v) {\n"
    "  vec3 a = v * (v + 0.0245786) - 0.000090537;\n"
    "  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;\n"
    "  return a / b;\n"
    "}\n"
    "vec3 acesFilmicToneMapping(vec3 color) {\n"
    "  const mat3 ACESInputMat = mat3(\n"
    "    vec3(0.59719, 0.07600, 0.02840),\n"
    "    vec3(0.35458, 0.90834, 0.13383),\n"
    "    vec3(0.04823, 0.01566, 0.83777)\n"
    "  );\n"
    "  const mat3 ACESOutputMat = mat3(\n"
    "    vec3( 1.60475, -0.10208, -0.00327),\n"
    "    vec3(-0.53108,  1.10813, -0.07276),\n"
    "    vec3(-0.07367, -0.00605,  1.07602)\n"
    "  );\n"
    "  color *= 1.0 / 0.6;\n"
    "  color = ACESInputMat * color;\n"
    "  color = RRTAndODTFit(color);\n"
    "  color = ACESOutputMat * color;\n"
    "  return clamp(color, 0.0, 1.0);\n"
    "}\n"
    "void main() {\n"
    "  vec3 horizon = srgbToLinear(vec3(0.82, 0.78, 0.70));\n"
    "  vec3 zenith = srgbToLinear(vec3(0.42, 0.67, 0.80));\n"
    "  vec3 color = mix(horizon, zenith, smoothstep(0.0, 1.0, vUv.y));\n"
    "  float sun = 1.0 - smoothstep(0.0, 0.62, distance(vUv, vec2(0.92, 0.92)));\n"
    "  color += srgbToLinear(vec3(1.0, 0.92, 0.74)) * sun * sun * 2.8;\n"
    "  color = acesFilmicToneMapping(color);\n"
    "  gl_FragColor = vec4(linearToSrgb(color), 1.0);\n"
    "}\n";
  const GLuint skyVertex = compileShader(GL_VERTEX_SHADER, skyVertexSource, "sky vertex");
  const GLuint skyFragment = compileShader(GL_FRAGMENT_SHADER, skyFragmentSource, "sky fragment");
  if (!skyVertex || !skyFragment) return false;
  gAngle.skyProgram = gAngle.glCreateProgram();
  gAngle.glAttachShader(gAngle.skyProgram, skyVertex);
  gAngle.glAttachShader(gAngle.skyProgram, skyFragment);
  gAngle.glBindAttribLocation(gAngle.skyProgram, 0, "aCorner");
  gAngle.glLinkProgram(gAngle.skyProgram);
  GLint skyLinked = 0;
  gAngle.glGetProgramiv(gAngle.skyProgram, GL_LINK_STATUS, &skyLinked);
  gAngle.glDeleteShader(skyVertex);
  gAngle.glDeleteShader(skyFragment);
  if (!skyLinked) {
    GLchar info[1024] = {};
    GLsizei length = 0;
    gAngle.glGetProgramInfoLog(gAngle.skyProgram, sizeof(info) - 1, &length, info);
    std::fprintf(stderr, "[three-angle-metal] sky shader program link failed: %s\n", info);
    gAngle.glDeleteProgram(gAngle.skyProgram);
    gAngle.skyProgram = 0;
    return false;
  }
  const float skyVertices[] = {
    -1.0f, -1.0f,
     1.0f, -1.0f,
    -1.0f,  1.0f,
    -1.0f,  1.0f,
     1.0f, -1.0f,
     1.0f,  1.0f,
  };
  gAngle.glGenBuffers(1, &gAngle.skyVbo);
  gAngle.glBindBuffer(GL_ARRAY_BUFFER, gAngle.skyVbo);
  gAngle.glBufferData(GL_ARRAY_BUFFER, sizeof(skyVertices), skyVertices, GL_STATIC_DRAW);

  gAngle.pmremTexture = createPmremTexture();
  if (gAngle.pmremTexture == 0) {
    std::fprintf(stderr, "[three-angle-metal] PMREM CubeUV texture creation failed\n");
    return false;
  }

  gAngle.uMvp = gAngle.glGetUniformLocation(gAngle.program, "uMvp");
  gAngle.uModel = gAngle.glGetUniformLocation(gAngle.program, "uModel");
  gAngle.uCameraPosition = gAngle.glGetUniformLocation(gAngle.program, "uCameraPosition");
  gAngle.uTexture = gAngle.glGetUniformLocation(gAngle.program, "uTexture");
  gAngle.uMetallicRoughnessTexture = gAngle.glGetUniformLocation(gAngle.program, "uMetallicRoughnessTexture");
  gAngle.uOcclusionTexture = gAngle.glGetUniformLocation(gAngle.program, "uOcclusionTexture");
  gAngle.uEmissiveTexture = gAngle.glGetUniformLocation(gAngle.program, "uEmissiveTexture");
  gAngle.uPmremTexture = gAngle.glGetUniformLocation(gAngle.program, "uPmremTexture");
  gAngle.uUseTexture = gAngle.glGetUniformLocation(gAngle.program, "uUseTexture");
  gAngle.uUseMetallicRoughnessTexture = gAngle.glGetUniformLocation(gAngle.program, "uUseMetallicRoughnessTexture");
  gAngle.uUseOcclusionTexture = gAngle.glGetUniformLocation(gAngle.program, "uUseOcclusionTexture");
  gAngle.uUseEmissiveTexture = gAngle.glGetUniformLocation(gAngle.program, "uUseEmissiveTexture");
  gAngle.uBaseColorTexCoord = gAngle.glGetUniformLocation(gAngle.program, "uBaseColorTexCoord");
  gAngle.uMetallicRoughnessTexCoord = gAngle.glGetUniformLocation(gAngle.program, "uMetallicRoughnessTexCoord");
  gAngle.uOcclusionTexCoord = gAngle.glGetUniformLocation(gAngle.program, "uOcclusionTexCoord");
  gAngle.uEmissiveTexCoord = gAngle.glGetUniformLocation(gAngle.program, "uEmissiveTexCoord");
  gAngle.uAlphaMode = gAngle.glGetUniformLocation(gAngle.program, "uAlphaMode");
  gAngle.uAlphaCutoff = gAngle.glGetUniformLocation(gAngle.program, "uAlphaCutoff");
  gAngle.uAlphaFactor = gAngle.glGetUniformLocation(gAngle.program, "uAlphaFactor");
  gAngle.uMetallicFactor = gAngle.glGetUniformLocation(gAngle.program, "uMetallicFactor");
  gAngle.uRoughnessFactor = gAngle.glGetUniformLocation(gAngle.program, "uRoughnessFactor");
  gAngle.uOcclusionStrength = gAngle.glGetUniformLocation(gAngle.program, "uOcclusionStrength");
  gAngle.uEmissiveFactor = gAngle.glGetUniformLocation(gAngle.program, "uEmissiveFactor");
  gAngle.glEnable(GL_DEPTH_TEST);
  gAngle.rendererReady = true;
  smokeLog("[three-angle-metal] GLES3 renderer ready through ANGLE/Metal with GPU CubeUV PMREM atlas");
  std::fprintf(stderr, "[three-angle-metal] GLES3 renderer ready through ANGLE/Metal with GPU CubeUV PMREM atlas\n");
  return true;
}

static void drawSkyBackground() {
  if (gAngle.skyProgram == 0 || gAngle.skyVbo == 0) return;
  gAngle.glDisable(GL_BLEND);
  gAngle.glDisable(GL_CULL_FACE);
  gAngle.glDisable(GL_DEPTH_TEST);
  gAngle.glDepthMask(GL_FALSE_VALUE);
  gAngle.glUseProgram(gAngle.skyProgram);
  gAngle.glBindBuffer(GL_ARRAY_BUFFER, gAngle.skyVbo);
  gAngle.glEnableVertexAttribArray(0);
  gAngle.glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE_VALUE, static_cast<GLsizei>(2 * sizeof(float)), reinterpret_cast<const void *>(0));
  gAngle.glDrawArrays(GL_TRIANGLES, 0, 6);
  gAngle.glEnable(GL_DEPTH_TEST);
  gAngle.glDepthMask(GL_TRUE_VALUE);
}

static void drawUploadedVertices(
  const SceneFrame &frame,
  const UploadedMeshBuffer &buffer,
  const Mat4 &modelMatrix,
  bool clearFrame
) {
  if (buffer.vbo == 0 || buffer.vertexCount <= 0) return;
  const Mat4 model = worldModelForFrame(frame, modelMatrix);
  const Mat4 mvp = multiply(viewProjectionForFrame(frame), model);
  const GLsizei stride = static_cast<GLsizei>(14 * sizeof(float));
  const Color4 background = colorFromHex(frame.backgroundColor);
  const bool blended = buffer.alphaMode == 2;

  gAngle.glViewport(0, 0, gAngle.widthPx, gAngle.heightPx);
  if (clearFrame) {
    gAngle.glClearColor(background.r, background.g, background.b, background.a);
    gAngle.glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    drawSkyBackground();
  }
  if (blended) {
    gAngle.glEnable(GL_BLEND);
    gAngle.glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    gAngle.glDepthMask(GL_FALSE_VALUE);
  } else {
    gAngle.glDisable(GL_BLEND);
    gAngle.glDepthMask(GL_TRUE_VALUE);
  }
  if (buffer.sideMode == 2) {
    gAngle.glDisable(GL_CULL_FACE);
  } else {
    gAngle.glEnable(GL_CULL_FACE);
    gAngle.glCullFace(buffer.sideMode == 1 ? GL_FRONT : GL_BACK);
  }
  gAngle.glUseProgram(gAngle.program);
  gAngle.glUniformMatrix4fv(gAngle.uMvp, 1, GL_FALSE_VALUE, mvp.m);
  gAngle.glUniformMatrix4fv(gAngle.uModel, 1, GL_FALSE_VALUE, model.m);
  gAngle.glUniform3f(gAngle.uCameraPosition, frame.cameraX, frame.cameraY, frame.cameraZ);
  gAngle.glActiveTexture(GL_TEXTURE0);
  if (buffer.texture != 0) {
    gAngle.glBindTexture(GL_TEXTURE_2D, buffer.texture);
    gAngle.glUniform1i(gAngle.uTexture, 0);
    gAngle.glUniform1f(gAngle.uUseTexture, 1.0f);
  } else {
    gAngle.glBindTexture(GL_TEXTURE_2D, 0);
    gAngle.glUniform1f(gAngle.uUseTexture, 0.0f);
  }
  gAngle.glActiveTexture(GL_TEXTURE1);
  if (buffer.metallicRoughnessTexture != 0) {
    gAngle.glBindTexture(GL_TEXTURE_2D, buffer.metallicRoughnessTexture);
    gAngle.glUniform1i(gAngle.uMetallicRoughnessTexture, 1);
    gAngle.glUniform1f(gAngle.uUseMetallicRoughnessTexture, 1.0f);
  } else {
    gAngle.glBindTexture(GL_TEXTURE_2D, 0);
    gAngle.glUniform1f(gAngle.uUseMetallicRoughnessTexture, 0.0f);
  }
  gAngle.glActiveTexture(GL_TEXTURE2);
  if (buffer.occlusionTexture != 0) {
    gAngle.glBindTexture(GL_TEXTURE_2D, buffer.occlusionTexture);
    gAngle.glUniform1i(gAngle.uOcclusionTexture, 2);
    gAngle.glUniform1f(gAngle.uUseOcclusionTexture, 1.0f);
  } else {
    gAngle.glBindTexture(GL_TEXTURE_2D, 0);
    gAngle.glUniform1f(gAngle.uUseOcclusionTexture, 0.0f);
  }
  gAngle.glActiveTexture(GL_TEXTURE3);
  if (buffer.emissiveTexture != 0) {
    gAngle.glBindTexture(GL_TEXTURE_2D, buffer.emissiveTexture);
    gAngle.glUniform1i(gAngle.uEmissiveTexture, 3);
    gAngle.glUniform1f(gAngle.uUseEmissiveTexture, 1.0f);
  } else {
    gAngle.glBindTexture(GL_TEXTURE_2D, 0);
    gAngle.glUniform1f(gAngle.uUseEmissiveTexture, 0.0f);
  }
  gAngle.glActiveTexture(GL_TEXTURE4);
  gAngle.glBindTexture(GL_TEXTURE_2D, gAngle.pmremTexture);
  gAngle.glUniform1i(gAngle.uPmremTexture, 4);
  gAngle.glUniform1f(gAngle.uBaseColorTexCoord, static_cast<float>(buffer.baseColorTexCoord));
  gAngle.glUniform1f(gAngle.uMetallicRoughnessTexCoord, static_cast<float>(buffer.metallicRoughnessTexCoord));
  gAngle.glUniform1f(gAngle.uOcclusionTexCoord, static_cast<float>(buffer.occlusionTexCoord));
  gAngle.glUniform1f(gAngle.uEmissiveTexCoord, static_cast<float>(buffer.emissiveTexCoord));
  gAngle.glUniform1f(gAngle.uAlphaMode, static_cast<float>(buffer.alphaMode));
  gAngle.glUniform1f(gAngle.uAlphaCutoff, buffer.alphaCutoff);
  gAngle.glUniform1f(gAngle.uAlphaFactor, buffer.alphaFactor);
  gAngle.glUniform1f(gAngle.uMetallicFactor, buffer.metallicFactor);
  gAngle.glUniform1f(gAngle.uRoughnessFactor, buffer.roughnessFactor);
  gAngle.glUniform1f(gAngle.uOcclusionStrength, buffer.occlusionStrength);
  gAngle.glUniform3f(gAngle.uEmissiveFactor, buffer.emissiveR, buffer.emissiveG, buffer.emissiveB);
  gAngle.glBindBuffer(GL_ARRAY_BUFFER, buffer.vbo);
  gAngle.glEnableVertexAttribArray(0);
  gAngle.glEnableVertexAttribArray(1);
  gAngle.glEnableVertexAttribArray(2);
  gAngle.glEnableVertexAttribArray(3);
  gAngle.glEnableVertexAttribArray(4);
  gAngle.glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE_VALUE, stride, reinterpret_cast<const void *>(0));
  gAngle.glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE_VALUE, stride, reinterpret_cast<const void *>(3 * sizeof(float)));
  gAngle.glVertexAttribPointer(2, 4, GL_FLOAT, GL_FALSE_VALUE, stride, reinterpret_cast<const void *>(6 * sizeof(float)));
  gAngle.glVertexAttribPointer(3, 2, GL_FLOAT, GL_FALSE_VALUE, stride, reinterpret_cast<const void *>(10 * sizeof(float)));
  gAngle.glVertexAttribPointer(4, 2, GL_FLOAT, GL_FALSE_VALUE, stride, reinterpret_cast<const void *>(12 * sizeof(float)));
  if (buffer.ibo != 0 && buffer.indexCount > 0) {
    gAngle.glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, buffer.ibo);
    gAngle.glDrawElements(GL_TRIANGLES, buffer.indexCount, GL_UNSIGNED_SHORT, reinterpret_cast<const void *>(0));
  } else {
    gAngle.glDrawArrays(GL_TRIANGLES, 0, buffer.vertexCount);
  }
}

static Color4 colorForMeshBufferVertex(
  const SceneFrame &frame,
  const std::vector<gea_f32> &normals,
  const std::vector<gea_f32> &colors,
  int vertexIndex,
  Color4 materialColor
) {
  const std::size_t colorBase = static_cast<std::size_t>(std::max(vertexIndex, 0)) * 3;
  const std::size_t colorBase4 = static_cast<std::size_t>(std::max(vertexIndex, 0)) * 4;
  if (colorBase4 + 3 < colors.size()) {
    return Color4{
      static_cast<float>(colors[colorBase4]),
      static_cast<float>(colors[colorBase4 + 1]),
      static_cast<float>(colors[colorBase4 + 2]),
      static_cast<float>(colors[colorBase4 + 3]),
    };
  }
  if (colorBase + 2 < colors.size()) {
    return Color4{
      static_cast<float>(colors[colorBase]),
      static_cast<float>(colors[colorBase + 1]),
      static_cast<float>(colors[colorBase + 2]),
      1.0f,
    };
  }
  if (frame.materialCode != 2) return materialColor;
  const std::size_t normalBase = static_cast<std::size_t>(std::max(vertexIndex, 0)) * 3;
  if (normalBase + 2 < normals.size()) {
    return Color4{
      static_cast<float>(normals[normalBase]) * 0.5f + 0.5f,
      static_cast<float>(normals[normalBase + 1]) * 0.5f + 0.5f,
      static_cast<float>(normals[normalBase + 2]) * 0.5f + 0.5f,
      1.0f,
    };
  }
  return materialColor;
}

static Vec3 normalForMeshBufferVertex(
  const std::vector<gea_f32> &normals,
  int vertexIndex
) {
  if (vertexIndex < 0) return Vec3{0.0f, 1.0f, 0.0f};
  const std::size_t normalBase = static_cast<std::size_t>(vertexIndex) * 3;
  if (normalBase + 2 >= normals.size()) return Vec3{0.0f, 1.0f, 0.0f};
  return normalize(
    Vec3{
      static_cast<float>(normals[normalBase]),
      static_cast<float>(normals[normalBase + 1]),
      static_cast<float>(normals[normalBase + 2]),
    },
    Vec3{0.0f, 1.0f, 0.0f}
  );
}

static void uvForMeshBufferVertex(
  const std::vector<gea_f32> &uvs,
  int vertexIndex,
  float &u,
  float &v
) {
  u = 0.0f;
  v = 0.0f;
  if (vertexIndex < 0) return;
  const std::size_t uvBase = static_cast<std::size_t>(vertexIndex) * 2;
  if (uvBase + 1 >= uvs.size()) return;
  u = static_cast<float>(uvs[uvBase]);
  v = static_cast<float>(uvs[uvBase + 1]);
}

static void pushMeshBufferVertex(
  std::vector<float> &vertices,
  const SceneFrame &frame,
  const std::vector<gea_f32> &positions,
  const std::vector<gea_f32> &normals,
  const std::vector<gea_f32> &colors,
  const std::vector<gea_f32> &uvs0,
  const std::vector<gea_f32> &uvs1,
  int vertexIndex,
  Color4 materialColor
) {
  if (vertexIndex < 0) return;
  const std::size_t positionBase = static_cast<std::size_t>(vertexIndex) * 3;
  if (positionBase + 2 >= positions.size()) return;
  const Vec3 position{
    static_cast<float>(positions[positionBase]),
    static_cast<float>(positions[positionBase + 1]),
    static_cast<float>(positions[positionBase + 2]),
  };
  float u0 = 0.0f;
  float v0 = 0.0f;
  float u1 = 0.0f;
  float v1 = 0.0f;
  uvForMeshBufferVertex(uvs0, vertexIndex, u0, v0);
  uvForMeshBufferVertex(uvs1.empty() ? uvs0 : uvs1, vertexIndex, u1, v1);
  pushVertex(
    vertices,
    position,
    normalForMeshBufferVertex(normals, vertexIndex),
    colorForMeshBufferVertex(frame, normals, colors, vertexIndex, materialColor),
    u0,
    v0,
    u1,
    v1
  );
}

static std::vector<float> createMeshVertexBuffer(
  const SceneFrame &frame,
  const std::vector<gea_f32> &positions,
  const std::vector<gea_f32> &normals,
  const std::vector<gea_f32> &colors,
  const std::vector<gea_f32> &uvs0,
  const std::vector<gea_f32> &uvs1
) {
  std::vector<float> vertices;
  const int vertexCount = static_cast<int>(positions.size() / 3);
  const Color4 materialColor = colorFromHex(frame.materialColor);
  vertices.reserve(static_cast<std::size_t>(vertexCount) * 14);
  for (int vertexIndex = 0; vertexIndex < vertexCount; vertexIndex++) {
    pushMeshBufferVertex(
      vertices,
      frame,
      positions,
      normals,
      colors,
      uvs0,
      uvs1,
      vertexIndex,
      materialColor
    );
  }
  return vertices;
}

static std::vector<std::uint16_t> createMeshElementIndices(
  const std::vector<gea_f32> &indices,
  int vertexCount
) {
  std::vector<std::uint16_t> elements;
  if (indices.empty() || vertexCount <= 0 || vertexCount > 65535) return elements;
  elements.reserve(indices.size());
  for (double indexValue : indices) {
    const int index = static_cast<int>(indexValue);
    if (index < 0 || index >= vertexCount) {
      elements.clear();
      return elements;
    }
    elements.push_back(static_cast<std::uint16_t>(index));
  }
  return elements;
}

static const UploadedMeshBuffer *findUploadedMeshBuffer(int handle) {
  for (const UploadedMeshBuffer &buffer : gAngle.meshBuffers) {
    if (buffer.handle == handle) return &buffer;
  }
  return nullptr;
}

static UploadedMeshBuffer *findMutableUploadedMeshBuffer(int handle) {
  for (UploadedMeshBuffer &buffer : gAngle.meshBuffers) {
    if (buffer.handle == handle) return &buffer;
  }
  return nullptr;
}

static const UploadedTexture *findUploadedTexture(int handle) {
  for (const UploadedTexture &texture : gAngle.textures) {
    if (texture.handle == handle) return &texture;
  }
  return nullptr;
}

static const UploadedMeshScene *findUploadedMeshScene(int handle) {
  for (const UploadedMeshScene &scene : gAngle.meshScenes) {
    if (scene.handle == handle) return &scene;
  }
  return nullptr;
}

static UploadedMeshScene *findMutableUploadedMeshScene(int handle) {
  for (UploadedMeshScene &scene : gAngle.meshScenes) {
    if (scene.handle == handle) return &scene;
  }
  return nullptr;
}

static SceneFrame makeSceneFrame(
  double demoCode,
  double materialCode,
  double materialColor,
  double backgroundColor,
  double cameraFov,
  double cameraAspect,
  double cameraNear,
  double cameraFar,
  double cameraX,
  double cameraY,
  double cameraZ,
  double cameraLookAtX,
  double cameraLookAtY,
  double cameraLookAtZ,
  double rotationX,
  double rotationY,
  double rotationZ,
  double timestampMs
) {
  SceneFrame frame;
  frame.demoCode = static_cast<int>(demoCode);
  frame.materialCode = static_cast<int>(materialCode);
  frame.materialColor = static_cast<float>(materialColor);
  frame.backgroundColor = static_cast<float>(backgroundColor);
  frame.cameraFov = static_cast<float>(cameraFov);
  frame.cameraAspect = static_cast<float>(cameraAspect);
  frame.cameraNear = static_cast<float>(cameraNear);
  frame.cameraFar = static_cast<float>(cameraFar);
  frame.cameraX = static_cast<float>(cameraX);
  frame.cameraY = static_cast<float>(cameraY);
  frame.cameraZ = static_cast<float>(cameraZ);
  frame.cameraLookAtX = static_cast<float>(cameraLookAtX);
  frame.cameraLookAtY = static_cast<float>(cameraLookAtY);
  frame.cameraLookAtZ = static_cast<float>(cameraLookAtZ);
  frame.rotationX = static_cast<float>(rotationX);
  frame.rotationY = static_cast<float>(rotationY);
  frame.rotationZ = static_cast<float>(rotationZ);
  frame.timestampMs = timestampMs;
  return frame;
}

static bool makeCurrentForRender(const char *label) {
  if (gAngle.eglMakeCurrent(gAngle.display, gAngle.surface, gAngle.surface, gAngle.context) != EGL_FALSE_VALUE) {
    return true;
  }
  logEglFailure(label);
  return false;
}

static void logFirstBufferFrameIfNeeded(
  double demoCode,
  double materialCode,
  std::size_t vertexCount,
  std::size_t normalCount,
  std::size_t indexCount
) {
  if (!gAngle.loggedFirstBufferFrame) {
    smokeLog(
      "[three-angle-metal] first native buffer scene frame: demo=%d material=%d vertices=%zu normals=%zu indices=%zu",
      static_cast<int>(demoCode),
      static_cast<int>(materialCode),
      vertexCount,
      normalCount,
      indexCount
    );
    std::fprintf(
      stderr,
      "[three-angle-metal] first native buffer scene frame: demo=%d material=%d vertices=%zu normals=%zu indices=%zu\n",
      static_cast<int>(demoCode),
      static_cast<int>(materialCode),
      vertexCount,
      normalCount,
      indexCount
    );
    gAngle.loggedFirstBufferFrame = true;
  }
  const int demoIndex = static_cast<int>(demoCode);
  if (
    demoIndex >= 0 &&
    static_cast<std::size_t>(demoIndex) < (sizeof(gAngle.loggedBufferDemo) / sizeof(gAngle.loggedBufferDemo[0])) &&
    !gAngle.loggedBufferDemo[demoIndex]
  ) {
    smokeLog(
      "[three-angle-metal] first native buffer demo frame: demo=%d material=%d vertices=%zu normals=%zu indices=%zu",
      demoIndex,
      static_cast<int>(materialCode),
      vertexCount,
      normalCount,
      indexCount
    );
    std::fprintf(
      stderr,
      "[three-angle-metal] first native buffer demo frame: demo=%d material=%d vertices=%zu normals=%zu indices=%zu\n",
      demoIndex,
      static_cast<int>(materialCode),
      vertexCount,
      normalCount,
      indexCount
    );
    gAngle.loggedBufferDemo[demoIndex] = true;
  }
}

static void recordNativeFrameFps(
  const SceneFrame &frame,
  int demoCode,
  std::size_t vertexCount,
  std::size_t indexCount,
  const char *label
) {
  if (frame.timestampMs <= 0.0) return;
  if (gAngle.fpsWindowStartMs <= 0.0) gAngle.fpsWindowStartMs = frame.timestampMs;
  gAngle.fpsFrameCount++;
  const double elapsedMs = frame.timestampMs - gAngle.fpsWindowStartMs;
  if (elapsedMs < 3000.0) return;
  const double fps = static_cast<double>(gAngle.fpsFrameCount) * 1000.0 / elapsedMs;
  smokeLog(
    "[three-angle-metal] native %s fps=%.2f demo=%d vertices=%zu indices=%zu",
    label,
    fps,
    demoCode,
    vertexCount,
    indexCount
  );
  gAngle.fpsFrameCount = 0;
  gAngle.fpsWindowStartMs = frame.timestampMs;
}

static Vec3 vec3At(const std::vector<float> &values, std::size_t offset, Vec3 fallback) {
  if (offset + 2 >= values.size()) return fallback;
  return Vec3{values[offset], values[offset + 1], values[offset + 2]};
}

static Quat quatAt(const std::vector<float> &values, std::size_t offset, Quat fallback) {
  if (offset + 3 >= values.size()) return fallback;
  return Quat{values[offset], values[offset + 1], values[offset + 2], values[offset + 3]};
}

static float animationTimeForFrame(UploadedMeshScene &scene, double timestampMs) {
  if (scene.animationDuration <= 0.00001f) return 0.0f;
  const double safeTimestampMs = std::max(0.0, timestampMs);
  if (scene.animationStartTimestampMs < 0.0) {
    scene.animationStartTimestampMs = safeTimestampMs;
  }
  const double elapsedMs = std::max(0.0, safeTimestampMs - scene.animationStartTimestampMs);
  double timeSeconds = std::fmod(elapsedMs * 0.001, static_cast<double>(scene.animationDuration));
  if (timeSeconds < 0.0) timeSeconds += scene.animationDuration;
  return static_cast<float>(timeSeconds);
}

static void animationFrameForChannel(
  const UploadedMeshScene &scene,
  const AnimationChannel &channel,
  float timeSeconds,
  int &lo,
  int &hi,
  float &mixAmount
) {
  lo = channel.inputOffset;
  hi = channel.inputOffset;
  mixAmount = 0.0f;
  if (channel.inputCount <= 1 || channel.inputOffset < 0) return;
  const int first = channel.inputOffset;
  const int last = channel.inputOffset + channel.inputCount - 1;
  if (last < first || static_cast<std::size_t>(last) >= scene.animationTimes.size()) return;
  if (timeSeconds <= scene.animationTimes[static_cast<std::size_t>(first)]) return;
  if (timeSeconds >= scene.animationTimes[static_cast<std::size_t>(last)]) {
    lo = last;
    hi = last;
    return;
  }
  int low = first;
  int high = last;
  while (low + 1 < high) {
    const int mid = (low + high) / 2;
    if (scene.animationTimes[static_cast<std::size_t>(mid)] <= timeSeconds) {
      low = mid;
    } else {
      high = mid;
    }
  }
  lo = low;
  hi = high;
  const float duration = scene.animationTimes[static_cast<std::size_t>(hi)] -
                         scene.animationTimes[static_cast<std::size_t>(lo)];
  mixAmount = duration > 0.0f
    ? (timeSeconds - scene.animationTimes[static_cast<std::size_t>(lo)]) / duration
    : 0.0f;
  mixAmount = std::max(0.0f, std::min(1.0f, mixAmount));
}

static void updateAnimatedScene(UploadedMeshScene &scene, const SceneFrame &frame) {
  if (!scene.animated || scene.nodes.empty()) return;
  const std::size_t nodeCount = scene.nodes.size();
  std::vector<Vec3> translations(nodeCount);
  std::vector<Quat> rotations(nodeCount);
  std::vector<Vec3> scales(nodeCount);
  for (std::size_t nodeIndex = 0; nodeIndex < nodeCount; nodeIndex++) {
    translations[nodeIndex] = scene.nodes[nodeIndex].baseTranslation;
    rotations[nodeIndex] = scene.nodes[nodeIndex].baseRotation;
    scales[nodeIndex] = scene.nodes[nodeIndex].baseScale;
  }
  const float timeSeconds = animationTimeForFrame(scene, frame.timestampMs);
  for (const AnimationChannel &channel : scene.animationChannels) {
    if (channel.nodeIndex < 0 || static_cast<std::size_t>(channel.nodeIndex) >= nodeCount) continue;
    if (channel.inputCount <= 0) continue;
    const int components = channel.pathCode == 1 ? 4 : 3;
    int lo = 0;
    int hi = 0;
    float mixAmount = 0.0f;
    animationFrameForChannel(scene, channel, timeSeconds, lo, hi, mixAmount);
    const std::size_t loValueOffset = static_cast<std::size_t>(channel.outputOffset + (lo - channel.inputOffset) * components);
    const std::size_t hiValueOffset = static_cast<std::size_t>(channel.outputOffset + (hi - channel.inputOffset) * components);
    if (channel.pathCode == 0) {
      translations[static_cast<std::size_t>(channel.nodeIndex)] = lerp(
        vec3At(scene.animationValues, loValueOffset, translations[static_cast<std::size_t>(channel.nodeIndex)]),
        vec3At(scene.animationValues, hiValueOffset, translations[static_cast<std::size_t>(channel.nodeIndex)]),
        mixAmount
      );
    } else if (channel.pathCode == 1) {
      rotations[static_cast<std::size_t>(channel.nodeIndex)] = slerpQuat(
        quatAt(scene.animationValues, loValueOffset, rotations[static_cast<std::size_t>(channel.nodeIndex)]),
        quatAt(scene.animationValues, hiValueOffset, rotations[static_cast<std::size_t>(channel.nodeIndex)]),
        mixAmount
      );
    } else if (channel.pathCode == 2) {
      scales[static_cast<std::size_t>(channel.nodeIndex)] = lerp(
        vec3At(scene.animationValues, loValueOffset, scales[static_cast<std::size_t>(channel.nodeIndex)]),
        vec3At(scene.animationValues, hiValueOffset, scales[static_cast<std::size_t>(channel.nodeIndex)]),
        mixAmount
      );
    }
  }
  scene.nodeWorldMatrices.resize(nodeCount);
  for (std::size_t nodeIndex = 0; nodeIndex < nodeCount; nodeIndex++) {
    const AnimatedNode &node = scene.nodes[nodeIndex];
    const Mat4 local = node.trsMode == 0
      ? node.baseMatrix
      : matFromTrs(translations[nodeIndex], rotations[nodeIndex], scales[nodeIndex]);
    const Mat4 parentWorld = node.parent >= 0 && static_cast<std::size_t>(node.parent) < nodeIndex
      ? scene.nodeWorldMatrices[static_cast<std::size_t>(node.parent)]
      : scene.modelMatrix;
    scene.nodeWorldMatrices[nodeIndex] = multiply(parentWorld, local);
  }
}

static void updateSceneBindWorldMatrices(UploadedMeshScene &scene) {
  const std::size_t nodeCount = scene.nodes.size();
  scene.nodeBindWorldMatrices.resize(nodeCount);
  for (std::size_t nodeIndex = 0; nodeIndex < nodeCount; nodeIndex++) {
    const AnimatedNode &node = scene.nodes[nodeIndex];
    const Mat4 local = node.trsMode == 0
      ? node.baseMatrix
      : matFromTrs(node.baseTranslation, node.baseRotation, node.baseScale);
    const Mat4 parentWorld = node.parent >= 0 && static_cast<std::size_t>(node.parent) < nodeIndex
      ? scene.nodeBindWorldMatrices[static_cast<std::size_t>(node.parent)]
      : scene.modelMatrix;
    scene.nodeBindWorldMatrices[nodeIndex] = multiply(parentWorld, local);
  }
  scene.nodeWorldMatrices = scene.nodeBindWorldMatrices;
}

static Mat4 modelMatrixForScenePart(const UploadedMeshScene &scene, std::size_t partIndex) {
  if (!scene.animated) return identity();
  if (partIndex >= scene.meshBufferNodeIndices.size()) return scene.modelMatrix;
  const int nodeIndex = scene.meshBufferNodeIndices[partIndex];
  if (nodeIndex < 0 || static_cast<std::size_t>(nodeIndex) >= scene.nodeWorldMatrices.size()) return scene.modelMatrix;
  return scene.nodeWorldMatrices[static_cast<std::size_t>(nodeIndex)];
}

static Vec3 sourceVec3At(const std::vector<float> &values, std::size_t vertexIndex, Vec3 fallback) {
  const std::size_t offset = vertexIndex * 3;
  if (offset + 2 >= values.size()) return fallback;
  return Vec3{values[offset], values[offset + 1], values[offset + 2]};
}

static Color4 sourceColorAt(const std::vector<float> &values, std::size_t vertexIndex) {
  const std::size_t offset4 = vertexIndex * 4;
  if (offset4 + 3 < values.size()) {
    return Color4{values[offset4], values[offset4 + 1], values[offset4 + 2], values[offset4 + 3]};
  }
  const std::size_t offset3 = vertexIndex * 3;
  if (offset3 + 2 < values.size()) {
    return Color4{values[offset3], values[offset3 + 1], values[offset3 + 2], 1.0f};
  }
  return Color4{};
}

static void sourceUvAt(const std::vector<float> &values, std::size_t vertexIndex, float &u, float &v) {
  const std::size_t offset = vertexIndex * 2;
  if (offset + 1 >= values.size()) {
    u = 0.0f;
    v = 0.0f;
    return;
  }
  u = values[offset];
  v = values[offset + 1];
}

static void updateSkinnedMeshBuffer(
  UploadedMeshScene &scene,
  UploadedMeshBuffer &buffer,
  const Mat4 &meshCurrentMatrix
) {
  (void)meshCurrentMatrix;
  if (!buffer.skinned || buffer.vbo == 0) return;
  if (buffer.skinIndex < 0 || static_cast<std::size_t>(buffer.skinIndex) >= scene.skins.size()) return;
  if (buffer.meshNodeIndex < 0 || static_cast<std::size_t>(buffer.meshNodeIndex) >= scene.nodeBindWorldMatrices.size()) return;
  const UploadedSkin &skin = scene.skins[static_cast<std::size_t>(buffer.skinIndex)];
  const std::size_t vertexCount = buffer.sourcePositions.size() / 3;
  if (vertexCount == 0 ||
      buffer.sourceJoints0.size() < vertexCount * 4 ||
      buffer.sourceWeights0.size() < vertexCount * 4) {
    return;
  }

  const Mat4 bindMatrix = scene.nodeBindWorldMatrices[static_cast<std::size_t>(buffer.meshNodeIndex)];
  const Mat4 bindMatrixInverse = inverse(bindMatrix);
  buffer.skinnedVertices.clear();
  buffer.skinnedVertices.reserve(vertexCount * 14);

  for (std::size_t vertexIndex = 0; vertexIndex < vertexCount; vertexIndex++) {
    const Vec3 basePosition = sourceVec3At(buffer.sourcePositions, vertexIndex, Vec3{0.0f, 0.0f, 0.0f});
    const Vec3 baseNormal = sourceVec3At(buffer.sourceNormals, vertexIndex, Vec3{0.0f, 1.0f, 0.0f});
    const Vec3 bindPosition = transformPoint(bindMatrix, basePosition);
    const Vec3 bindNormal = transformDirection(bindMatrix, baseNormal);
    Vec3 skinnedPosition{0.0f, 0.0f, 0.0f};
    Vec3 skinnedNormal{0.0f, 0.0f, 0.0f};
    float totalWeight = 0.0f;
    for (int influence = 0; influence < 4; influence++) {
      const std::size_t influenceOffset = vertexIndex * 4 + static_cast<std::size_t>(influence);
      const int jointSlot = buffer.sourceJoints0[influenceOffset];
      const float weight = buffer.sourceWeights0[influenceOffset];
      if (weight <= 0.000001f ||
          jointSlot < 0 ||
          static_cast<std::size_t>(jointSlot) >= skin.jointNodeIndices.size() ||
          static_cast<std::size_t>(jointSlot) >= skin.inverseBindMatrices.size()) {
        continue;
      }
      const int jointNodeIndex = skin.jointNodeIndices[static_cast<std::size_t>(jointSlot)];
      if (jointNodeIndex < 0 || static_cast<std::size_t>(jointNodeIndex) >= scene.nodeWorldMatrices.size()) continue;
      const Mat4 boneMatrix = multiply(
        scene.nodeWorldMatrices[static_cast<std::size_t>(jointNodeIndex)],
        skin.inverseBindMatrices[static_cast<std::size_t>(jointSlot)]
      );
      const Vec3 influencedPosition = transformPoint(boneMatrix, bindPosition);
      const Vec3 influencedNormal = transformDirection(boneMatrix, bindNormal);
      skinnedPosition.x += influencedPosition.x * weight;
      skinnedPosition.y += influencedPosition.y * weight;
      skinnedPosition.z += influencedPosition.z * weight;
      skinnedNormal.x += influencedNormal.x * weight;
      skinnedNormal.y += influencedNormal.y * weight;
      skinnedNormal.z += influencedNormal.z * weight;
      totalWeight += weight;
    }
    if (totalWeight <= 0.000001f) {
      skinnedPosition = basePosition;
      skinnedNormal = baseNormal;
    } else {
      const float invWeight = 1.0f / totalWeight;
      skinnedPosition.x *= invWeight;
      skinnedPosition.y *= invWeight;
      skinnedPosition.z *= invWeight;
      skinnedNormal.x *= invWeight;
      skinnedNormal.y *= invWeight;
      skinnedNormal.z *= invWeight;
      skinnedPosition = transformPoint(bindMatrixInverse, skinnedPosition);
      skinnedNormal = normalize(transformDirection(bindMatrixInverse, skinnedNormal), baseNormal);
    }
    float u0 = 0.0f;
    float v0 = 0.0f;
    float u1 = 0.0f;
    float v1 = 0.0f;
    sourceUvAt(buffer.sourceUv0s, vertexIndex, u0, v0);
    sourceUvAt(buffer.sourceUv1s.empty() ? buffer.sourceUv0s : buffer.sourceUv1s, vertexIndex, u1, v1);
    pushVertex(
      buffer.skinnedVertices,
      skinnedPosition,
      skinnedNormal,
      sourceColorAt(buffer.sourceColors, vertexIndex),
      u0,
      v0,
      u1,
      v1
    );
  }

  gAngle.glBindBuffer(GL_ARRAY_BUFFER, buffer.vbo);
  gAngle.glBufferData(
    GL_ARRAY_BUFFER,
    static_cast<GLsizeiptr>(buffer.skinnedVertices.size() * sizeof(float)),
    buffer.skinnedVertices.data(),
    GL_STATIC_DRAW
  );
  buffer.vertexCount = static_cast<GLsizei>(buffer.skinnedVertices.size() / 14);
}

static void swapRenderedFrame(const char *label) {
  if (gAngle.eglSwapBuffers(gAngle.display, gAngle.surface) == EGL_FALSE_VALUE) {
    logEglFailure(label);
  }
}

static void unpremultiplyRgbaPixels(std::vector<unsigned char> &pixels) {
  for (std::size_t offset = 0; offset + 3 < pixels.size(); offset += 4) {
    const unsigned int alpha = pixels[offset + 3];
    if (alpha == 0 || alpha == 255) continue;
    pixels[offset] = static_cast<unsigned char>(std::min(255u, (static_cast<unsigned int>(pixels[offset]) * 255u) / alpha));
    pixels[offset + 1] = static_cast<unsigned char>(std::min(255u, (static_cast<unsigned int>(pixels[offset + 1]) * 255u) / alpha));
    pixels[offset + 2] = static_cast<unsigned char>(std::min(255u, (static_cast<unsigned int>(pixels[offset + 2]) * 255u) / alpha));
  }
}

static void dilateTransparentRgb(std::vector<unsigned char> &pixels, int width, int height) {
  if (width <= 0 || height <= 0 || pixels.empty()) return;
  std::vector<unsigned char> source = pixels;
  std::vector<unsigned char> next = pixels;
  static constexpr int maxPasses = 32;
  for (int pass = 0; pass < maxPasses; pass++) {
    source = pixels;
    next = pixels;
    bool changed = false;
    for (int y = 0; y < height; y++) {
      for (int x = 0; x < width; x++) {
        const std::size_t offset = (static_cast<std::size_t>(y) * static_cast<std::size_t>(width) + static_cast<std::size_t>(x)) * 4;
        if (source[offset + 3] != 0) continue;
        unsigned int r = 0;
        unsigned int g = 0;
        unsigned int b = 0;
        unsigned int count = 0;
        for (int dy = -1; dy <= 1; dy++) {
          const int ny = y + dy;
          if (ny < 0 || ny >= height) continue;
          for (int dx = -1; dx <= 1; dx++) {
            const int nx = x + dx;
            if ((dx == 0 && dy == 0) || nx < 0 || nx >= width) continue;
            const std::size_t neighbor = (static_cast<std::size_t>(ny) * static_cast<std::size_t>(width) + static_cast<std::size_t>(nx)) * 4;
            if (source[neighbor + 3] == 0) continue;
            r += source[neighbor];
            g += source[neighbor + 1];
            b += source[neighbor + 2];
            count++;
          }
        }
        if (count == 0) continue;
        next[offset] = static_cast<unsigned char>(r / count);
        next[offset + 1] = static_cast<unsigned char>(g / count);
        next[offset + 2] = static_cast<unsigned char>(b / count);
        changed = true;
      }
    }
    pixels.swap(next);
    if (!changed) break;
  }
}

static void alphaRangeForPixels(const std::vector<unsigned char> &pixels, int &minAlpha, int &maxAlpha) {
  minAlpha = 255;
  maxAlpha = 0;
  for (std::size_t offset = 3; offset < pixels.size(); offset += 4) {
    const int alpha = static_cast<int>(pixels[offset]);
    minAlpha = std::min(minAlpha, alpha);
    maxAlpha = std::max(maxAlpha, alpha);
  }
  if (pixels.empty()) {
    minAlpha = 0;
    maxAlpha = 0;
  }
}

static bool loadCgImagePixels(
  CGImageRef cgImage,
  std::vector<unsigned char> &pixels,
  int &width,
  int &height
) {
  if (!cgImage) return false;
  width = static_cast<int>(CGImageGetWidth(cgImage));
  height = static_cast<int>(CGImageGetHeight(cgImage));
  if (width <= 0 || height <= 0) return false;

  pixels.assign(static_cast<std::size_t>(width) * static_cast<std::size_t>(height) * 4, 0);
  CGColorSpaceRef colorSpace = CGColorSpaceCreateDeviceRGB();
  if (!colorSpace) return false;

  CGContextRef context = CGBitmapContextCreate(
    pixels.data(),
    static_cast<std::size_t>(width),
    static_cast<std::size_t>(height),
    8,
    static_cast<std::size_t>(width) * 4,
    colorSpace,
    static_cast<CGBitmapInfo>(kCGImageAlphaPremultipliedLast) |
      static_cast<CGBitmapInfo>(kCGBitmapByteOrder32Big)
  );
  CGColorSpaceRelease(colorSpace);
  if (!context) return false;

  CGContextSetBlendMode(context, kCGBlendModeCopy);
  CGContextDrawImage(context, CGRectMake(0, 0, width, height), cgImage);
  CGContextRelease(context);
  unpremultiplyRgbaPixels(pixels);
  dilateTransparentRgb(pixels, width, height);
  return true;
}

static bool loadImagePixels(
  const std::string &path,
  std::vector<unsigned char> &pixels,
  int &width,
  int &height
) {
  @autoreleasepool {
    NSString *nsPath = [NSString stringWithUTF8String:path.c_str()];
    NSURL *url = [NSURL fileURLWithPath:nsPath];
    CGImageSourceRef source = CGImageSourceCreateWithURL((__bridge CFURLRef)url, nullptr);
    if (!source) return false;
    CGImageRef cgImage = CGImageSourceCreateImageAtIndex(source, 0, nullptr);
    CFRelease(source);
    const bool ok = loadCgImagePixels(cgImage, pixels, width, height);
    if (cgImage) CGImageRelease(cgImage);
    return ok;
  }
}

static bool loadImagePixelsFromBytes(
  const std::uint8_t *bytes,
  std::size_t byteCount,
  std::vector<unsigned char> &pixels,
  int &width,
  int &height
) {
  if (!bytes || byteCount == 0 || byteCount > static_cast<std::size_t>(std::numeric_limits<CFIndex>::max())) return false;
  @autoreleasepool {
    CFDataRef data = CFDataCreate(kCFAllocatorDefault, bytes, static_cast<CFIndex>(byteCount));
    if (!data) return false;
    CGImageSourceRef source = CGImageSourceCreateWithData(data, nullptr);
    CFRelease(data);
    if (!source) return false;
    CGImageRef cgImage = CGImageSourceCreateImageAtIndex(source, 0, nullptr);
    CFRelease(source);
    const bool ok = loadCgImagePixels(cgImage, pixels, width, height);
    if (cgImage) CGImageRelease(cgImage);
    return ok;
  }
}

static double uploadTexturePixels(
  const std::string &label,
  const std::vector<unsigned char> &pixels,
  int width,
  int height
) {
  if (!gAngle.ready || !gAngle.rendererReady) return 0.0;
  if (gAngle.eglMakeCurrent(gAngle.display, gAngle.surface, gAngle.surface, gAngle.context) == EGL_FALSE_VALUE) {
    logEglFailure("eglMakeCurrent(texture-create)");
    return 0.0;
  }

  int minAlpha = 0;
  int maxAlpha = 0;
  alphaRangeForPixels(pixels, minAlpha, maxAlpha);

  GLuint textureName = 0;
  gAngle.glGenTextures(1, &textureName);
  if (textureName == 0) return 0.0;
  gAngle.glActiveTexture(GL_TEXTURE0);
  gAngle.glBindTexture(GL_TEXTURE_2D, textureName);
  gAngle.glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR_MIPMAP_LINEAR);
  gAngle.glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
  gAngle.glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_REPEAT);
  gAngle.glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_REPEAT);
  gAngle.glTexImage2D(
    GL_TEXTURE_2D,
    0,
    GL_RGBA,
    static_cast<GLsizei>(width),
    static_cast<GLsizei>(height),
    0,
    GL_RGBA,
    GL_UNSIGNED_BYTE,
    pixels.data()
  );
  gAngle.glGenerateMipmap(GL_TEXTURE_2D);

  UploadedTexture uploaded;
  uploaded.handle = gAngle.nextTextureHandle++;
  uploaded.texture = textureName;
  uploaded.width = width;
  uploaded.height = height;
  uploaded.path = label;
  gAngle.textures.push_back(uploaded);
  smokeLog(
    "[three-angle-metal] uploaded native texture: handle=%d size=%dx%d alpha=%d..%d path=%s",
    uploaded.handle,
    uploaded.width,
    uploaded.height,
    minAlpha,
    maxAlpha,
    uploaded.path.c_str()
  );
  return static_cast<double>(uploaded.handle);
}

static double createUploadedTexture(const std::string &imagePath) {
  std::vector<unsigned char> pixels;
  int width = 0;
  int height = 0;
  if (!loadImagePixels(imagePath, pixels, width, height)) {
    smokeLog("[three-angle-metal] failed to load native texture: %s", imagePath.c_str());
    std::fprintf(stderr, "[three-angle-metal] failed to load native texture: %s\n", imagePath.c_str());
    return 0.0;
  }
  return uploadTexturePixels(imagePath, pixels, width, height);
}

static double createUploadedMeshBuffer(
  double demoCode,
  double materialCode,
  double materialColor,
  const std::vector<gea_f32> &positions,
  const std::vector<gea_f32> &normals,
  const std::vector<gea_f32> &indices,
  const std::vector<gea_f32> &colors,
  const std::vector<gea_f32> &uvs0,
  const std::vector<gea_f32> &uvs1,
  double textureHandle,
  double metallicRoughnessTextureHandle,
  double occlusionTextureHandle,
  double emissiveTextureHandle,
  double baseColorTexCoord,
  double metallicRoughnessTexCoord,
  double occlusionTexCoord,
  double emissiveTexCoord,
  double metallicFactor,
  double roughnessFactor,
  double occlusionStrength,
  double emissiveR,
  double emissiveG,
  double emissiveB,
  double sideMode,
  double alphaMode,
  double alphaCutoff,
  double alphaFactor
) {
  if (!gAngle.ready || !gAngle.rendererReady) return 0.0;
  if (gAngle.eglMakeCurrent(gAngle.display, gAngle.surface, gAngle.surface, gAngle.context) == EGL_FALSE_VALUE) {
    logEglFailure("eglMakeCurrent(buffer-create)");
    return 0.0;
  }

  SceneFrame frame;
  frame.demoCode = static_cast<int>(demoCode);
  frame.materialCode = static_cast<int>(materialCode);
  frame.materialColor = static_cast<float>(materialColor);
  const int sourceVertexCount = static_cast<int>(positions.size() / 3);
  const std::vector<float> vertices = createMeshVertexBuffer(frame, positions, normals, colors, uvs0, uvs1);
  const std::vector<std::uint16_t> elements = createMeshElementIndices(indices, sourceVertexCount);
  if (vertices.empty()) return 0.0;

  GLuint vbo = 0;
  gAngle.glGenBuffers(1, &vbo);
  gAngle.glBindBuffer(GL_ARRAY_BUFFER, vbo);
  gAngle.glBufferData(
    GL_ARRAY_BUFFER,
    static_cast<GLsizeiptr>(vertices.size() * sizeof(float)),
    vertices.data(),
    GL_STATIC_DRAW
  );
  GLuint ibo = 0;
  if (!elements.empty()) {
    gAngle.glGenBuffers(1, &ibo);
    gAngle.glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, ibo);
    gAngle.glBufferData(
      GL_ELEMENT_ARRAY_BUFFER,
      static_cast<GLsizeiptr>(elements.size() * sizeof(std::uint16_t)),
      elements.data(),
      GL_STATIC_DRAW
    );
  }

  const int resolvedTextureHandle = static_cast<int>(textureHandle);
  const int resolvedMetallicRoughnessTextureHandle = static_cast<int>(metallicRoughnessTextureHandle);
  const int resolvedOcclusionTextureHandle = static_cast<int>(occlusionTextureHandle);
  const int resolvedEmissiveTextureHandle = static_cast<int>(emissiveTextureHandle);
  const UploadedTexture *uploadedTexture = findUploadedTexture(resolvedTextureHandle);
  const UploadedTexture *uploadedMetallicRoughnessTexture = findUploadedTexture(resolvedMetallicRoughnessTextureHandle);
  const UploadedTexture *uploadedOcclusionTexture = findUploadedTexture(resolvedOcclusionTextureHandle);
  const UploadedTexture *uploadedEmissiveTexture = findUploadedTexture(resolvedEmissiveTextureHandle);
  UploadedMeshBuffer buffer;
  buffer.handle = gAngle.nextMeshBufferHandle++;
  buffer.demoCode = static_cast<int>(demoCode);
  buffer.materialCode = static_cast<int>(materialCode);
  buffer.vbo = vbo;
  buffer.ibo = ibo;
  buffer.texture = uploadedTexture ? uploadedTexture->texture : 0;
  buffer.metallicRoughnessTexture = uploadedMetallicRoughnessTexture ? uploadedMetallicRoughnessTexture->texture : 0;
  buffer.occlusionTexture = uploadedOcclusionTexture ? uploadedOcclusionTexture->texture : 0;
  buffer.emissiveTexture = uploadedEmissiveTexture ? uploadedEmissiveTexture->texture : 0;
  buffer.textureHandle = uploadedTexture ? uploadedTexture->handle : 0;
  buffer.metallicRoughnessTextureHandle = uploadedMetallicRoughnessTexture ? uploadedMetallicRoughnessTexture->handle : 0;
  buffer.occlusionTextureHandle = uploadedOcclusionTexture ? uploadedOcclusionTexture->handle : 0;
  buffer.emissiveTextureHandle = uploadedEmissiveTexture ? uploadedEmissiveTexture->handle : 0;
  buffer.baseColorTexCoord = static_cast<int>(baseColorTexCoord);
  buffer.metallicRoughnessTexCoord = static_cast<int>(metallicRoughnessTexCoord);
  buffer.occlusionTexCoord = static_cast<int>(occlusionTexCoord);
  buffer.emissiveTexCoord = static_cast<int>(emissiveTexCoord);
  buffer.alphaMode = static_cast<int>(alphaMode);
  buffer.alphaCutoff = static_cast<float>(alphaCutoff);
  buffer.alphaFactor = static_cast<float>(alphaFactor);
  buffer.metallicFactor = static_cast<float>(metallicFactor);
  buffer.roughnessFactor = static_cast<float>(roughnessFactor);
  buffer.occlusionStrength = static_cast<float>(occlusionStrength);
  buffer.emissiveR = static_cast<float>(emissiveR);
  buffer.emissiveG = static_cast<float>(emissiveG);
  buffer.emissiveB = static_cast<float>(emissiveB);
  buffer.sideMode = static_cast<int>(sideMode);
  buffer.vertexCount = static_cast<GLsizei>(vertices.size() / 14);
  buffer.indexCount = static_cast<GLsizei>(elements.size());
  buffer.sourceVertexCount = positions.size() / 3;
  buffer.sourceNormalCount = normals.size() / 3;
  buffer.sourceIndexCount = indices.size();
  gAngle.meshBuffers.push_back(buffer);

  smokeLog(
    "[three-angle-metal] uploaded native mesh buffer: handle=%d demo=%d material=%d vertices=%zu normals=%zu indices=%zu textures=%d/%d/%d/%d texCoords=%d/%d/%d/%d sideMode=%d alphaMode=%d alphaCutoff=%.3f metallic=%.3f roughness=%.3f",
    buffer.handle,
    buffer.demoCode,
    buffer.materialCode,
    buffer.sourceVertexCount,
    buffer.sourceNormalCount,
    buffer.sourceIndexCount,
    buffer.textureHandle,
    buffer.metallicRoughnessTextureHandle,
    buffer.occlusionTextureHandle,
    buffer.emissiveTextureHandle,
    buffer.baseColorTexCoord,
    buffer.metallicRoughnessTexCoord,
    buffer.occlusionTexCoord,
    buffer.emissiveTexCoord,
    buffer.sideMode,
    buffer.alphaMode,
    buffer.alphaCutoff,
    buffer.metallicFactor,
    buffer.roughnessFactor
  );
  return static_cast<double>(buffer.handle);
}

extern "C" bool gea_three_angle_host_attach(
  gea::apple::AppKit::NSView view,
  double width,
  double height,
  double devicePixelRatio
) {
  smokeLog("[three-angle-metal] attach requested");
  if (gAngle.ready) return true;

  static const char *const eglPaths[] = {
    "/Applications/Visual Studio Code.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Libraries/libEGL.dylib",
    "/Applications/Cursor.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Libraries/libEGL.dylib",
    "/Applications/Google Chrome.app/Contents/Frameworks/Google Chrome Framework.framework/Versions/149.0.7827.201/Libraries/libEGL.dylib",
    "/Applications/Google Chrome.app/Contents/Frameworks/Google Chrome Framework.framework/Versions/149.0.7827.197/Libraries/libEGL.dylib",
    nullptr,
  };
  static const char *const glesPaths[] = {
    "/Applications/Visual Studio Code.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Libraries/libGLESv2.dylib",
    "/Applications/Cursor.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Libraries/libGLESv2.dylib",
    "/Applications/Google Chrome.app/Contents/Frameworks/Google Chrome Framework.framework/Versions/149.0.7827.201/Libraries/libGLESv2.dylib",
    "/Applications/Google Chrome.app/Contents/Frameworks/Google Chrome Framework.framework/Versions/149.0.7827.197/Libraries/libGLESv2.dylib",
    nullptr,
  };

  gAngle.egl = openFirst("GEA_ANGLE_EGL_DYLIB", eglPaths);
  gAngle.gles = openFirst("GEA_ANGLE_GLES_DYLIB", glesPaths);
  if (!gAngle.egl || !gAngle.gles) {
    smokeLog("[three-angle-metal] ANGLE libEGL/libGLESv2 were not found");
    std::fprintf(stderr, "[three-angle-metal] ANGLE libEGL/libGLESv2 were not found\n");
    return false;
  }

  auto eglGetProcAddress = loadSymbol<PFNEGLGETPROCADDRESS>(gAngle.egl, "eglGetProcAddress");
  auto eglInitialize = loadSymbol<PFNEGLINITIALIZEPROC>(gAngle.egl, "eglInitialize");
  auto eglBindAPI = loadSymbol<PFNEGLBINDAPIPROC>(gAngle.egl, "eglBindAPI");
  auto eglChooseConfig = loadSymbol<PFNEGLCHOOSECONFIGPROC>(gAngle.egl, "eglChooseConfig");
  gAngle.eglCreateWindowSurface = loadSymbol<PFNEGLCREATEWINDOWSURFACEPROC>(gAngle.egl, "eglCreateWindowSurface");
  auto eglCreatePbufferSurface = loadSymbol<PFNEGLCREATEPBUFFERSURFACEPROC>(gAngle.egl, "eglCreatePbufferSurface");
  auto eglCreateContext = loadSymbol<PFNEGLCREATECONTEXTPROC>(gAngle.egl, "eglCreateContext");
  gAngle.eglDestroySurface = loadSymbol<PFNEGLDESTROYSURFACEPROC>(gAngle.egl, "eglDestroySurface");
  gAngle.eglGetError = loadSymbol<PFNEGLGETERRORPROC>(gAngle.egl, "eglGetError");
  gAngle.eglMakeCurrent = loadSymbol<PFNEGLMAKECURRENTPROC>(gAngle.egl, "eglMakeCurrent");
  gAngle.eglSwapBuffers = loadSymbol<PFNEGLSWAPBUFFERSPROC>(gAngle.egl, "eglSwapBuffers");

  if (!eglGetProcAddress || !eglInitialize || !eglBindAPI || !eglChooseConfig ||
      !eglCreateContext || !gAngle.eglMakeCurrent || !gAngle.eglSwapBuffers) {
    smokeLog("[three-angle-metal] one or more required EGL symbols were missing");
    std::fprintf(stderr, "[three-angle-metal] one or more required EGL symbols were missing\n");
    return false;
  }

  auto eglGetPlatformDisplayEXT =
    reinterpret_cast<PFNEGLGETPLATFORMDISPLAYEXTPROC>(eglGetProcAddress("eglGetPlatformDisplayEXT"));
  if (!eglGetPlatformDisplayEXT) {
    smokeLog("[three-angle-metal] eglGetPlatformDisplayEXT unavailable");
    std::fprintf(stderr, "[three-angle-metal] eglGetPlatformDisplayEXT unavailable\n");
    return false;
  }

  const EGLint displayAttrs[] = {
    EGL_PLATFORM_ANGLE_TYPE_ANGLE,
    EGL_PLATFORM_ANGLE_TYPE_METAL_ANGLE,
    EGL_NONE,
  };
  gAngle.display = eglGetPlatformDisplayEXT(EGL_PLATFORM_ANGLE_ANGLE, EGL_DEFAULT_DISPLAY, displayAttrs);
  if (gAngle.display == EGL_NO_DISPLAY) {
    logEglFailure("eglGetPlatformDisplayEXT");
    return false;
  }

  EGLint major = 0;
  EGLint minor = 0;
  if (eglInitialize(gAngle.display, &major, &minor) == EGL_FALSE_VALUE) {
    logEglFailure("eglInitialize");
    return false;
  }
  if (eglBindAPI(EGL_OPENGL_ES_API) == EGL_FALSE_VALUE) {
    logEglFailure("eglBindAPI");
    return false;
  }

  const EGLint configAttrs[] = {
    EGL_SURFACE_TYPE, EGL_WINDOW_BIT | EGL_PBUFFER_BIT,
    EGL_RENDERABLE_TYPE, EGL_OPENGL_ES3_BIT | EGL_OPENGL_ES2_BIT,
    EGL_RED_SIZE, 8,
    EGL_GREEN_SIZE, 8,
    EGL_BLUE_SIZE, 8,
    EGL_ALPHA_SIZE, 8,
    EGL_DEPTH_SIZE, 24,
    EGL_NONE,
  };
  EGLConfig config = nullptr;
  EGLint configCount = 0;
  if (eglChooseConfig(gAngle.display, configAttrs, &config, 1, &configCount) == EGL_FALSE_VALUE || configCount < 1) {
    logEglFailure("eglChooseConfig");
    return false;
  }
  gAngle.config = config;

  NSView *containerView = (__bridge NSView *)gea::apple::objc::object(view.handle);
  containerView.wantsLayer = YES;
  containerView.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
  [containerView layoutSubtreeIfNeeded];

  GeaAngleMetalHostView *nativeView = [[GeaAngleMetalHostView alloc] initWithFrame:containerView.bounds];
  [containerView addSubview:nativeView];
  gAngle.hostView = nativeView;
  gAngle.devicePixelRatio = devicePixelRatio > 0.0 ? devicePixelRatio : 1.0;

  const double fallbackAspect = width > 0.0 && height > 0.0 ? width / height : 1.0;

  nativeView.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
  NSRect targetBounds = resolvedHostBounds(nativeView);
  if (targetBounds.size.width > 0.0 && targetBounds.size.height > 0.0) {
    NSRect targetFrame = NSMakeRect(0.0, 0.0, targetBounds.size.width, targetBounds.size.height);
    nativeView.frame = targetFrame;
    nativeView.bounds = targetFrame;
  }
  [nativeView layoutSubtreeIfNeeded];

  const CGFloat scale = backingScaleForHostView(nativeView);
  gAngle.devicePixelRatio = static_cast<double>(scale);
  const NSRect layerBounds = nativeView.bounds;
  const int initialWidthPx = std::max(1, static_cast<int>(std::round(layerBounds.size.width * scale)));
  const int initialHeightPx = std::max(1, static_cast<int>(std::round(layerBounds.size.height * scale)));

  CAMetalLayer *metalLayer = [nativeView.layer isKindOfClass:CAMetalLayer.class]
    ? (CAMetalLayer *)nativeView.layer
    : [CAMetalLayer layer];
  metalLayer.frame = layerBounds;
  metalLayer.bounds = layerBounds;
  metalLayer.contentsScale = scale;
  metalLayer.drawableSize = CGSizeMake(initialWidthPx, initialHeightPx);
  metalLayer.opaque = YES;
  metalLayer.backgroundColor = NSColor.blackColor.CGColor;
  metalLayer.autoresizingMask = kCALayerWidthSizable | kCALayerHeightSizable;
  metalLayer.needsDisplayOnBoundsChange = YES;
  metalLayer.presentsWithTransaction = NO;
  metalLayer.displaySyncEnabled = YES;
  if (nativeView.layer != metalLayer) nativeView.layer = metalLayer;
  gAngle.metalLayer = metalLayer;

  syncHostViewSize(fallbackAspect);
  [nativeView displayIfNeeded];
  [nativeView layoutSubtreeIfNeeded];
  [CATransaction flush];

  if (gAngle.eglCreateWindowSurface) {
    gAngle.surface = gAngle.eglCreateWindowSurface(gAngle.display, config, (__bridge EGLNativeWindowType)metalLayer, nullptr);
  }
  if (gAngle.surface == EGL_NO_SURFACE && eglCreatePbufferSurface) {
    logEglFailure("eglCreateWindowSurface");
    const EGLint surfaceAttrs[] = {
      EGL_WIDTH, static_cast<EGLint>(gAngle.widthPx),
      EGL_HEIGHT, static_cast<EGLint>(gAngle.heightPx),
      EGL_NONE,
    };
    gAngle.surface = eglCreatePbufferSurface(gAngle.display, config, surfaceAttrs);
  }
  if (gAngle.surface == EGL_NO_SURFACE) {
    logEglFailure("eglCreatePbufferSurface");
    return false;
  }

  const EGLint contextAttrs[] = {
    EGL_CONTEXT_CLIENT_VERSION, 3,
    EGL_NONE,
  };
  gAngle.context = eglCreateContext(gAngle.display, config, EGL_NO_CONTEXT, contextAttrs);
  if (gAngle.context == EGL_NO_CONTEXT) {
    logEglFailure("eglCreateContext");
    return false;
  }
  if (gAngle.eglMakeCurrent(gAngle.display, gAngle.surface, gAngle.surface, gAngle.context) == EGL_FALSE_VALUE) {
    logEglFailure("eglMakeCurrent");
    return false;
  }

  if (!initRenderer()) return false;
  gAngle.ready = true;
  dispatch_async(dispatch_get_main_queue(), ^{
    if (gAngle.ready && rebuildWindowSurface("eglCreateWindowSurface(deferred)")) {
      smokeLog("[three-angle-metal] EGL window surface rebound after AppKit layer presentation at %dx%d", gAngle.widthPx, gAngle.heightPx);
    }
  });
  smokeLog("[three-angle-metal] EGL %d.%d context attached at %dx%d", major, minor, gAngle.widthPx, gAngle.heightPx);
  std::fprintf(stderr, "[three-angle-metal] EGL %d.%d context attached at %dx%d\n", major, minor, gAngle.widthPx, gAngle.heightPx);
  return true;
}

extern "C" double gea_three_angle_host_sync_size(double fallbackAspect) {
  const double aspect = syncHostViewSize(fallbackAspect);
  if (gAngle.rendererReady && gAngle.glViewport) {
    gAngle.glViewport(0, 0, gAngle.widthPx, gAngle.heightPx);
  }
  return aspect;
}

extern "C" double gea_three_angle_host_create_mesh_buffer(
  double demoCode,
  double materialCode,
  double materialColor,
  const std::vector<gea_f32> &positions,
  const std::vector<gea_f32> &normals,
  const std::vector<gea_f32> &indices,
  const std::vector<gea_f32> &colors
) {
  static const std::vector<gea_f32> emptyUvs;
  return createUploadedMeshBuffer(
    demoCode,
    materialCode,
    materialColor,
    positions,
    normals,
    indices,
    colors,
    emptyUvs,
    emptyUvs,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    1.0,
    1.0,
    0.0,
    0.0,
    0.0,
    2.0,
    0.0,
    0.5,
    1.0
  );
}

extern "C" double gea_three_angle_host_create_texture(std::string imagePath) {
  return createUploadedTexture(imagePath);
}

extern "C" double gea_three_angle_host_create_textured_mesh_buffer(
  double demoCode,
  double materialCode,
  double materialColor,
  const std::vector<gea_f32> &positions,
  const std::vector<gea_f32> &normals,
  const std::vector<gea_f32> &indices,
  const std::vector<gea_f32> &colors,
  const std::vector<gea_f32> &uvs0,
  const std::vector<gea_f32> &uvs1,
  double textureHandle,
  double metallicRoughnessTextureHandle,
  double occlusionTextureHandle,
  double emissiveTextureHandle,
  double baseColorTexCoord,
  double metallicRoughnessTexCoord,
  double occlusionTexCoord,
  double emissiveTexCoord,
  double metallicFactor,
  double roughnessFactor,
  double occlusionStrength,
  double emissiveR,
  double emissiveG,
  double emissiveB,
  double sideMode,
  double alphaMode,
  double alphaCutoff,
  double alphaFactor
) {
  return createUploadedMeshBuffer(
    demoCode,
    materialCode,
    materialColor,
    positions,
    normals,
    indices,
    colors,
    uvs0,
    uvs1,
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
    alphaFactor
  );
}

extern "C" void gea_three_angle_host_render_mesh_buffer(
  double handle,
  double demoCode,
  double materialCode,
  double materialColor,
  double backgroundColor,
  double cameraFov,
  double cameraAspect,
  double cameraNear,
  double cameraFar,
  double cameraX,
  double cameraY,
  double cameraZ,
  double cameraLookAtX,
  double cameraLookAtY,
  double cameraLookAtZ,
  double rotationX,
  double rotationY,
  double rotationZ,
  double timestampMs
) {
  if (!gAngle.ready || !gAngle.rendererReady) return;
  const UploadedMeshBuffer *buffer = findUploadedMeshBuffer(static_cast<int>(handle));
  if (!buffer) return;
  logFirstBufferFrameIfNeeded(
    demoCode,
    materialCode,
    buffer->sourceVertexCount,
    buffer->sourceNormalCount,
    buffer->sourceIndexCount
  );
  if (!makeCurrentForRender("eglMakeCurrent(buffer-handle-render)")) return;
  SceneFrame frame = makeSceneFrame(
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
    timestampMs
  );
  applyNativeOrbitCamera(frame);
  drawUploadedVertices(frame, *buffer, identity(), true);
  recordNativeFrameFps(frame, static_cast<int>(demoCode), buffer->sourceVertexCount, buffer->sourceIndexCount, "buffer");
  swapRenderedFrame("eglSwapBuffers(buffer-handle-render)");
}

extern "C" void gea_three_angle_host_render_mesh_buffer_part(
  double handle,
  double demoCode,
  double materialCode,
  double materialColor,
  double backgroundColor,
  double cameraFov,
  double cameraAspect,
  double cameraNear,
  double cameraFar,
  double cameraX,
  double cameraY,
  double cameraZ,
  double cameraLookAtX,
  double cameraLookAtY,
  double cameraLookAtZ,
  double rotationX,
  double rotationY,
  double rotationZ,
  double timestampMs,
  bool clearFrame,
  bool swapFrame
) {
  if (!gAngle.ready || !gAngle.rendererReady) return;
  const UploadedMeshBuffer *buffer = findUploadedMeshBuffer(static_cast<int>(handle));
  if (!buffer) return;
  logFirstBufferFrameIfNeeded(
    demoCode,
    materialCode,
    buffer->sourceVertexCount,
    buffer->sourceNormalCount,
    buffer->sourceIndexCount
  );
  if (!makeCurrentForRender("eglMakeCurrent(buffer-part-render)")) return;
  SceneFrame frame = makeSceneFrame(
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
    timestampMs
  );
  applyNativeOrbitCamera(frame);
  drawUploadedVertices(frame, *buffer, identity(), clearFrame);
  if (!swapFrame) return;
  recordNativeFrameFps(frame, static_cast<int>(demoCode), buffer->sourceVertexCount, buffer->sourceIndexCount, "buffer");
  swapRenderedFrame("eglSwapBuffers(buffer-part-render)");
}

extern "C" double gea_three_angle_host_create_mesh_scene(
  double demoCode,
  const std::vector<gea_f32> &meshBufferHandles
) {
  if (!gAngle.ready || !gAngle.rendererReady) return 0.0;
  UploadedMeshScene scene;
  scene.handle = gAngle.nextMeshSceneHandle++;
  scene.demoCode = static_cast<int>(demoCode);
  scene.modelMatrix = identity();
  scene.meshBufferHandles.reserve(meshBufferHandles.size());

  for (double handleValue : meshBufferHandles) {
    const int handle = static_cast<int>(handleValue);
    const UploadedMeshBuffer *buffer = findUploadedMeshBuffer(handle);
    if (!buffer) continue;
    scene.meshBufferHandles.push_back(handle);
    scene.sourceVertexCount += buffer->sourceVertexCount;
    scene.sourceIndexCount += buffer->sourceIndexCount;
  }
  if (scene.meshBufferHandles.empty()) return 0.0;
  const int sceneHandle = scene.handle;
  const int sceneDemoCode = scene.demoCode;
  const std::size_t partCount = scene.meshBufferHandles.size();
  const std::size_t vertexCount = scene.sourceVertexCount;
  const std::size_t indexCount = scene.sourceIndexCount;
  gAngle.meshScenes.push_back(scene);
  smokeLog(
    "[three-angle-metal] uploaded native mesh scene: handle=%d demo=%d parts=%zu vertices=%zu indices=%zu",
    sceneHandle,
    sceneDemoCode,
    partCount,
    vertexCount,
    indexCount
  );
  return static_cast<double>(sceneHandle);
}

extern "C" double gea_three_angle_host_create_animated_mesh_scene(
  double demoCode,
  const std::vector<gea_f32> &meshBufferHandles,
  const std::vector<gea_f32> &meshBufferNodeIndices,
  const std::vector<gea_f32> &nodeParentIndices,
  const std::vector<gea_f32> &nodeTrsModes,
  const std::vector<gea_f32> &nodeBaseMatrices,
  const std::vector<gea_f32> &nodeBaseTranslations,
  const std::vector<gea_f32> &nodeBaseRotations,
  const std::vector<gea_f32> &nodeBaseScales,
  const std::vector<gea_f32> &modelMatrix,
  const std::vector<gea_f32> &animationChannelNodeIndices,
  const std::vector<gea_f32> &animationChannelPathCodes,
  const std::vector<gea_f32> &animationChannelInputOffsets,
  const std::vector<gea_f32> &animationChannelInputCounts,
  const std::vector<gea_f32> &animationChannelOutputOffsets,
  const std::vector<gea_f32> &animationTimes,
  const std::vector<gea_f32> &animationValues,
  double animationDuration
) {
  if (!gAngle.ready || !gAngle.rendererReady) return 0.0;
  UploadedMeshScene scene;
  scene.handle = gAngle.nextMeshSceneHandle++;
  scene.demoCode = static_cast<int>(demoCode);
  scene.animated = true;
  scene.modelMatrix = matFromColumnMajorVector(modelMatrix, 0);
  scene.meshBufferHandles.reserve(meshBufferHandles.size());
  scene.meshBufferNodeIndices.reserve(meshBufferHandles.size());

  for (std::size_t index = 0; index < meshBufferHandles.size(); index++) {
    const int handle = static_cast<int>(meshBufferHandles[index]);
    const UploadedMeshBuffer *buffer = findUploadedMeshBuffer(handle);
    if (!buffer) continue;
    scene.meshBufferHandles.push_back(handle);
    const int nodeIndex = index < meshBufferNodeIndices.size()
      ? static_cast<int>(meshBufferNodeIndices[index])
      : -1;
    scene.meshBufferNodeIndices.push_back(nodeIndex);
    scene.sourceVertexCount += buffer->sourceVertexCount;
    scene.sourceIndexCount += buffer->sourceIndexCount;
  }
  if (scene.meshBufferHandles.empty()) return 0.0;

  const std::size_t nodeCount = nodeParentIndices.size();
  scene.nodes.reserve(nodeCount);
  for (std::size_t nodeIndex = 0; nodeIndex < nodeCount; nodeIndex++) {
    AnimatedNode node;
    node.parent = static_cast<int>(nodeParentIndices[nodeIndex]);
    node.trsMode = nodeIndex < nodeTrsModes.size() ? static_cast<int>(nodeTrsModes[nodeIndex]) : 1;
    node.baseMatrix = matFromColumnMajorVector(nodeBaseMatrices, nodeIndex * 16);
    if (nodeIndex * 3 + 2 < nodeBaseTranslations.size()) {
      node.baseTranslation = Vec3{
        static_cast<float>(nodeBaseTranslations[nodeIndex * 3]),
        static_cast<float>(nodeBaseTranslations[nodeIndex * 3 + 1]),
        static_cast<float>(nodeBaseTranslations[nodeIndex * 3 + 2]),
      };
    }
    if (nodeIndex * 4 + 3 < nodeBaseRotations.size()) {
      node.baseRotation = Quat{
        static_cast<float>(nodeBaseRotations[nodeIndex * 4]),
        static_cast<float>(nodeBaseRotations[nodeIndex * 4 + 1]),
        static_cast<float>(nodeBaseRotations[nodeIndex * 4 + 2]),
        static_cast<float>(nodeBaseRotations[nodeIndex * 4 + 3]),
      };
    }
    if (nodeIndex * 3 + 2 < nodeBaseScales.size()) {
      node.baseScale = Vec3{
        static_cast<float>(nodeBaseScales[nodeIndex * 3]),
        static_cast<float>(nodeBaseScales[nodeIndex * 3 + 1]),
        static_cast<float>(nodeBaseScales[nodeIndex * 3 + 2]),
      };
    }
    scene.nodes.push_back(node);
  }

  const std::size_t channelCount = std::min(
    std::min(animationChannelNodeIndices.size(), animationChannelPathCodes.size()),
    std::min(
      std::min(animationChannelInputOffsets.size(), animationChannelInputCounts.size()),
      animationChannelOutputOffsets.size()
    )
  );
  scene.animationChannels.reserve(channelCount);
  for (std::size_t channelIndex = 0; channelIndex < channelCount; channelIndex++) {
    AnimationChannel channel;
    channel.nodeIndex = static_cast<int>(animationChannelNodeIndices[channelIndex]);
    channel.pathCode = static_cast<int>(animationChannelPathCodes[channelIndex]);
    channel.inputOffset = static_cast<int>(animationChannelInputOffsets[channelIndex]);
    channel.inputCount = static_cast<int>(animationChannelInputCounts[channelIndex]);
    channel.outputOffset = static_cast<int>(animationChannelOutputOffsets[channelIndex]);
    scene.animationChannels.push_back(channel);
  }
  scene.animationTimes.reserve(animationTimes.size());
  for (gea_f32 value : animationTimes) scene.animationTimes.push_back(static_cast<float>(value));
  scene.animationValues.reserve(animationValues.size());
  for (gea_f32 value : animationValues) scene.animationValues.push_back(static_cast<float>(value));
  scene.animationDuration = static_cast<float>(animationDuration);
  updateSceneBindWorldMatrices(scene);

  const int sceneHandle = scene.handle;
  const int sceneDemoCode = scene.demoCode;
  const std::size_t partCount = scene.meshBufferHandles.size();
  const std::size_t vertexCount = scene.sourceVertexCount;
  const std::size_t indexCount = scene.sourceIndexCount;
  const std::size_t storedNodeCount = scene.nodes.size();
  const std::size_t storedChannelCount = scene.animationChannels.size();
  gAngle.meshScenes.push_back(scene);
  smokeLog(
    "[three-angle-metal] uploaded native animated mesh scene: handle=%d demo=%d parts=%zu nodes=%zu channels=%zu duration=%.3f vertices=%zu indices=%zu",
    sceneHandle,
    sceneDemoCode,
    partCount,
    storedNodeCount,
    storedChannelCount,
    static_cast<float>(animationDuration),
    vertexCount,
    indexCount
  );
  return static_cast<double>(sceneHandle);
}

struct LittlestTokyoScenePayload {
  struct Chunk {
    int nodeIndex = -1;
    int textureIndex = -1;
    int metallicRoughnessTextureIndex = -1;
    int occlusionTextureIndex = -1;
    int emissiveTextureIndex = -1;
    int baseColorTexCoord = 0;
    int metallicRoughnessTexCoord = 0;
    int occlusionTexCoord = 0;
    int emissiveTexCoord = 0;
    int sideMode = 0;
    int alphaMode = 0;
    float metallicFactor = 1.0f;
    float roughnessFactor = 1.0f;
    float occlusionStrength = 0.0f;
    float emissiveR = 0.0f;
    float emissiveG = 0.0f;
    float emissiveB = 0.0f;
    float alphaCutoff = 0.5f;
    float alphaFactor = 1.0f;
    std::vector<float> positions;
    std::vector<float> normals;
    std::vector<float> colors;
    std::vector<float> uv0s;
    std::vector<float> uv1s;
    std::vector<int> indices;
  };

  std::vector<std::string> texturePaths;
  std::vector<Chunk> chunks;
  std::vector<int> meshBufferNodeIndices;
  std::vector<int> nodeParentIndices;
  std::vector<int> nodeTrsModes;
  std::vector<float> nodeBaseMatrices;
  std::vector<float> nodeBaseTranslations;
  std::vector<float> nodeBaseRotations;
  std::vector<float> nodeBaseScales;
  std::vector<float> modelMatrix;
  std::vector<int> animationChannelNodeIndices;
  std::vector<int> animationChannelPathCodes;
  std::vector<int> animationChannelInputOffsets;
  std::vector<int> animationChannelInputCounts;
  std::vector<int> animationChannelOutputOffsets;
  std::vector<float> animationTimes;
  std::vector<float> animationValues;
  float animationDuration = 0.0f;
};

struct ScenePayloadReader {
  const unsigned char *data = nullptr;
  std::size_t size = 0;
  std::size_t offset = 0;

  bool readU32(std::uint32_t &value) {
    if (offset + 4 > size) return false;
    value = static_cast<std::uint32_t>(data[offset]) |
            (static_cast<std::uint32_t>(data[offset + 1]) << 8u) |
            (static_cast<std::uint32_t>(data[offset + 2]) << 16u) |
            (static_cast<std::uint32_t>(data[offset + 3]) << 24u);
    offset += 4;
    return true;
  }

  bool readFloat(float &value) {
    std::uint32_t bits = 0;
    if (!readU32(bits)) return false;
    std::memcpy(&value, &bits, sizeof(float));
    return true;
  }

  bool readI32(int &value) {
    std::uint32_t bits = 0;
    if (!readU32(bits)) return false;
    value = static_cast<int>(static_cast<std::int32_t>(bits));
    return true;
  }

  bool readString(std::string &value) {
    std::uint32_t length = 0;
    if (!readU32(length)) return false;
    if (length > 1000000u || offset + length > size) return false;
    value.assign(reinterpret_cast<const char *>(data + offset), static_cast<std::size_t>(length));
    offset += length;
    return true;
  }

  bool readI32Array(std::vector<int> &values) {
    std::uint32_t count = 0;
    if (!readU32(count)) return false;
    if (count > 10000000u || offset + static_cast<std::size_t>(count) * 4 > size) return false;
    values.clear();
    values.reserve(count);
    for (std::uint32_t i = 0; i < count; i++) {
      std::uint32_t bits = 0;
      if (!readU32(bits)) return false;
      values.push_back(static_cast<int>(static_cast<std::int32_t>(bits)));
    }
    return true;
  }

  bool readF32Array(std::vector<float> &values) {
    std::uint32_t count = 0;
    if (!readU32(count)) return false;
    if (count > 10000000u || offset + static_cast<std::size_t>(count) * 4 > size) return false;
    values.clear();
    values.reserve(count);
    for (std::uint32_t i = 0; i < count; i++) {
      float value = 0.0f;
      if (!readFloat(value)) return false;
      values.push_back(value);
    }
    return true;
  }
};

static bool loadFileBytes(const std::string &path, std::vector<unsigned char> &bytes) {
  FILE *file = std::fopen(path.c_str(), "rb");
  if (!file) return false;
  std::fseek(file, 0, SEEK_END);
  const long length = std::ftell(file);
  std::fseek(file, 0, SEEK_SET);
  if (length <= 0) {
    std::fclose(file);
    return false;
  }
  bytes.resize(static_cast<std::size_t>(length));
  const std::size_t readCount = std::fread(bytes.data(), 1, bytes.size(), file);
  std::fclose(file);
  return readCount == bytes.size();
}

static bool loadLittlestTokyoScenePayload(const std::string &path, LittlestTokyoScenePayload &payload) {
  std::vector<unsigned char> bytes;
  if (!loadFileBytes(path, bytes)) return false;
  static const unsigned char magic[] = {'G', 'E', 'A', '3', 'S', 'C', 'N', '2'};
  if (bytes.size() < sizeof(magic) || std::memcmp(bytes.data(), magic, sizeof(magic)) != 0) return false;
  ScenePayloadReader reader{bytes.data(), bytes.size(), sizeof(magic)};
  std::uint32_t textureCount = 0;
  if (!reader.readU32(textureCount) || textureCount > 10000u) return false;
  payload.texturePaths.clear();
  payload.texturePaths.reserve(textureCount);
  for (std::uint32_t i = 0; i < textureCount; i++) {
    std::string pathValue;
    if (!reader.readString(pathValue)) return false;
    payload.texturePaths.push_back(pathValue);
  }

  std::uint32_t chunkCount = 0;
  if (!reader.readU32(chunkCount) || chunkCount > 100000u) return false;
  payload.chunks.clear();
  payload.chunks.reserve(chunkCount);
  for (std::uint32_t i = 0; i < chunkCount; i++) {
    LittlestTokyoScenePayload::Chunk chunk;
    if (!reader.readI32(chunk.nodeIndex) ||
        !reader.readI32(chunk.textureIndex) ||
        !reader.readI32(chunk.metallicRoughnessTextureIndex) ||
        !reader.readI32(chunk.occlusionTextureIndex) ||
        !reader.readI32(chunk.emissiveTextureIndex) ||
        !reader.readI32(chunk.baseColorTexCoord) ||
        !reader.readI32(chunk.metallicRoughnessTexCoord) ||
        !reader.readI32(chunk.occlusionTexCoord) ||
        !reader.readI32(chunk.emissiveTexCoord) ||
        !reader.readI32(chunk.sideMode) ||
        !reader.readI32(chunk.alphaMode) ||
        !reader.readFloat(chunk.metallicFactor) ||
        !reader.readFloat(chunk.roughnessFactor) ||
        !reader.readFloat(chunk.occlusionStrength) ||
        !reader.readFloat(chunk.emissiveR) ||
        !reader.readFloat(chunk.emissiveG) ||
        !reader.readFloat(chunk.emissiveB) ||
        !reader.readFloat(chunk.alphaCutoff) ||
        !reader.readFloat(chunk.alphaFactor) ||
        !reader.readF32Array(chunk.positions) ||
        !reader.readF32Array(chunk.normals) ||
        !reader.readF32Array(chunk.colors) ||
        !reader.readF32Array(chunk.uv0s) ||
        !reader.readF32Array(chunk.uv1s) ||
        !reader.readI32Array(chunk.indices)) {
      return false;
    }
    payload.chunks.push_back(std::move(chunk));
  }

  return reader.readI32Array(payload.meshBufferNodeIndices) &&
         reader.readI32Array(payload.nodeParentIndices) &&
         reader.readI32Array(payload.nodeTrsModes) &&
         reader.readF32Array(payload.nodeBaseMatrices) &&
         reader.readF32Array(payload.nodeBaseTranslations) &&
         reader.readF32Array(payload.nodeBaseRotations) &&
         reader.readF32Array(payload.nodeBaseScales) &&
         reader.readF32Array(payload.modelMatrix) &&
         reader.readI32Array(payload.animationChannelNodeIndices) &&
         reader.readI32Array(payload.animationChannelPathCodes) &&
         reader.readI32Array(payload.animationChannelInputOffsets) &&
         reader.readI32Array(payload.animationChannelInputCounts) &&
         reader.readI32Array(payload.animationChannelOutputOffsets) &&
         reader.readF32Array(payload.animationTimes) &&
         reader.readF32Array(payload.animationValues) &&
         reader.readFloat(payload.animationDuration);
}

static Mat4 matFromFloatVector(const std::vector<float> &values, std::size_t offset) {
  Mat4 out = identity();
  if (offset + 15 >= values.size()) return out;
  for (int i = 0; i < 16; i++) out.m[i] = values[offset + static_cast<std::size_t>(i)];
  return out;
}

static bool stringEndsWith(const std::string &value, const std::string &suffix) {
  return value.size() >= suffix.size() &&
         value.compare(value.size() - suffix.size(), suffix.size(), suffix) == 0;
}

static std::string directoryName(const std::string &path) {
  const std::size_t slash = path.find_last_of('/');
  if (slash == std::string::npos) return ".";
  if (slash == 0) return "/";
  return path.substr(0, slash);
}

static std::string joinPath(const std::string &base, const std::string &relative) {
  if (relative.empty()) return base;
  if (relative[0] == '/') return relative;
  if (base.empty() || base == ".") return relative;
  if (base[base.size() - 1] == '/') return base + relative;
  return base + "/" + relative;
}

static cgltf_data *parseCgltfFile(const std::string &path, bool loadBuffers) {
  cgltf_options options = {};
  cgltf_data *data = nullptr;
  cgltf_result result = cgltf_parse_file(&options, path.c_str(), &data);
  if (result != cgltf_result_success || !data) {
    smokeLog("[three-angle-metal] cgltf parse failed (%d): %s", static_cast<int>(result), path.c_str());
    return nullptr;
  }
  if (loadBuffers) {
    result = cgltf_load_buffers(&options, data, path.c_str());
    if (result != cgltf_result_success) {
      smokeLog("[three-angle-metal] cgltf buffer load failed (%d): %s", static_cast<int>(result), path.c_str());
      cgltf_free(data);
      return nullptr;
    }
    result = cgltf_validate(data);
    if (result != cgltf_result_success) {
      smokeLog("[three-angle-metal] cgltf validation failed (%d): %s", static_cast<int>(result), path.c_str());
      cgltf_free(data);
      return nullptr;
    }
  }
  return data;
}

static int cgltfNodeIndex(const cgltf_data *data, const cgltf_node *node) {
  if (!data || !node || node < data->nodes || node >= data->nodes + data->nodes_count) return -1;
  return static_cast<int>(node - data->nodes);
}

static int cgltfSkinIndex(const cgltf_data *data, const cgltf_skin *skin) {
  if (!data || !skin || skin < data->skins || skin >= data->skins + data->skins_count) return -1;
  return static_cast<int>(skin - data->skins);
}

static int cgltfTextureIndex(const cgltf_data *data, const cgltf_texture *texture) {
  if (!data || !texture || texture < data->textures || texture >= data->textures + data->textures_count) return -1;
  return static_cast<int>(texture - data->textures);
}

static int cgltfAccessorIndex(const cgltf_data *data, const cgltf_accessor *accessor) {
  if (!data || !accessor || accessor < data->accessors || accessor >= data->accessors + data->accessors_count) return -1;
  return static_cast<int>(accessor - data->accessors);
}

static Mat4 matFromCgltfArray(const cgltf_float *values) {
  Mat4 out = identity();
  if (!values) return out;
  for (int i = 0; i < 16; i++) out.m[i] = static_cast<float>(values[i]);
  return out;
}

static Mat4 localMatrixForCgltfNode(const cgltf_node &node) {
  if (node.has_matrix) return matFromCgltfArray(node.matrix);
  Vec3 translation{0.0f, 0.0f, 0.0f};
  Quat rotation{};
  Vec3 scaleValue{1.0f, 1.0f, 1.0f};
  if (node.has_translation) {
    translation = Vec3{node.translation[0], node.translation[1], node.translation[2]};
  }
  if (node.has_rotation) {
    rotation = Quat{node.rotation[0], node.rotation[1], node.rotation[2], node.rotation[3]};
  }
  if (node.has_scale) {
    scaleValue = Vec3{node.scale[0], node.scale[1], node.scale[2]};
  }
  return matFromTrs(translation, rotation, scaleValue);
}

static std::vector<gea_f32> geaVectorFromFloats(const std::vector<float> &values) {
  std::vector<gea_f32> out;
  out.reserve(values.size());
  for (float value : values) out.emplace_back(value);
  return out;
}

static std::vector<gea_f32> geaVectorFromInts(const std::vector<int> &values) {
  std::vector<gea_f32> out;
  out.reserve(values.size());
  for (int value : values) out.emplace_back(value);
  return out;
}

static std::vector<float> readAccessorFloats(const cgltf_accessor *accessor, int requestedComponents, float fallback = 0.0f) {
  std::vector<float> values;
  if (!accessor || requestedComponents <= 0) return values;
  const cgltf_size components = cgltf_num_components(accessor->type);
  values.reserve(static_cast<std::size_t>(accessor->count) * static_cast<std::size_t>(requestedComponents));
  for (cgltf_size index = 0; index < accessor->count; index++) {
    cgltf_float element[16] = {};
    if (!cgltf_accessor_read_float(accessor, index, element, 16)) {
      for (int component = 0; component < requestedComponents; component++) values.push_back(fallback);
      continue;
    }
    for (int component = 0; component < requestedComponents; component++) {
      values.push_back(component < static_cast<int>(components) ? static_cast<float>(element[component]) : fallback);
    }
  }
  return values;
}

static std::vector<int> readAccessorUInts(const cgltf_accessor *accessor, int requestedComponents) {
  std::vector<int> values;
  if (!accessor || requestedComponents <= 0) return values;
  const cgltf_size components = cgltf_num_components(accessor->type);
  values.reserve(static_cast<std::size_t>(accessor->count) * static_cast<std::size_t>(requestedComponents));
  for (cgltf_size index = 0; index < accessor->count; index++) {
    cgltf_uint element[16] = {};
    if (!cgltf_accessor_read_uint(accessor, index, element, 16)) {
      for (int component = 0; component < requestedComponents; component++) values.push_back(0);
      continue;
    }
    for (int component = 0; component < requestedComponents; component++) {
      values.push_back(component < static_cast<int>(components) ? static_cast<int>(element[component]) : 0);
    }
  }
  return values;
}

static std::vector<int> readPrimitiveIndices(const cgltf_primitive &primitive, std::size_t vertexCount) {
  if (primitive.indices) return readAccessorUInts(primitive.indices, 1);
  std::vector<int> indices;
  indices.reserve(vertexCount);
  for (std::size_t i = 0; i < vertexCount; i++) indices.push_back(static_cast<int>(i));
  return indices;
}

static double createUploadedCgltfTexture(
  const std::string &gltfPath,
  const cgltf_texture *texture
) {
  if (!texture || !texture->image) return 0.0;
  const cgltf_image *image = texture->image;
  const std::string imageName = image->name ? image->name : "embedded-image";
  if (image->uri && std::strncmp(image->uri, "data:", 5) != 0) {
    return createUploadedTexture(joinPath(directoryName(gltfPath), image->uri));
  }
  if (!image->buffer_view) return 0.0;
  const std::uint8_t *bytes = cgltf_buffer_view_data(image->buffer_view);
  if (!bytes || image->buffer_view->size == 0) return 0.0;
  std::vector<unsigned char> pixels;
  int width = 0;
  int height = 0;
  if (!loadImagePixelsFromBytes(bytes, image->buffer_view->size, pixels, width, height)) {
    smokeLog("[three-angle-metal] failed to load embedded glTF texture: %s#%s", gltfPath.c_str(), imageName.c_str());
    return 0.0;
  }
  return uploadTexturePixels(gltfPath + "#" + imageName, pixels, width, height);
}

static int alphaModeCode(cgltf_alpha_mode mode) {
  if (mode == cgltf_alpha_mode_mask) return 1;
  if (mode == cgltf_alpha_mode_blend) return 2;
  return 0;
}

static int animationPathCode(cgltf_animation_path_type path) {
  if (path == cgltf_animation_path_type_translation) return 0;
  if (path == cgltf_animation_path_type_rotation) return 1;
  if (path == cgltf_animation_path_type_scale) return 2;
  return -1;
}

static void loadCgltfSkins(const cgltf_data *data, UploadedMeshScene &scene) {
  scene.skins.clear();
  scene.skins.reserve(data->skins_count);
  for (cgltf_size skinIndex = 0; skinIndex < data->skins_count; skinIndex++) {
    const cgltf_skin &sourceSkin = data->skins[skinIndex];
    UploadedSkin skin;
    skin.jointNodeIndices.reserve(sourceSkin.joints_count);
    skin.inverseBindMatrices.reserve(sourceSkin.joints_count);
    std::vector<float> inverseBindValues = readAccessorFloats(sourceSkin.inverse_bind_matrices, 16, 0.0f);
    for (cgltf_size jointIndex = 0; jointIndex < sourceSkin.joints_count; jointIndex++) {
      skin.jointNodeIndices.push_back(cgltfNodeIndex(data, sourceSkin.joints[jointIndex]));
      if (jointIndex * 16 + 15 < inverseBindValues.size()) {
        skin.inverseBindMatrices.push_back(matFromFloatVector(inverseBindValues, static_cast<std::size_t>(jointIndex) * 16));
      } else {
        skin.inverseBindMatrices.push_back(identity());
      }
    }
    scene.skins.push_back(std::move(skin));
  }
}

static void loadCgltfAnimation(const cgltf_data *data, UploadedMeshScene &scene) {
  if (data->animations_count == 0) return;
  const cgltf_animation &animation = data->animations[0];
  for (cgltf_size channelIndex = 0; channelIndex < animation.channels_count; channelIndex++) {
    const cgltf_animation_channel &channel = animation.channels[channelIndex];
    if (!channel.target_node || !channel.sampler) continue;
    const int pathCode = animationPathCode(channel.target_path);
    if (pathCode < 0) continue;
    if (channel.sampler->interpolation != cgltf_interpolation_type_linear &&
        channel.sampler->interpolation != cgltf_interpolation_type_step) {
      smokeLog("[three-angle-metal] skipping unsupported glTF animation interpolation on channel %zu", static_cast<std::size_t>(channelIndex));
      continue;
    }
    const std::vector<float> inputValues = readAccessorFloats(channel.sampler->input, 1);
    const int components = pathCode == 1 ? 4 : 3;
    const std::vector<float> outputValues = readAccessorFloats(channel.sampler->output, components);
    if (inputValues.empty() || outputValues.empty()) continue;
    scene.animationChannels.push_back(AnimationChannel{
      cgltfNodeIndex(data, channel.target_node),
      pathCode,
      static_cast<int>(scene.animationTimes.size()),
      static_cast<int>(inputValues.size()),
      static_cast<int>(scene.animationValues.size()),
    });
    for (float time : inputValues) {
      scene.animationDuration = std::max(scene.animationDuration, time);
      scene.animationTimes.push_back(time);
    }
    scene.animationValues.insert(scene.animationValues.end(), outputValues.begin(), outputValues.end());
  }
}

static void initializeCgltfNodes(
  const cgltf_data *data,
  const std::vector<bool> &animatedNodes,
  UploadedMeshScene &scene
) {
  scene.nodes.clear();
  scene.nodes.reserve(data->nodes_count);
  for (cgltf_size nodeIndex = 0; nodeIndex < data->nodes_count; nodeIndex++) {
    const cgltf_node &sourceNode = data->nodes[nodeIndex];
    AnimatedNode node;
    node.parent = cgltfNodeIndex(data, sourceNode.parent);
    node.trsMode = (nodeIndex < animatedNodes.size() && animatedNodes[static_cast<std::size_t>(nodeIndex)]) || !sourceNode.has_matrix ? 1 : 0;
    node.baseMatrix = localMatrixForCgltfNode(sourceNode);
    if (sourceNode.has_translation) {
      node.baseTranslation = Vec3{sourceNode.translation[0], sourceNode.translation[1], sourceNode.translation[2]};
    }
    if (sourceNode.has_rotation) {
      node.baseRotation = Quat{sourceNode.rotation[0], sourceNode.rotation[1], sourceNode.rotation[2], sourceNode.rotation[3]};
    }
    if (sourceNode.has_scale) {
      node.baseScale = Vec3{sourceNode.scale[0], sourceNode.scale[1], sourceNode.scale[2]};
    }
    scene.nodes.push_back(node);
  }
}

static void markAnimatedCgltfNodes(const cgltf_data *data, std::vector<bool> &animatedNodes) {
  animatedNodes.assign(data->nodes_count, false);
  if (data->animations_count == 0) return;
  const cgltf_animation &animation = data->animations[0];
  for (cgltf_size channelIndex = 0; channelIndex < animation.channels_count; channelIndex++) {
    const cgltf_node *targetNode = animation.channels[channelIndex].target_node;
    const int nodeIndex = cgltfNodeIndex(data, targetNode);
    if (nodeIndex >= 0 && static_cast<std::size_t>(nodeIndex) < animatedNodes.size()) {
      animatedNodes[static_cast<std::size_t>(nodeIndex)] = true;
    }
  }
}

struct CgltfPrimitiveUploadData {
  std::vector<float> positions;
  std::vector<float> normals;
  std::vector<float> uv0s;
  std::vector<float> uv1s;
  std::vector<int> indices;
  std::vector<int> joints0;
  std::vector<float> weights0;
};

static int dracoUniqueIdForCgltfAttribute(
  const cgltf_data *data,
  const cgltf_primitive &primitive,
  cgltf_attribute_type type,
  cgltf_int index
) {
  if (!data || !primitive.has_draco_mesh_compression) return -1;
  for (cgltf_size attributeIndex = 0; attributeIndex < primitive.draco_mesh_compression.attributes_count; attributeIndex++) {
    const cgltf_attribute &attribute = primitive.draco_mesh_compression.attributes[attributeIndex];
    if (attribute.type == type && attribute.index == index) return cgltfAccessorIndex(data, attribute.data);
  }
  return -1;
}

static const draco::PointAttribute *dracoAttributeForCgltfSemantic(
  const cgltf_data *data,
  const cgltf_primitive &primitive,
  const draco::Mesh &mesh,
  cgltf_attribute_type type,
  cgltf_int index
) {
  const int uniqueId = dracoUniqueIdForCgltfAttribute(data, primitive, type, index);
  if (uniqueId < 0) return nullptr;
  return mesh.GetAttributeByUniqueId(static_cast<std::uint32_t>(uniqueId));
}

template <typename T>
static bool appendDracoAttributeValues(
  const draco::Mesh &mesh,
  const draco::PointAttribute *attribute,
  int requestedComponents,
  T fallback,
  std::vector<T> &values
) {
  if (!attribute || requestedComponents <= 0) return false;
  const int sourceComponents = std::min(requestedComponents, static_cast<int>(attribute->num_components()));
  if (sourceComponents <= 0 || requestedComponents > 4) return false;
  const std::size_t vertexCount = static_cast<std::size_t>(mesh.num_points());
  values.reserve(values.size() + vertexCount * static_cast<std::size_t>(requestedComponents));
  for (draco::PointIndex pointIndex(0); pointIndex < mesh.num_points(); ++pointIndex) {
    T element[4] = {fallback, fallback, fallback, fallback};
    const draco::AttributeValueIndex valueIndex = attribute->mapped_index(pointIndex);
    if (!attribute->ConvertValue<T>(valueIndex, static_cast<int8_t>(sourceComponents), element)) return false;
    for (int component = 0; component < requestedComponents; component++) {
      values.push_back(component < sourceComponents ? element[component] : fallback);
    }
  }
  return true;
}

static bool appendDracoPrimitiveIndices(const draco::Mesh &mesh, std::vector<int> &indices) {
  const std::size_t vertexCount = static_cast<std::size_t>(mesh.num_points());
  indices.reserve(indices.size() + static_cast<std::size_t>(mesh.num_faces()) * 3);
  for (draco::FaceIndex faceIndex(0); faceIndex < mesh.num_faces(); ++faceIndex) {
    const draco::Mesh::Face &face = mesh.face(faceIndex);
    for (int corner = 0; corner < 3; corner++) {
      const std::size_t index = static_cast<std::size_t>(face[corner].value());
      if (index >= vertexCount || index > static_cast<std::size_t>(std::numeric_limits<int>::max())) return false;
      indices.push_back(static_cast<int>(index));
    }
  }
  return true;
}

static bool readDracoPrimitiveUploadData(
  const cgltf_data *data,
  const cgltf_primitive &primitive,
  CgltfPrimitiveUploadData &upload
) {
  if (!data || !primitive.has_draco_mesh_compression || !primitive.draco_mesh_compression.buffer_view) return false;
  const cgltf_buffer_view *bufferView = primitive.draco_mesh_compression.buffer_view;
  const std::uint8_t *bytes = cgltf_buffer_view_data(bufferView);
  if (!bytes || bufferView->size == 0) return false;

  draco::DecoderBuffer decoderBuffer;
  decoderBuffer.Init(reinterpret_cast<const char *>(bytes), bufferView->size);
  draco::Decoder decoder;
  auto decodedMesh = decoder.DecodeMeshFromBuffer(&decoderBuffer);
  if (!decodedMesh.ok()) {
    smokeLog("[three-angle-metal] Draco mesh decode failed: %s", decodedMesh.status().error_msg());
    return false;
  }
  std::unique_ptr<draco::Mesh> mesh = std::move(decodedMesh).value();
  if (!mesh || mesh->num_points() == 0) return false;

  const draco::PointAttribute *positionAttribute = dracoAttributeForCgltfSemantic(data, primitive, *mesh, cgltf_attribute_type_position, 0);
  if (!appendDracoAttributeValues<float>(*mesh, positionAttribute, 3, 0.0f, upload.positions)) return false;

  const draco::PointAttribute *normalAttribute = dracoAttributeForCgltfSemantic(data, primitive, *mesh, cgltf_attribute_type_normal, 0);
  if (normalAttribute) {
    if (!appendDracoAttributeValues<float>(*mesh, normalAttribute, 3, 0.0f, upload.normals)) return false;
  }
  const draco::PointAttribute *uv0Attribute = dracoAttributeForCgltfSemantic(data, primitive, *mesh, cgltf_attribute_type_texcoord, 0);
  if (uv0Attribute) {
    if (!appendDracoAttributeValues<float>(*mesh, uv0Attribute, 2, 0.0f, upload.uv0s)) return false;
  }
  const draco::PointAttribute *uv1Attribute = dracoAttributeForCgltfSemantic(data, primitive, *mesh, cgltf_attribute_type_texcoord, 1);
  if (uv1Attribute) {
    if (!appendDracoAttributeValues<float>(*mesh, uv1Attribute, 2, 0.0f, upload.uv1s)) return false;
  }
  const draco::PointAttribute *jointsAttribute = dracoAttributeForCgltfSemantic(data, primitive, *mesh, cgltf_attribute_type_joints, 0);
  if (jointsAttribute) {
    if (!appendDracoAttributeValues<int>(*mesh, jointsAttribute, 4, 0, upload.joints0)) return false;
  }
  const draco::PointAttribute *weightsAttribute = dracoAttributeForCgltfSemantic(data, primitive, *mesh, cgltf_attribute_type_weights, 0);
  if (weightsAttribute) {
    if (!appendDracoAttributeValues<float>(*mesh, weightsAttribute, 4, 0.0f, upload.weights0)) return false;
  }
  if (!appendDracoPrimitiveIndices(*mesh, upload.indices)) return false;
  return true;
}

static bool readAccessorPrimitiveUploadData(
  const cgltf_primitive &primitive,
  CgltfPrimitiveUploadData &upload
) {
  const cgltf_accessor *positionAccessor = cgltf_find_accessor(&primitive, cgltf_attribute_type_position, 0);
  if (!positionAccessor) return false;
  const cgltf_accessor *normalAccessor = cgltf_find_accessor(&primitive, cgltf_attribute_type_normal, 0);
  const cgltf_accessor *uv0Accessor = cgltf_find_accessor(&primitive, cgltf_attribute_type_texcoord, 0);
  const cgltf_accessor *uv1Accessor = cgltf_find_accessor(&primitive, cgltf_attribute_type_texcoord, 1);
  const cgltf_accessor *jointsAccessor = cgltf_find_accessor(&primitive, cgltf_attribute_type_joints, 0);
  const cgltf_accessor *weightsAccessor = cgltf_find_accessor(&primitive, cgltf_attribute_type_weights, 0);

  upload.positions = readAccessorFloats(positionAccessor, 3);
  upload.normals = readAccessorFloats(normalAccessor, 3);
  const std::size_t vertexCount = upload.positions.size() / 3;
  if (vertexCount == 0) return false;
  if (upload.normals.empty()) {
    upload.normals.reserve(vertexCount * 3);
    for (std::size_t i = 0; i < vertexCount; i++) {
      upload.normals.push_back(0.0f);
      upload.normals.push_back(1.0f);
      upload.normals.push_back(0.0f);
    }
  }
  upload.uv0s = readAccessorFloats(uv0Accessor, 2);
  upload.uv1s = readAccessorFloats(uv1Accessor, 2);
  upload.indices = readPrimitiveIndices(primitive, vertexCount);
  upload.joints0 = readAccessorUInts(jointsAccessor, 4);
  upload.weights0 = readAccessorFloats(weightsAccessor, 4);
  return true;
}

static bool readCgltfPrimitiveUploadData(
  const cgltf_data *data,
  const cgltf_primitive &primitive,
  CgltfPrimitiveUploadData &upload
) {
  if (primitive.type != cgltf_primitive_type_triangles) return false;
  if (primitive.has_draco_mesh_compression) return readDracoPrimitiveUploadData(data, primitive, upload);
  return readAccessorPrimitiveUploadData(primitive, upload);
}

static bool uploadCgltfPrimitive(
  const cgltf_data *data,
  const std::string &gltfPath,
  const std::vector<double> &textureHandles,
  UploadedMeshScene &scene,
  const cgltf_node &node,
  const cgltf_primitive &primitive,
  double demoCode
) {
  CgltfPrimitiveUploadData upload;
  if (!readCgltfPrimitiveUploadData(data, primitive, upload)) return false;
  const std::vector<float> &positions = upload.positions;
  const std::vector<float> &normals = upload.normals;
  const std::vector<float> &uv0s = upload.uv0s;
  const std::vector<float> &uv1s = upload.uv1s;
  const std::vector<int> &indices = upload.indices;
  const std::vector<int> &joints0 = upload.joints0;
  const std::vector<float> &weights0 = upload.weights0;
  const std::size_t vertexCount = positions.size() / 3;
  if (vertexCount == 0) return false;

  const cgltf_material *material = primitive.material;
  const cgltf_pbr_metallic_roughness *pbr = material ? &material->pbr_metallic_roughness : nullptr;
  const float baseR = pbr ? static_cast<float>(pbr->base_color_factor[0]) : 1.0f;
  const float baseG = pbr ? static_cast<float>(pbr->base_color_factor[1]) : 1.0f;
  const float baseB = pbr ? static_cast<float>(pbr->base_color_factor[2]) : 1.0f;
  const float baseA = pbr ? static_cast<float>(pbr->base_color_factor[3]) : 1.0f;
  std::vector<float> colors;
  colors.reserve(vertexCount * 4);
  for (std::size_t i = 0; i < vertexCount; i++) {
    colors.push_back(baseR);
    colors.push_back(baseG);
    colors.push_back(baseB);
    colors.push_back(baseA);
  }

  auto textureHandleAt = [&textureHandles, data](const cgltf_texture *texture) -> double {
    const int textureIndex = cgltfTextureIndex(data, texture);
    if (textureIndex < 0 || static_cast<std::size_t>(textureIndex) >= textureHandles.size()) return 0.0;
    return textureHandles[static_cast<std::size_t>(textureIndex)];
  };

  const double baseColorTextureHandle = pbr ? textureHandleAt(pbr->base_color_texture.texture) : 0.0;
  const double metallicRoughnessTextureHandle = pbr ? textureHandleAt(pbr->metallic_roughness_texture.texture) : 0.0;
  const double occlusionTextureHandle = material ? textureHandleAt(material->occlusion_texture.texture) : 0.0;
  const double emissiveTextureHandle = material ? textureHandleAt(material->emissive_texture.texture) : 0.0;
  const double baseColorTexCoord = pbr ? static_cast<double>(std::max(0, pbr->base_color_texture.texcoord)) : 0.0;
  const double metallicRoughnessTexCoord = pbr ? static_cast<double>(std::max(0, pbr->metallic_roughness_texture.texcoord)) : 0.0;
  const double occlusionTexCoord = material ? static_cast<double>(std::max(0, material->occlusion_texture.texcoord)) : 0.0;
  const double emissiveTexCoord = material ? static_cast<double>(std::max(0, material->emissive_texture.texcoord)) : 0.0;
  const double metallicFactor = pbr ? static_cast<double>(pbr->metallic_factor) : 1.0;
  const double roughnessFactor = pbr ? static_cast<double>(pbr->roughness_factor) : 1.0;
  const double occlusionStrength = material && material->occlusion_texture.texture ? static_cast<double>(material->occlusion_texture.scale) : 0.0;
  const double emissiveR = material ? static_cast<double>(material->emissive_factor[0]) : 0.0;
  const double emissiveG = material ? static_cast<double>(material->emissive_factor[1]) : 0.0;
  const double emissiveB = material ? static_cast<double>(material->emissive_factor[2]) : 0.0;
  const double sideMode = material && material->double_sided ? 2.0 : 0.0;
  const double alphaMode = material ? static_cast<double>(alphaModeCode(material->alpha_mode)) : 0.0;
  const double alphaCutoff = material ? static_cast<double>(material->alpha_cutoff) : 0.5;
  const double alphaFactor = baseA;

  const double createdHandle = createUploadedMeshBuffer(
    demoCode,
    1.0,
    16777215.0,
    geaVectorFromFloats(positions),
    geaVectorFromFloats(normals),
    geaVectorFromInts(indices),
    geaVectorFromFloats(colors),
    geaVectorFromFloats(uv0s),
    geaVectorFromFloats(uv1s),
    baseColorTextureHandle,
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
    alphaFactor
  );
  const int handle = static_cast<int>(createdHandle);
  UploadedMeshBuffer *buffer = findMutableUploadedMeshBuffer(handle);
  if (!buffer) return false;
  const int nodeIndex = cgltfNodeIndex(data, &node);
  scene.meshBufferHandles.push_back(handle);
  scene.meshBufferNodeIndices.push_back(nodeIndex);
  scene.sourceVertexCount += buffer->sourceVertexCount;
  scene.sourceIndexCount += buffer->sourceIndexCount;
  if (node.skin && !joints0.empty() && !weights0.empty()) {
    buffer->skinned = true;
    buffer->skinIndex = cgltfSkinIndex(data, node.skin);
    buffer->meshNodeIndex = nodeIndex;
    buffer->sourcePositions = positions;
    buffer->sourceNormals = normals;
    buffer->sourceColors = colors;
    buffer->sourceUv0s = uv0s;
    buffer->sourceUv1s = uv1s;
    buffer->sourceJoints0 = joints0;
    buffer->sourceWeights0 = weights0;
  }
  return true;
}

static void uploadCgltfNodeMeshes(
  const cgltf_data *data,
  const std::string &gltfPath,
  const std::vector<double> &textureHandles,
  UploadedMeshScene &scene,
  const cgltf_node *node,
  double demoCode
) {
  if (!node) return;
  if (node->mesh) {
    for (cgltf_size primitiveIndex = 0; primitiveIndex < node->mesh->primitives_count; primitiveIndex++) {
      uploadCgltfPrimitive(data, gltfPath, textureHandles, scene, *node, node->mesh->primitives[primitiveIndex], demoCode);
    }
  }
  for (cgltf_size childIndex = 0; childIndex < node->children_count; childIndex++) {
    uploadCgltfNodeMeshes(data, gltfPath, textureHandles, scene, node->children[childIndex], demoCode);
  }
}

static double createLittlestTokyoSceneFromGltf(double demoCode, const std::string &sourcePath) {
  const std::string gltfPath = sourcePath;
  cgltf_data *data = parseCgltfFile(gltfPath, true);
  if (!data) return 0.0;

  UploadedMeshScene scene;
  scene.handle = gAngle.nextMeshSceneHandle++;
  scene.demoCode = static_cast<int>(demoCode);
  scene.animated = true;
  scene.modelMatrix = multiply(translate(1.0f, 1.0f, 0.0f), scale(0.01f, 0.01f, 0.01f));

  std::vector<bool> animatedNodes;
  markAnimatedCgltfNodes(data, animatedNodes);
  initializeCgltfNodes(data, animatedNodes, scene);
  loadCgltfSkins(data, scene);
  loadCgltfAnimation(data, scene);
  updateSceneBindWorldMatrices(scene);

  std::vector<double> textureHandles;
  textureHandles.reserve(data->textures_count);
  for (cgltf_size textureIndex = 0; textureIndex < data->textures_count; textureIndex++) {
    textureHandles.push_back(createUploadedCgltfTexture(gltfPath, &data->textures[textureIndex]));
  }

  const cgltf_scene *sourceScene = data->scene ? data->scene : (data->scenes_count > 0 ? &data->scenes[0] : nullptr);
  if (sourceScene) {
    for (cgltf_size rootIndex = 0; rootIndex < sourceScene->nodes_count; rootIndex++) {
      uploadCgltfNodeMeshes(data, gltfPath, textureHandles, scene, sourceScene->nodes[rootIndex], demoCode);
    }
  }

  const int sceneHandle = scene.handle;
  const std::size_t partCount = scene.meshBufferHandles.size();
  const std::size_t vertexCount = scene.sourceVertexCount;
  const std::size_t indexCount = scene.sourceIndexCount;
  const std::size_t skinCount = scene.skins.size();
  const std::size_t skinnedPartCount = std::count_if(
    scene.meshBufferHandles.begin(),
    scene.meshBufferHandles.end(),
    [](int handle) {
      const UploadedMeshBuffer *buffer = findUploadedMeshBuffer(handle);
      return buffer && buffer->skinned;
    }
  );
  if (partCount == 0) {
    smokeLog("[three-angle-metal] glTF semantic scene had no uploadable mesh primitives: %s", gltfPath.c_str());
    cgltf_free(data);
    return 0.0;
  }
  gAngle.meshScenes.push_back(scene);
  smokeLog(
    "[three-angle-metal] uploaded native glTF Littlest Tokyo scene: handle=%d source=%s parts=%zu skinnedParts=%zu skins=%zu nodes=%zu channels=%zu duration=%.3f vertices=%zu indices=%zu",
    sceneHandle,
    gltfPath.c_str(),
    partCount,
    skinnedPartCount,
    skinCount,
    static_cast<std::size_t>(data->nodes_count),
    gAngle.meshScenes.back().animationChannels.size(),
    gAngle.meshScenes.back().animationDuration,
    vertexCount,
    indexCount
  );
  cgltf_free(data);
  return static_cast<double>(sceneHandle);
}

extern "C" double gea_three_angle_host_create_littlest_tokyo_scene(
  double demoCode,
  std::string scenePath
) {
  if (!gAngle.ready || !gAngle.rendererReady) return 0.0;
  if (!stringEndsWith(scenePath, ".bin")) {
    return createLittlestTokyoSceneFromGltf(demoCode, scenePath);
  }
  LittlestTokyoScenePayload payload;
  if (!loadLittlestTokyoScenePayload(scenePath, payload)) {
    smokeLog("[three-angle-metal] failed to load Littlest Tokyo scene payload: %s", scenePath.c_str());
    return 0.0;
  }

  UploadedMeshScene scene;
  scene.handle = gAngle.nextMeshSceneHandle++;
  scene.demoCode = static_cast<int>(demoCode);
  scene.animated = true;
  scene.modelMatrix = matFromFloatVector(payload.modelMatrix, 0);
  std::vector<double> textureHandles;
  textureHandles.reserve(payload.texturePaths.size());
  for (const std::string &texturePath : payload.texturePaths) {
    textureHandles.push_back(createUploadedTexture(texturePath));
  }

  auto geaVector = [](const std::vector<float> &values) {
    std::vector<gea_f32> out;
    out.reserve(values.size());
    for (float value : values) out.emplace_back(value);
    return out;
  };
  auto geaIndexVector = [](const std::vector<int> &values) {
    std::vector<gea_f32> out;
    out.reserve(values.size());
    for (int value : values) out.emplace_back(value);
    return out;
  };
  auto textureHandleAt = [&textureHandles](int textureIndex) -> double {
    if (textureIndex < 0 || static_cast<std::size_t>(textureIndex) >= textureHandles.size()) return 0.0;
    return textureHandles[static_cast<std::size_t>(textureIndex)];
  };

  scene.meshBufferHandles.reserve(payload.chunks.size());
  scene.meshBufferNodeIndices.reserve(payload.chunks.size());
  for (const LittlestTokyoScenePayload::Chunk &chunk : payload.chunks) {
    std::vector<gea_f32> positions = geaVector(chunk.positions);
    std::vector<gea_f32> normals = geaVector(chunk.normals);
    std::vector<gea_f32> indices = geaIndexVector(chunk.indices);
    std::vector<gea_f32> colors = geaVector(chunk.colors);
    std::vector<gea_f32> uv0s = geaVector(chunk.uv0s);
    std::vector<gea_f32> uv1s = geaVector(chunk.uv1s);
    const double createdHandle = createUploadedMeshBuffer(
      demoCode,
      1.0,
      16777215.0,
      positions,
      normals,
      indices,
      colors,
      uv0s,
      uv1s,
      textureHandleAt(chunk.textureIndex),
      textureHandleAt(chunk.metallicRoughnessTextureIndex),
      textureHandleAt(chunk.occlusionTextureIndex),
      textureHandleAt(chunk.emissiveTextureIndex),
      static_cast<double>(chunk.baseColorTexCoord),
      static_cast<double>(chunk.metallicRoughnessTexCoord),
      static_cast<double>(chunk.occlusionTexCoord),
      static_cast<double>(chunk.emissiveTexCoord),
      static_cast<double>(chunk.metallicFactor),
      static_cast<double>(chunk.roughnessFactor),
      static_cast<double>(chunk.occlusionStrength),
      static_cast<double>(chunk.emissiveR),
      static_cast<double>(chunk.emissiveG),
      static_cast<double>(chunk.emissiveB),
      static_cast<double>(chunk.sideMode),
      static_cast<double>(chunk.alphaMode),
      static_cast<double>(chunk.alphaCutoff),
      static_cast<double>(chunk.alphaFactor)
    );
    const int handle = static_cast<int>(createdHandle);
    const UploadedMeshBuffer *buffer = findUploadedMeshBuffer(handle);
    if (!buffer) continue;
    scene.meshBufferHandles.push_back(handle);
    scene.meshBufferNodeIndices.push_back(chunk.nodeIndex);
    scene.sourceVertexCount += buffer->sourceVertexCount;
    scene.sourceIndexCount += buffer->sourceIndexCount;
  }
  if (scene.meshBufferHandles.empty()) return 0.0;

  const std::size_t nodeCount = payload.nodeParentIndices.size();
  scene.nodes.reserve(nodeCount);
  for (std::size_t nodeIndex = 0; nodeIndex < nodeCount; nodeIndex++) {
    AnimatedNode node;
    node.parent = payload.nodeParentIndices[nodeIndex];
    node.trsMode = nodeIndex < payload.nodeTrsModes.size() ? payload.nodeTrsModes[nodeIndex] : 1;
    node.baseMatrix = matFromFloatVector(payload.nodeBaseMatrices, nodeIndex * 16);
    if (nodeIndex * 3 + 2 < payload.nodeBaseTranslations.size()) {
      node.baseTranslation = Vec3{
        payload.nodeBaseTranslations[nodeIndex * 3],
        payload.nodeBaseTranslations[nodeIndex * 3 + 1],
        payload.nodeBaseTranslations[nodeIndex * 3 + 2],
      };
    }
    if (nodeIndex * 4 + 3 < payload.nodeBaseRotations.size()) {
      node.baseRotation = Quat{
        payload.nodeBaseRotations[nodeIndex * 4],
        payload.nodeBaseRotations[nodeIndex * 4 + 1],
        payload.nodeBaseRotations[nodeIndex * 4 + 2],
        payload.nodeBaseRotations[nodeIndex * 4 + 3],
      };
    }
    if (nodeIndex * 3 + 2 < payload.nodeBaseScales.size()) {
      node.baseScale = Vec3{
        payload.nodeBaseScales[nodeIndex * 3],
        payload.nodeBaseScales[nodeIndex * 3 + 1],
        payload.nodeBaseScales[nodeIndex * 3 + 2],
      };
    }
    scene.nodes.push_back(node);
  }

  const std::size_t channelCount = std::min(
    std::min(payload.animationChannelNodeIndices.size(), payload.animationChannelPathCodes.size()),
    std::min(
      std::min(payload.animationChannelInputOffsets.size(), payload.animationChannelInputCounts.size()),
      payload.animationChannelOutputOffsets.size()
    )
  );
  scene.animationChannels.reserve(channelCount);
  for (std::size_t channelIndex = 0; channelIndex < channelCount; channelIndex++) {
    scene.animationChannels.push_back(AnimationChannel{
      payload.animationChannelNodeIndices[channelIndex],
      payload.animationChannelPathCodes[channelIndex],
      payload.animationChannelInputOffsets[channelIndex],
      payload.animationChannelInputCounts[channelIndex],
      payload.animationChannelOutputOffsets[channelIndex],
    });
  }
  scene.animationTimes = payload.animationTimes;
  scene.animationValues = payload.animationValues;
  scene.animationDuration = payload.animationDuration;
  updateSceneBindWorldMatrices(scene);

  const int sceneHandle = scene.handle;
  const std::size_t partCount = scene.meshBufferHandles.size();
  const std::size_t vertexCount = scene.sourceVertexCount;
  const std::size_t indexCount = scene.sourceIndexCount;
  const std::size_t storedNodeCount = scene.nodes.size();
  const std::size_t storedChannelCount = scene.animationChannels.size();
  gAngle.meshScenes.push_back(scene);
  smokeLog(
    "[three-angle-metal] uploaded native Littlest Tokyo scene: handle=%d parts=%zu nodes=%zu channels=%zu duration=%.3f vertices=%zu indices=%zu",
    sceneHandle,
    partCount,
    storedNodeCount,
    storedChannelCount,
    payload.animationDuration,
    vertexCount,
    indexCount
  );
  return static_cast<double>(sceneHandle);
}

extern "C" void gea_three_angle_host_render_mesh_scene(
  double sceneHandle,
  double demoCode,
  double materialCode,
  double materialColor,
  double backgroundColor,
  double cameraFov,
  double cameraAspect,
  double cameraNear,
  double cameraFar,
  double cameraX,
  double cameraY,
  double cameraZ,
  double cameraLookAtX,
  double cameraLookAtY,
  double cameraLookAtZ,
  double rotationX,
  double rotationY,
  double rotationZ,
  double timestampMs
) {
  if (!gAngle.ready || !gAngle.rendererReady) return;
  UploadedMeshScene *scene = findMutableUploadedMeshScene(static_cast<int>(sceneHandle));
  if (!scene) return;
  logFirstBufferFrameIfNeeded(
    demoCode,
    materialCode,
    scene->sourceVertexCount,
    0,
    scene->sourceIndexCount
  );
  if (!makeCurrentForRender("eglMakeCurrent(mesh-scene-render)")) return;
  SceneFrame frame = makeSceneFrame(
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
    timestampMs
  );
  applyNativeOrbitCamera(frame);
  updateAnimatedScene(*scene, frame);
  bool drewAnyPart = false;
  for (std::size_t partIndex = 0; partIndex < scene->meshBufferHandles.size(); partIndex++) {
    const int meshBufferHandle = scene->meshBufferHandles[partIndex];
    UploadedMeshBuffer *buffer = findMutableUploadedMeshBuffer(meshBufferHandle);
    if (!buffer) continue;
    if (buffer->alphaMode == 2) continue;
    const Mat4 modelMatrix = modelMatrixForScenePart(*scene, partIndex);
    updateSkinnedMeshBuffer(*scene, *buffer, modelMatrix);
    drawUploadedVertices(frame, *buffer, modelMatrix, !drewAnyPart);
    drewAnyPart = true;
  }
  for (std::size_t partIndex = 0; partIndex < scene->meshBufferHandles.size(); partIndex++) {
    const int meshBufferHandle = scene->meshBufferHandles[partIndex];
    UploadedMeshBuffer *buffer = findMutableUploadedMeshBuffer(meshBufferHandle);
    if (!buffer) continue;
    if (buffer->alphaMode != 2) continue;
    const Mat4 modelMatrix = modelMatrixForScenePart(*scene, partIndex);
    updateSkinnedMeshBuffer(*scene, *buffer, modelMatrix);
    drawUploadedVertices(frame, *buffer, modelMatrix, !drewAnyPart);
    drewAnyPart = true;
  }
  if (!drewAnyPart) return;
  recordNativeFrameFps(frame, static_cast<int>(demoCode), scene->sourceVertexCount, scene->sourceIndexCount, "scene");
  swapRenderedFrame("eglSwapBuffers(mesh-scene-render)");
}
