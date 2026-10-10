import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

function startup(screen) {
  const events = []
  const frames = []
  const store = {
    screen: '',
    init() {
      events.push('load persisted settings')
      this.screen = screen
    },
    tick() {
      events.push('tick ' + this.screen)
    },
  }
  const modules = {
    '@geastack/core': {
      loadAssetImage: (icon) => ({ decode: () => events.push('decode ' + icon) }),
      Display: {
        setDevicePixelRatio() {},
        setFrameRate(value) {
          assert.equal(value, 60)
        },
        setVSync() {},
        setTextRasterCache() {},
        setFlushConfig() {},
      },
      mount() {
        events.push('mount ' + store.screen)
      },
    },
    './apps/apps': { App: class {} },
    './common/canvas/render': { drawGraphic: () => events.push('draw ' + store.screen) },
    './stores/SystemStore': { system: store },
    './lib/audio': { bootSound: () => events.push('boot WAV') },
    './assets': { icons: Array.from({ length: 8 }, (_, index) => index) },
  }
  const compiled = ts.transpileModule(
    readFileSync(new URL('../index.tsx', import.meta.url), 'utf8'),
    {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    },
  ).outputText

  vm.runInNewContext(compiled, {
    exports: {},
    require: (name) => {
      assert.ok(name in modules)

      return modules[name]
    },
    requestAnimationFrame: (callback) => frames.push(callback),
  })

  return { store, events, frames }
}

test('startup presents factory artwork for an app frame after settings load and before guide/menu', () => {
  for (const route of ['guide', 'menu']) {
    const { store, events, frames } = startup(route)

    assert.deepEqual(events, ['load persisted settings', 'mount boot'])
    assert.equal(store.screen, 'boot')
    frames.shift()(0)
    assert.equal(store.screen, 'boot')
    assert.deepEqual(events, ['load persisted settings', 'mount boot', 'boot WAV'])
    frames.shift()(16)
    assert.equal(store.screen, route)
    assert.deepEqual(events.slice(-2), ['tick ' + route, 'draw ' + route])
    frames.shift()(32)
    assert.equal(events.filter((event) => event.startsWith('decode ')).length, 8)
    assert.ok(events.indexOf('decode 0') > events.indexOf('boot WAV'))
    assert.ok(events.indexOf('decode 7') < events.indexOf('tick ' + route))
    assert.equal(events.filter((event) => event === 'boot WAV').length, 1)
    assert.equal(events.filter((event) => event === 'load persisted settings').length, 1)
  }
})

test('ordinary startup leaves boot on the next frame regardless of absolute frame timestamp', () => {
  const { store, events, frames } = startup('menu')

  frames.shift()(100000)
  assert.equal(store.screen, 'boot')
  frames.shift()(100016)
  assert.equal(store.screen, 'menu')
  frames.shift()(100032)
  assert.equal(events.filter((event) => event === 'boot WAV').length, 1)
  assert.equal(events.filter((event) => event === 'load persisted settings').length, 1)
})
