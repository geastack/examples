declare module '@geajs/core/jsx-runtime' {
  type GeaJsxElement = import('@geastack/core').GeaJsxElement
  type GeaJsxElementChildrenAttribute = import('@geastack/core').GeaJsxElementChildrenAttribute
  type GeaIntrinsicElements = import('@geastack/core').GeaIntrinsicElements

  export namespace JSX {
    interface Element extends GeaJsxElement {}
    interface ElementChildrenAttribute extends GeaJsxElementChildrenAttribute {}
    interface IntrinsicElements extends GeaIntrinsicElements {}
  }

  export function jsx(type: any, props: any, key?: string): any
  export const jsxs: typeof jsx
  export const Fragment: (props: { children?: any }) => any
}
