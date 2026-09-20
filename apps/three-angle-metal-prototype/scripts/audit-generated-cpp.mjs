import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const defaultProgramPath = resolve(scriptDir, '../../../../apple/targets/macos/generated/three-angle-metal/program.cpp')
const programPath = process.argv.find((arg) => arg.endsWith('.cpp')) ?? defaultProgramPath
const allowUpstream = process.argv.includes('--allow-upstream')

if (!existsSync(programPath)) {
  console.error(`Missing generated C++: ${programPath}`)
  console.error('Build the app first, then run this audit.')
  process.exit(1)
}

const source = readFileSync(programPath, 'utf8')
const topLevelMarker = 'void __gea_top_level()'
const topLevelIndex = source.indexOf(topLevelMarker)
const topLevelSource = topLevelIndex >= 0 ? source.slice(topLevelIndex) : ''
const countIn = (text, needle) => text.split(needle).length - 1
const count = (needle) => countIn(source, needle)
const counts = {
  createUpstreamThreeProbeScenes: count('createUpstreamThreeProbeScenes'),
  realThreeBoxGeometry: count('class __gea_local_BoxGeometry'),
  realThreeCircleGeometry: count('class __gea_local_CircleGeometry'),
  realThreeConeGeometry: count('class __gea_local_ConeGeometry'),
  realThreeCylinderGeometry: count('class __gea_local_CylinderGeometry'),
  realThreePlaneGeometry: count('class __gea_local_PlaneGeometry'),
  realThreeRingGeometry: count('class __gea_local_RingGeometry'),
  realThreeSphereGeometry: count('class __gea_local_SphereGeometry'),
  realThreeTorusGeometry: count('class __gea_local_TorusGeometry'),
  realThreeTorusKnotGeometry: count('class __gea_local_TorusKnotGeometry'),
  geaCppValue: count('gea_cpp_value'),
  geaCppKey: count('gea_cpp_key'),
  appGeaCppValue: countIn(topLevelSource, 'gea_cpp_value'),
  appGeaCppKey: countIn(topLevelSource, 'gea_cpp_key'),
  appNativeAssignTarget: countIn(topLevelSource, '__GeaNativeAssignTarget'),
  mutableGeaCppValue: count('mutable gea_cpp_value'),
  geaCppDynamicProps: count('gea_cpp_dynamic_props'),
  recordGetLiteral: count('record_get_literal'),
  recordSetLiteral: count('record_set_literal'),
  vectorDouble: count('std::vector<double>'),
  vectorF32: count('std::vector<gea_f32>'),
  vectorDoubleFallbackCast: count('vector_fallback_cast<double>'),
  hostCreateMeshBufferByValue: count('gea_three_angle_host_create_mesh_buffer(double demoCode, double materialCode, double materialColor, std::vector<double> positions'),
  hostCreateTexturedMeshBufferByValue: count('gea_three_angle_host_create_textured_mesh_buffer(double demoCode, double materialCode, double materialColor, std::vector<double> positions'),
  arrayRecordGetProperty: count('gea_cpp_record_get_property(__gea_array'),
  hostCreateTexture: count('gea_three_angle_host_create_texture'),
  hostCreateTexturedMeshBuffer: count('gea_three_angle_host_create_textured_mesh_buffer'),
  hostRenderMeshBuffer: count('gea_three_angle_host_render_mesh_buffer'),
  hostRenderMeshScene: count('gea_three_angle_host_render_mesh_scene'),
}

const strictDefaultLimits = {
  // The default JSX path must stay fully typed: no boxed values, no dynamic
  // keys, no record-literal bridge helpers anywhere in generated C++.
  geaCppValue: 0,
  geaCppKey: 0,
  recordGetLiteral: 0,
  recordSetLiteral: 0,
  // The default path keeps only small descriptor/native metadata in double
  // vectors; high-volume mesh payloads should stay f32-native.
  vectorDouble: 64,
}

