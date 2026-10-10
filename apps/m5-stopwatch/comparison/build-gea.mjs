import { copyFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseArgs } from '../../../../cli/src/args.mjs'
import { createContext, createChildEnv } from '../../../../cli/src/context.mjs'
import { selectBoard } from '../../../../cli/src/commands/board.mjs'
import { resolveRequestedApp } from '../../../../cli/src/manifest.mjs'
import { buildEsp32Firmware, esp32BuildDir } from '../../../../cli/src/esp32/build.mjs'

const variant = process.argv[2] || 'production'

if (!['production', 'benchmark'].includes(variant)) {
  throw new Error('Usage: node comparison/build-gea.mjs production|benchmark')
}

const root = fileURLToPath(new URL('../../../../', import.meta.url))
const examples = path.join(root, 'examples')
const env = {
  ...process.env,
  GEATSC2_GEA_PLUGIN: path.join(root, 'core/packages/geatsc-plugin-gea/dist/host-shims'),
  GEA_TARGETS_ROOT: path.join(root, 'targets'),
  GEA_COMPILER_DIR: path.join(root, 'compiler'),
  GEA_CORE_DIR: path.join(root, 'core/packages/core'),
  GEA_HOST_DIR: path.join(root, 'core/packages/host'),
  GEA_ENGINE_DIR: path.join(root, 'core/packages/engine'),
  GEA_ELEMENTS_DIR: path.join(root, 'core/packages/elements'),
  GEA_PLUGIN_DIR: path.join(root, 'core/packages/geatsc-plugin-gea'),
  GEA_IDF_JOBS: '2',
}
const parsed = parseArgs(['--board', 'stopwatch', '--app', 'm5-stopwatch'])
const ctx = createContext(parsed, env, examples)
const selection = selectBoard(ctx, parsed)
const sourceApp = resolveRequestedApp(ctx, parsed)
const app = {
  ...sourceApp,
  defines: [
    ...sourceApp.defines,
    ...(variant === 'benchmark' ? ['GEA_EMBEDDED_COMPARISON_BENCHMARK=1'] : []),
  ],
}
const buildDir = esp32BuildDir(ctx, selection, app.id, env)

if (!existsSync(buildDir)) {
  throw new Error(`Use the existing app build output: ${buildDir}`)
}

env.TMPDIR = buildDir
await buildEsp32Firmware({ ctx, selection, app, env: createChildEnv(ctx, env) })
for (const [source, suffix] of [
  ['gea_embedded.bin', 'bin'],
  ['gea_embedded.elf', 'elf'],
  ['gea_embedded.map', 'map'],
  ['sdkconfig', 'sdkconfig'],
  ['gea-build-config.json', 'build-config.json'],
  ['build.ninja', 'build.ninja'],
  ['project_description.json', 'project-description.json'],
  ['flasher_args.json', 'flasher-args.json'],
]) {
  copyFileSync(path.join(buildDir, source), path.join(buildDir, `gea-${variant}.${suffix}`))
}

console.log(`Preserved ${variant} artifacts in ${buildDir}`)
