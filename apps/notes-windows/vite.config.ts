import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { windowsNativeVitePlugins } from '@geastack/vite-plugin-windows-native'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default {
  plugins: windowsNativeVitePlugins(),
  build: {
    lib: {
      entry: resolve(__dirname, 'index.ts'),
      formats: ['iife'],
      name: 'gea_notes_windows',
      fileName: () => 'index.js',
    },
    emptyOutDir: true,
    minify: false,
  },
}
