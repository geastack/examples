import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

function setup({ initialFiles = [], initialSettings = [], writable = true } = {}) {
  const files = new Map(initialFiles)
  const settings = new Map(initialSettings)
  const events = []
  let handler
  const core = {
    WiFi: {
      mac: () => '28:84:85:45:0B:98',
      accessPointMac: () => '28:84:85:45:0B:99',
      startAccessPoint: (ssid) => {
        events.push(ssid)

        return true
      },
      stopAccessPoint: () => events.push('ap-stop'),
      startCaptivePortal: () => {
        events.push('dns-start')

        return true
      },
      stopCaptivePortal: () => events.push('dns-stop'),
    },
    Profiler: { nowUs: () => 123456 },
    http: {
      createServer: (reply) => {
        handler = reply

        return { listen: () => true, id: () => 1, close: () => events.push('http-close') }
      },
      close: () => events.push('http-close'),
    },
    readCacheFile: (path) => files.get(path) ?? new Uint8Array(),
    writeCacheFile: (path, bytes) => {
      if (!writable) {
        return false
      }

      files.set(path, bytes.slice())

      return true
    },
    removeCacheFile: (path) => files.delete(path),
  }
  const exports = {}
  const source = ts.transpileModule(
    fs.readFileSync(new URL('../lib/badge.ts', import.meta.url), 'utf8'),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } },
  ).outputText

  vm.runInNewContext(source, {
    exports,
    require: (name) =>
      name === '@geastack/core'
        ? core
        : name.endsWith('?raw')
          ? { default: '<html>badge manager</html>' }
          : {
              setting: (key, fallback) => settings.get(key) ?? fallback,
              saveSetting: (key, value) => settings.set(key, value),
            },
    Number,
    JSON,
  })
  exports.initBadge()
  assert.equal(exports.editBadge(), true)
  const request = (method, path, query = '', body = new Uint8Array(), headers = []) =>
    handler({ method, path, query, body, headers })

  return { badge: exports, request, files, events, settings }
}

test('TS badge server stores six slots, selects images and deletes the active slot', () => {
  const { badge, request, files, settings } = setup()

  assert.equal(request('GET', '/').contentType, 'text/html; charset=utf-8')
  assert.equal(JSON.parse(request('GET', '/badge/state').body).apSsid, 'M5StopWatch-0B99')
  assert.equal(request('POST', '/upload', 'slot=6').status, 400)
  assert.equal(request('POST', '/upload', 'slot=0', new Uint8Array([1, 2, 3, 4])).status, undefined)
  for (let slot = 0; slot < 6; slot++) {
    assert.equal(
      request('POST', '/upload', 'slot=' + slot, new Uint8Array([255, 216, 255, 217])).status,
      undefined,
    )
  }

  assert.equal(files.size, 6)
  assert.equal(settings.get('badge'), 5)
  assert.equal(request('GET', '/badge/image', 'slot=5').file, '/storage/m5badge5.jpg')
  request('DELETE', '/badge/image', 'slot=5')
  assert.equal(request('GET', '/badge/image', 'slot=5').status, 404)
  assert.equal(badge.badgePath(), '/storage/m5badge0.jpg')
  request('POST', '/badge/active', 'slot=3')
  assert.equal(badge.badgePath(), '/storage/m5badge3.jpg')
})

test('portal close returns its reply before shutting down HTTP and Wi-Fi', () => {
  const { badge, request, events } = setup()

  assert.equal(request('POST', '/close').body, 'closing')
  assert.equal(events.length, 2)
  assert.equal(badge.editingBadge(), false)
  assert.deepEqual(events, ['M5StopWatch-0B99', 'dns-start', 'http-close', 'dns-stop', 'ap-stop'])
})

test('original phone page receives usable thumbnail URLs after a real-sized JPEG upload', () => {
  const { request } = setup()
  const jpeg = new Uint8Array(64000)

  jpeg.set([255, 216, 255, 224])
  jpeg.set([255, 217], jpeg.length - 2)
  assert.equal(request('POST', '/upload', 'slot=2', jpeg).status, undefined)
  const state = JSON.parse(request('GET', '/badge/state').body)
  const uploaded = state.slots[2]

  assert.equal(uploaded.imageUrl, '/badge/image?slot=2')
  assert.equal(uploaded.hasImage, true)
  assert.equal(uploaded.isActive, true)
  const [path, query] = (uploaded.imageUrl + '&t=123456').split('?')

  assert.equal(request('GET', path, query).file, '/storage/m5badge2.jpg')
})

test('startup and active deletion choose the lowest occupied slot, including no-image reset', () => {
  const image = new Uint8Array([255, 216, 255, 217])
  const { badge, request, settings } = setup({
    initialFiles: [
      ['/storage/m5badge1.jpg', image],
      ['/storage/m5badge4.jpg', image],
      ['/storage/m5badge5.jpg', image],
    ],
    initialSettings: [['badge', 99]],
  })

  assert.equal(badge.badgePath(), '/storage/m5badge1.jpg')
  request('POST', '/badge/active', 'slot=4')
  request('DELETE', '/badge/image', 'slot=4')
  assert.equal(badge.badgePath(), '/storage/m5badge1.jpg')
  request('DELETE', '/badge/image', 'slot=1')
  assert.equal(badge.badgePath(), '/storage/m5badge5.jpg')
  request('DELETE', '/badge/image', 'slot=5')
  assert.equal(badge.badgePath(), '')
  assert.equal(settings.get('badge'), 0)
})

