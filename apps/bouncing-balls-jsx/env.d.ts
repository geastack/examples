interface Screen {
  readonly width: number
  readonly height: number
  color(r: number, g: number, b: number): number
  clear(): void
  fillCircle(x: number, y: number, r: number, color: number): void
}

interface Window {
  readonly innerWidth: number
  readonly innerHeight: number
}

declare const screen: Screen
declare const window: Window
declare function requestAnimationFrame(cb: (timestampMs: number) => void): number
declare module '*.css'
