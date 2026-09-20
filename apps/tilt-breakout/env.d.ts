interface Window {
  readonly innerWidth: number
  readonly innerHeight: number
}

declare const window: Window
declare function requestAnimationFrame(cb: (timestampMs: number) => void): number
declare module '*.css'