test('empty-slot mutations and failed persistent writes report errors without changing selection', () => {
  const { request, files, badge } = setup({ writable: false })

  assert.equal(request('POST', '/badge/active', 'slot=3').status, 400)
  assert.equal(request('DELETE', '/badge/image', 'slot=3').status, 400)
  assert.equal(request('POST', '/upload', 'slot=3', new Uint8Array()).status, 400)
  const oversized = new Uint8Array(2 * 1024 * 1024 + 1)

  oversized.set([255, 216])
  assert.equal(request('POST', '/upload', 'slot=3', oversized).body, 'invalid upload size')
  const failed = request('POST', '/upload', 'slot=3', new Uint8Array([255, 216, 255, 217]))

  assert.equal(failed.status, 400)
  assert.equal(failed.body, 'failed to store image')
  assert.equal(files.size, 0)
  assert.equal(badge.badgePath(), '')
})

test('phone captive probes redirect with factory headers and upload metadata rejects PNG', () => {
  const { request } = setup()
  const paths = [
    '/hotspot-detect.html',
    '/generate_204',
    '/generate_204/check',
    '/mobile/status.php',
    '/check_network_status.txt',
    '/ncsi.txt',
    '/fwlink/',
    '/connectivity-check.html',
    '/success.txt',
    '/portal.html',
    '/library/test/success.html',
  ]

  for (const path of paths) {
    const response = request('GET', path)

    assert.equal(response.status, 302)
    assert.deepEqual(
      Array.from(response.headers, ({ name, value }) => [name, value]),
      [
        ['Location', 'http://192.168.4.1/?_=123456'],
        ['Connection', 'close'],
      ],
    )
  }

  const jpeg = new Uint8Array([255, 216, 255, 217])
  const rejected = request('POST', '/upload', 'slot=0', jpeg, [
    { name: 'X-File-Name', value: 'picture.PNG' },
    { name: 'Content-Type', value: 'image/png' },
  ])

  assert.equal(rejected.status, 400)
  assert.equal(rejected.body, 'only jpg images are supported')
  const accepted = request('POST', '/upload', 'slot=0', jpeg, [
    { name: 'x-FILE-name', value: 'picture.JPEG' },
    { name: 'content-TYPE', value: 'image/jpeg' },
  ])

  assert.equal(accepted.status, undefined)
})

test('factory upload metadata precedence preserves nonempty JPG-labeled bytes without decoding', () => {
  const { request, files } = setup()
  const body = new Uint8Array([1])
  const cases = [
    ['invalid.jpg', 'image/png', true],
    ['invalid.PNG', 'image/jpeg', false],
    ['unknown.bin', 'image/png,image/jpeg', false],
    ['unknown.bin', 'IMAGE/JPEG', true],
    ['unknown.bin', 'application/octet-stream', false],
  ]

  for (const [name, type, accepted] of cases) {
    const response = request('POST', '/upload', 'slot=0', body, [
      { name: 'X-File-Name', value: name },
      { name: 'Content-Type', value: type },
    ])

    assert.equal(response.status, accepted ? undefined : 400)
    assert.equal(
      response.body,
      accepted ? '{"status":"ok","message":"upload success"}' : 'only jpg images are supported',
    )
  }

  assert.deepEqual(Array.from(files.get('/storage/m5badge0.jpg')), [1])
})

test('factory HTTP slot parsing and error messages retain strtoul prefixes and route precedence', () => {
  const { request, files } = setup()
  const body = new Uint8Array([1])

  for (const [query, slot] of [
    ['slot=1abc', 1],
    ['slot=abc', 0],
    ['slot=', 0],
    ['slot=  +2', 2],
    ['slot=-0', 0],
    ['SLOT=3', 3],
    ['slot=-4294967295', 1],
  ]) {
    const response = request('POST', '/upload', query, body)

    assert.equal(response.status, undefined)
    assert.ok(files.has('/storage/m5badge' + slot + '.jpg'))
  }

  for (const query of [
    '',
    'slot',
    'bogus&slot=1',
    'other=0',
    'slot=' + '1'.repeat(16),
    'x'.repeat(64),
  ]) {
    const response = request('GET', '/badge/image', query)

    assert.equal(response.status, 400)
    assert.equal(response.body, 'missing slot')
  }

  for (const query of ['slot=6', 'slot=-1', 'slot=4294967296']) {
    const image = request('GET', '/badge/image', query)

    assert.equal(image.status, 404)
    assert.equal(image.body, 'invalid badge slot')
    const mutation = request('POST', '/badge/active', query)

    assert.equal(mutation.status, 400)
    assert.equal(mutation.body, 'invalid badge slot')
  }

  const absent = request('GET', '/badge/image', 'slot=5')

  assert.equal(absent.status, 404)
  assert.equal(absent.body, 'badge image not found')
  const empty = request('POST', '/upload')

  assert.equal(empty.status, 400)
  assert.equal(empty.body, 'invalid upload size')
  assert.equal(request('GET', '/unknown').status, 404)
  assert.equal(request('GET', '/upload').status, 404)
})
