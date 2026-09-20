import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { appleNativeJsxPlugin, geaEmptyIrPlugin } from '@geastack/vite-plugin-apple-native'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default {
  plugins: [appleNativeJsxPlugin(), geaEmptyIrPlugin()],
  build: {
    lib: {
      entry: resolve(__dirname, 'index.ts'),
      formats: ['iife'],
      name: 'gea_ios_device_showcase',
      fileName: () => 'index.js',
    },
    emptyOutDir: true,
    minify: false,
  },
}
