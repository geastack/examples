import { defineConfig } from 'vite'
import { geaPlugin } from '@geajs/vite-plugin'

const web = process.env.GEA_EMBEDDED_TARGET === 'web'
const appId = 'gea-bench'

export default defineConfig({
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
      formats: [web ? 'es' : 'iife'],
      ...(web ? {} : { name: 'gea_embedded' }),
      fileName: () => (web ? 'app.js' : 'index.js')
    },
    outDir: web ? 'dist' : `../../targets/esp32-s3-touch-amoled-2.06/build/apps/${appId}/dist`,
    emptyOutDir: !web,
    minify: false
  }
})
