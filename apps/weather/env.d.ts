declare module '*.css'

declare module '@geajs/core/jsx-runtime' {
  import type { GeaIntrinsicElements, GeaJsxElement, GeaJsxElementChildrenAttribute } from '@geastack/core'

  export namespace JSX {
    interface Element extends GeaJsxElement {}
    interface ElementChildrenAttribute extends GeaJsxElementChildrenAttribute {}
    interface IntrinsicElements extends GeaIntrinsicElements {}
  }

  export function jsx(type: unknown, props: unknown, key?: string | number): unknown
  export const jsxs: typeof jsx
  export function Fragment(props: { children?: unknown }): unknown
}

declare module '@geajs/core/jsx-dev-runtime' {
  export * from '@geajs/core/jsx-runtime'
}

// Build-time env vars from the app's .env, inlined as process.env.<KEY> string
// literals by the gea build (see core/packages/core/scripts/dotenv-defines.mjs).
// This declaration only satisfies the app's own type-check — at compile time each
// access is replaced by a literal, so no `process` object exists at runtime.
declare const process: {
  readonly env: Record<string, string>
}

