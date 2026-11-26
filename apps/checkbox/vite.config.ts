import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { geaPlugin } from '@geajs/vite-plugin'

const __dirname = dirname(fileURLToPath(import.meta.url))
const web = process.env.GEA_EMBEDDED_TARGET !== 'web'
const appId = 'checkbox'

export default {
  root: __dirname,
  plugins: [
    geaPlugin({
      ir: process.env.GEA_IR_OUT
        ? { enabled: true, outFile: process.env.GEA_IR_OUT }
        : undefined
    })
  ],
  build: {
    lib: {
      entry: 'index.tsx',
      formats: [web ? 'iife' : 'es'],
      ...(web ? { name: 'gea_embedded' } : {}),
      fileName: () => (web ? 'index.js' : 'app.js')
    },
    outDir: web
      ? resolve(__dirname, 'dist')
      : resolve(__dirname, `../../targets/esp32-s3-touch-amoled-2.06/build/apps/${appId}/dist`),
    emptyOutDir: true,
    minify: false,
    modulePreload: { polyfill: false }
  }
}