const strictUpstreamLimits = {
  // Upstream mode intentionally compiles real Three.js JavaScript geometry
  // constructors. App-level boxes are still forbidden below; these remaining
  // budgets pin non-app/runtime residue while typed lowering is expanded.
  geaCppValue: 3218,
  geaCppKey: 772,
  mutableGeaCppValue: 42,
  geaCppDynamicProps: 6,
  recordGetLiteral: 97,
  recordSetLiteral: 687,
  // The real-Three path should keep high-volume mesh payloads f32-native; the
  // remaining double vectors are metadata and upstream runtime residue.
  vectorDouble: 40,
  vectorDoubleFallbackCast: 0,
  arrayRecordGetProperty: 0,
}

const failures = []
const assertMax = (name, actual, max) => {
  if (actual > max) failures.push(`${name}=${actual} exceeds ${max}`)
}
const assertZero = (name, actual) => assertMax(name, actual, 0)
const assertAbsent = (label, pattern) => {
  if (pattern.test(source)) failures.push(label)
}
const assertNoLegacyMeshSceneRenderer = () => {
  assertAbsent('program must not emit JS fallback mesh scene renderer', /\bangleHostRenderMeshScene\b/)
  if (counts.hostRenderMeshBuffer === 0 && counts.hostRenderMeshScene === 0) {
    failures.push('program must render uploaded mesh buffers by native handle')
  }
}

