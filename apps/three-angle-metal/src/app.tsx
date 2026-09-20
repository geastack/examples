import { CGRectMake } from '@geastack/apple/CoreGraphics'
import {
  NSColor,
  NSFont,
  NSViewHeightSizable,
  NSViewWidthSizable,
  NSTextField,
  NSView,
  installRootView,
} from '@geastack/apple/AppKit'
import {
  attachNativeWebGL,
  logNativeWebGL,
  syncNativeWebGLSize,
} from '@geastack/native-webgl-angle/nativeWebGLHost'

export function mountThreeAngleMetal(startFrameLoop: (width: number, height: number, aspect: number) => void): void {
  logNativeWebGL("mounting apple-native Three ANGLE Metal WebGL shim")
  console.error("[three-angle-metal] mounting apple-native Three ANGLE Metal probe")
  const width = 1280
  const height = 800
  const aspect = width / height
  const stageView = (
    <NSView
      frame={CGRectMake(0, 0, width, height)}
      wantsLayer={true}
      autoresizingMask={NSViewWidthSizable + NSViewHeightSizable}
      layer={{
        cornerRadius: 0,
      }}
    />
  ) as NSView

  const frameCounterLabel = (
    <NSTextField
      frame={CGRectMake(16, 16, 260, 24)}
      stringValue="Frame 0  0.0 FPS"
      editable={false}
      selectable={false}
      bezeled={false}
      bordered={false}
      drawsBackground={true}
      backgroundColor={NSColor.colorWithWhiteAlpha(0, 0.42)}
      textColor={NSColor.whiteColor()}
      font={NSFont.boldSystemFontOfSize(13)}
    />
  ) as NSTextField

  const root = (
    <NSView
      frame={CGRectMake(0, 0, width, height)}
      wantsLayer={true}
      autoresizingMask={NSViewWidthSizable + NSViewHeightSizable}
    >
      {stageView}
      {frameCounterLabel}
    </NSView>
  ) as NSView

  installRootView(root)

  logNativeWebGL("attaching ANGLE Metal WebGL host")
  console.error("[three-angle-metal] attaching ANGLE Metal host")
  const hostReady = attachNativeWebGL(stageView, width, height, 2)
  logNativeWebGL(hostReady ? "ANGLE Metal WebGL host ready" : "ANGLE Metal WebGL host unavailable")
  console.error(hostReady ? "[three-angle-metal] ANGLE Metal host ready" : "[three-angle-metal] ANGLE Metal host unavailable")
  if (!hostReady) {
    frameCounterLabel.stringValue = "ANGLE unavailable"
    return
  }
  console.error("[three-angle-metal] syncing initial ANGLE size")
  const initialAspect = syncNativeWebGLSize(aspect)
  console.error("[three-angle-metal] initial ANGLE aspect " + initialAspect)
  let frameCount = 0
  let fpsFrameCount = 0
  let fpsWindowStartMs = 0
  let latestFps = 0
  let lastCounterUpdateMs = -1000
  requestAnimationFrame(function counterFrame(timestampMs: number): void {
    frameCount++
    if (fpsWindowStartMs <= 0) fpsWindowStartMs = timestampMs
    fpsFrameCount++
    const fpsElapsedMs = timestampMs - fpsWindowStartMs
    if (fpsElapsedMs >= 500) {
      latestFps = fpsFrameCount * 1000 / fpsElapsedMs
      fpsFrameCount = 0
      fpsWindowStartMs = timestampMs
    }
    if (timestampMs - lastCounterUpdateMs >= 250 || frameCount === 1) {
      lastCounterUpdateMs = timestampMs
      frameCounterLabel.stringValue = "Frame " + frameCount + "  " + latestFps.toFixed(1) + " FPS"
    }
    requestAnimationFrame(counterFrame)
  })
  startFrameLoop(width, height, aspect)
}
