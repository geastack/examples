import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const defaultSourceListPath = resolve(scriptDir, '../../../../apple/targets/macos/generated/three-angle-metal/geatsc-sources.txt')
const args = process.argv.slice(2)
const strictSources = args.includes('--strict-sources')
const inputPath = args.find((arg) => !arg.startsWith('--')) ?? defaultSourceListPath

if (!existsSync(inputPath)) {
  console.error(`Missing generated C++ source list/file: ${inputPath}`)
  console.error('This audit only inspects existing generated files; it does not build the app.')
  process.exit(1)
}

const generatedSources = readGeneratedSources(inputPath)
const source = generatedSources.map(({ file, text }) => `\n// @generated-file ${file}\n${text}`).join('\n')
const lines = source.split(/\r?\n/)
const bannedTokens = ['gea_cpp_value', 'gea_cpp_key']
const bridgePatterns = [
  /\bthreeWebGL/,
  /\bgea_three_webgl/,
  /\bnativeWebGL/,
  /\bNativeWebGL/,
  /\bWebGL(?:2RenderingContext|RenderingContext|Buffer|Framebuffer|Program|Renderbuffer|Shader|Texture|UniformLocation)\b/,
]

const containsBannedToken = (text) => bannedTokens.some((token) => text.includes(token))
const isBridgeLine = (text) => bridgePatterns.some((pattern) => pattern.test(text))
const count = (needle) => source.split(needle).length - 1
const failures = []

if (strictSources) {
  lines.forEach((line, index) => {
    if (containsBannedToken(line)) failures.push(`${index + 1}: ${line.trim()}`)
  })
} else {
  const bridgeWindowLines = new Set()
  lines.forEach((line, index) => {
    if (!isBridgeLine(line)) return
    for (let offset = -8; offset <= 8; offset += 1) {
      const candidate = index + offset
      if (candidate >= 0 && candidate < lines.length) bridgeWindowLines.add(candidate)
    }
  })

  for (const index of bridgeWindowLines) {
    const line = lines[index]
    if (containsBannedToken(line)) failures.push(`${index + 1}: ${line.trim()}`)
  }
}

console.log('three-angle-metal native WebGL bridge audit')
console.log(`input: ${inputPath}`)
console.log(`sources: ${generatedSources.length}`)
console.log(`mode: ${strictSources ? 'strict-sources' : 'bridge-window'}`)
console.log(`gea_cpp_value: ${count('gea_cpp_value')}`)
console.log(`gea_cpp_key: ${count('gea_cpp_key')}`)

if (failures.length > 0) {
  console.error('\nBoxed dynamic values found in the audited scope:')
  for (const failure of failures.slice(0, 80)) console.error(`- ${failure}`)
  if (failures.length > 80) console.error(`- ... ${failures.length - 80} more`)
  process.exit(1)
}

function readGeneratedSources(input) {
  if (input.endsWith('geatsc-sources.txt')) {
    return readFileSync(input, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((file) => existsSync(file))
      .map((file) => ({ file, text: readFileSync(file, 'utf8') }))
  }
  return [{ file: input, text: readFileSync(input, 'utf8') }]
}
