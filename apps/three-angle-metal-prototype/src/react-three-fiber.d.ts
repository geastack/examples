declare module '@react-three/fiber' {
  export function Canvas(
    props: import('./threeJsx').ThreeCanvasProps,
  ): import('./threeJsx').ThreeSceneElement
}
