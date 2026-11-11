import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { geaPlugin } from '@geajs/vite-plugin'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default {
  root: __dirname,
  plugins: [geaPlugin()],
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    modulePreload: { polyfill: false },
  },
}
