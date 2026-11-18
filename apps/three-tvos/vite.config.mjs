// Native builds compile three.js from its sources with @geastack/native-webgl-angle's
// WebGL in place of the browser's: the aliases swap three's few browser-only
// modules for native ones, and the module-graph plugin records every module
// for the compiler.
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(path.join(here, 'package.json'))
const threeSrc = path.dirname(require.resolve('three/src/Three.js'))
const nativeRoot = path.dirname(require.resolve('@geastack/native-webgl-angle/package.json'))
const nativeModule = (name) => path.join(nativeRoot, 'src', `${name}.ts`)
const core = path.dirname(require.resolve('@geastack/core/package.json'))
const { geaAppleNativeModuleAliases, geaModuleGraphPlugins } = await import(
  pathToFileURL(path.join(core, 'scripts/gea-vite-module-graph-plugin.mjs')).href
)

export default {
  resolve: {
    alias: [
      ...geaAppleNativeModuleAliases({
        threeSrcDir: threeSrc,
        threeUtilsModule: nativeModule('nativeThreeUtils'),
        threeWebGLAnimationModule: nativeModule('nativeWebGLAnimation'),
        threeWebXRManagerModule: nativeModule('nativeWebXRManager'),
      }),
      { find: /^@geastack\/native-webgl-angle\/(.+)$/, replacement: path.join(nativeRoot, 'src/$1.ts') },
    ],
  },
  plugins: [...geaModuleGraphPlugins({ entryReachableOnly: true })],
  build: {
    lib: { entry: path.join(here, 'index.ts'), formats: ['es'], fileName: () => 'index.js' },
    minify: false,
  },
}
