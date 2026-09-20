declare module '*.css'
declare const window: {
  readonly innerWidth: number
  readonly innerHeight: number
}
declare function requestAnimationFrame(cb: (timestampMs: number) => void): number
