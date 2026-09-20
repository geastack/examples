import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { appleNativeJsxPlugin, geaEmptyIrPlugin } from '@geastack/vite-plugin-apple-native'

const __dirname = dirname(fileURLToPath(import.meta.url))

function threeGeatscCompatibilityPlugin() {
  return {
    name: 'three-geatsc-compatibility',
    transform(code: string, id: string) {
      if (
        id.endsWith('/three/src/renderers/webgl/WebGLBindingStates.js')
        || id.endsWith('/three/build/three.module.js')
      ) {
        return {
          code: code.replace(
            /const wireframe = \(? material\.wireframe === true \)?;/,
            "const wireframe = material.wireframe === true ? 'wireframe' : 'solid';",
          ),
          map: null,
        }
      }
      return null
    },
  }
}

export default {
  plugins: [
    threeGeatscCompatibilityPlugin(),
    appleNativeJsxPlugin(),
    geaEmptyIrPlugin(),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'index.tsx'),
      formats: ['iife'],
      name: 'gea_three_angle_metal',
      fileName: () => 'index.js',
    },
    emptyOutDir: true,
    minify: false,
  },
}
