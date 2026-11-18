import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { geaEmptyIrPlugin } from '@geastack/vite-plugin-apple-native'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default {
  plugins: [geaEmptyIrPlugin()],
  build: {
    lib: { entry: resolve(__dirname, 'index.ts'), formats: ['iife'], name: 'gea_three_tvos', fileName: () => 'index.js' },
    emptyOutDir: true,
    minify: false,
  },
}
