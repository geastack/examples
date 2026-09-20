import { fileURLToPath } from 'node:url'
import { appleNativeJsxPlugin, geaEmptyIrPlugin } from '@geastack/vite-plugin-apple-native'

export default {
  resolve: { alias: process.env.GEA_WEBGL_AUTO_INSTANCE_TEST === '1' ? [{
    find: '@geastack/native-webgl-angle/test/batched-render-scene',
    replacement: fileURLToPath(import.meta.resolve('@geastack/native-webgl-angle/test/auto-instanced-render-scene')),
  }] : [] },
  plugins: [appleNativeJsxPlugin(), geaEmptyIrPlugin()],
  build: {
    lib: {
      entry: fileURLToPath(new URL('./index.tsx', import.meta.url)),
      formats: ['iife'],
      name: 'gea_batched_mesh_validation',
      fileName: () => 'index.js',
    },
    minify: false,
  },
}