if (!allowUpstream) {
  if (topLevelIndex < 0) failures.push(`missing ${topLevelMarker}`)
  assertZero('createUpstreamThreeProbeScenes', counts.createUpstreamThreeProbeScenes)
  assertZero('app gea_cpp_value', counts.appGeaCppValue)
  assertZero('app gea_cpp_key', counts.appGeaCppKey)
  assertZero('app __GeaNativeAssignTarget', counts.appNativeAssignTarget)
  assertZero('mutable gea_cpp_value', counts.mutableGeaCppValue)
  assertZero('gea_cpp_dynamic_props', counts.geaCppDynamicProps)
  assertZero('vector_fallback_cast<double>', counts.vectorDoubleFallbackCast)
  assertZero('by-value mesh-buffer host bridge', counts.hostCreateMeshBufferByValue)
  assertZero('by-value textured mesh-buffer host bridge', counts.hostCreateTexturedMeshBufferByValue)
  assertZero('gea_cpp_record_get_property(__gea_array', counts.arrayRecordGetProperty)
  assertNoLegacyMeshSceneRenderer()
  assertAbsent('default program must not include upstream geometry classes', /class __gea_local_(BoxGeometry|CircleGeometry|ConeGeometry|CylinderGeometry|PlaneGeometry|RingGeometry|SphereGeometry|TorusGeometry|TorusKnotGeometry)_/)
  assertAbsent('default program must not box AppKit host class NSColor', /auto\s+NSColor\s*=\s*std::make_shared<gea_cpp_value>/)
  assertAbsent('default program must not box AppKit host class NSView', /auto\s+NSView\s*=\s*std::make_shared<gea_cpp_value>/)
  assertAbsent('default program must not box AppKit host class NSBox', /auto\s+NSBox\s*=\s*std::make_shared<gea_cpp_value>/)
  assertAbsent('default program must not box AppKit host class NSTextField', /auto\s+NSTextField\s*=\s*std::make_shared<gea_cpp_value>/)
  assertAbsent('default program must not box AppKit host class NSFont', /auto\s+NSFont\s*=\s*std::make_shared<gea_cpp_value>/)
  assertAbsent('default program must not emit AppKit native-only marker functions', /\bgeaAppleAppKitNativeOnly\b/)
  assertAbsent('default program must not emit CoreGraphics native-only marker functions', /\bgeaAppleCoreGraphicsNativeOnly\b/)
  assertAbsent('default program must not dynamically get NSView.layer', /record_get_literal\("layer"\)/)
  assertMax('gea_cpp_value', counts.geaCppValue, strictDefaultLimits.geaCppValue)
  assertMax('gea_cpp_key', counts.geaCppKey, strictDefaultLimits.geaCppKey)
  assertMax('record_get_literal', counts.recordGetLiteral, strictDefaultLimits.recordGetLiteral)
  assertMax('record_set_literal', counts.recordSetLiteral, strictDefaultLimits.recordSetLiteral)
  assertMax('std::vector<double>', counts.vectorDouble, strictDefaultLimits.vectorDouble)
} else {
  if (topLevelIndex < 0) failures.push(`missing ${topLevelMarker}`)
  assertZero('app gea_cpp_value', counts.appGeaCppValue)
  assertZero('app gea_cpp_key', counts.appGeaCppKey)
  assertZero('app __GeaNativeAssignTarget', counts.appNativeAssignTarget)
  assertMax('real Three BoxGeometry constructors', counts.realThreeBoxGeometry, 2)
  assertMax('real Three CircleGeometry constructors', counts.realThreeCircleGeometry, 2)
  assertMax('real Three ConeGeometry constructors', counts.realThreeConeGeometry, 2)
  assertMax('real Three CylinderGeometry constructors', counts.realThreeCylinderGeometry, 2)
  assertMax('real Three PlaneGeometry constructors', counts.realThreePlaneGeometry, 2)
  assertMax('real Three RingGeometry constructors', counts.realThreeRingGeometry, 2)
  assertMax('real Three SphereGeometry constructors', counts.realThreeSphereGeometry, 2)
  assertMax('real Three TorusGeometry constructors', counts.realThreeTorusGeometry, 2)
  assertMax('real Three TorusKnotGeometry constructors', counts.realThreeTorusKnotGeometry, 2)
  if (counts.realThreeBoxGeometry === 0) failures.push('upstream program must include real Three BoxGeometry')
  if (counts.realThreeCircleGeometry === 0) failures.push('upstream program must include real Three CircleGeometry')
  if (counts.realThreeConeGeometry === 0) failures.push('upstream program must include real Three ConeGeometry')
  if (counts.realThreeCylinderGeometry === 0) failures.push('upstream program must include real Three CylinderGeometry')
  if (counts.realThreePlaneGeometry === 0) failures.push('upstream program must include real Three PlaneGeometry')
  if (counts.realThreeRingGeometry === 0) failures.push('upstream program must include real Three RingGeometry')
  if (counts.realThreeSphereGeometry === 0) failures.push('upstream program must include real Three SphereGeometry')
  if (counts.realThreeTorusGeometry === 0) failures.push('upstream program must include real Three TorusGeometry')
  if (counts.realThreeTorusKnotGeometry === 0) failures.push('upstream program must include real Three TorusKnotGeometry')
  assertAbsent('upstream program must not use legacy probe scene factory', /\bcreateUpstreamThreeProbeScenes\b/)
  assertMax('mutable gea_cpp_value', counts.mutableGeaCppValue, strictUpstreamLimits.mutableGeaCppValue)
  assertMax('gea_cpp_dynamic_props', counts.geaCppDynamicProps, strictUpstreamLimits.geaCppDynamicProps)
  assertMax('vector_fallback_cast<double>', counts.vectorDoubleFallbackCast, strictUpstreamLimits.vectorDoubleFallbackCast)
  assertZero('by-value mesh-buffer host bridge', counts.hostCreateMeshBufferByValue)
  assertZero('by-value textured mesh-buffer host bridge', counts.hostCreateTexturedMeshBufferByValue)
  assertMax('gea_cpp_record_get_property(__gea_array', counts.arrayRecordGetProperty, strictUpstreamLimits.arrayRecordGetProperty)
  assertNoLegacyMeshSceneRenderer()
  assertMax('gea_cpp_value', counts.geaCppValue, strictUpstreamLimits.geaCppValue)
  assertMax('gea_cpp_key', counts.geaCppKey, strictUpstreamLimits.geaCppKey)
  assertMax('record_get_literal', counts.recordGetLiteral, strictUpstreamLimits.recordGetLiteral)
  assertMax('record_set_literal', counts.recordSetLiteral, strictUpstreamLimits.recordSetLiteral)
  assertMax('std::vector<double>', counts.vectorDouble, strictUpstreamLimits.vectorDouble)
}

console.log('three-angle-metal generated C++ audit')
for (const [name, value] of Object.entries(counts)) {
  console.log(`${name}: ${value}`)
}

if (failures.length > 0) {
  console.error('\nStrict type audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}
