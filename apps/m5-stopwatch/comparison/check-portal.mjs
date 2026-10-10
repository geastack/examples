import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { spawn } from 'node:child_process'

const { values } = parseArgs({
  options: {
    framework: { type: 'string' },
    'build-report': { type: 'string' },
    'base-url': { type: 'string', default: 'http://192.168.4.1' },
    'leave-open': { type: 'boolean', default: false },
  },
})

assert(['factory', 'gea'].includes(values.framework), 'Choose factory or gea')
assert(values['build-report'], 'Identify the flashed diagnostic build')
assert.equal(process.env.STOPWATCH_DIAGNOSTIC_MUTED, '1', 'Only use physically silent diagnostics')

const destination = fileURLToPath(
  new URL(`../../../reports/m5-stopwatch/captures/${values.framework}/`, import.meta.url),
)

assert(existsSync(destination), 'Use the existing report capture directory')
const output = path.join(destination, 'portal-tests.json')

assert(!existsSync(output), 'Preserve existing portal test evidence')

const bundledRequire = createRequire(
  '/Users/dashersw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json',
)
const { chromium } = bundledRequire('playwright')
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
})
const base = values['base-url']
const evidence = {
  framework: values.framework,
  build: JSON.parse(readFileSync(values['build-report'], 'utf8')),
  startedAt: new Date().toISOString(),
  hardwareSpeakerMuted: true,
  hardwareVibrationDisabled: true,
  tests: [],
  screenshots: [],
}
const save = () => writeFileSync(output, JSON.stringify(evidence, null, 2) + '\n')
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

async function relay(route, bodyOverride) {
  const incoming = route.request()
  const headers = incoming.headers()

  delete headers['content-length']
  delete headers['accept-encoding']
  const response = await request(
    incoming.method(),
    incoming.url().slice(base.length),
    bodyOverride ?? incoming.postDataBuffer() ?? undefined,
    headers,
  )

  delete response.headers['transfer-encoding']
  delete response.headers['content-length']
  await route.fulfill({ status: response.status, headers: response.headers, body: response.body })
}

async function request(method, route, body, headers = {}) {
  const args = ['--silent', '--show-error', '--max-time', '20', '--include', '--request', method]

  for (const [name, value] of Object.entries(headers)) {
    args.push('--header', `${name}: ${value}`)
  }

  if (body !== undefined) {
    args.push('--data-binary', '@-')
  }

  args.push(base + route)
  const raw = await new Promise((resolve, reject) => {
    const child = spawn('/usr/bin/curl', args)
    const chunks = []
    const errors = []

    child.stdout.on('data', (chunk) => chunks.push(chunk))
    child.stderr.on('data', (chunk) => errors.push(chunk))
    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`curl ${code}: ${Buffer.concat(errors)}`))
      } else {
        resolve(Buffer.concat(chunks))
      }
    })
    child.stdin.end(body)
  })
  let offset = 0
  let header
  let status

  do {
    const boundary = raw.indexOf('\r\n\r\n', offset)

    assert(boundary >= 0, 'HTTP response headers required')
    header = raw.subarray(offset, boundary).toString('latin1')
    status = Number(header.match(/^HTTP\/\S+ (\d+)/)?.[1])
    offset = boundary + 4
  } while (status === 100)

  const responseHeaders = new Map(
    header
      .split('\r\n')
      .slice(1)
      .map((line) => {
        const colon = line.indexOf(':')

        return [line.slice(0, colon).toLowerCase(), line.slice(colon + 1).trim()]
      }),
  )
  const bytes = raw.subarray(offset)
  const result = {
    method,
    route,
    status,
    contentType: responseHeaders.get('content-type') ?? null,
    location: responseHeaders.get('location') ?? null,
    bytes: bytes.length,
    sha256: sha256(bytes),
  }

  evidence.tests.push(result)
  save()

  return { ...result, body: bytes, headers: Object.fromEntries(responseHeaders) }
}

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })

  evidence.browserTransport =
    'Unmodified device HTML and real backend responses relayed through system curl; macOS blocks direct browser/Node local-network access. This does not test automatic captive-window launch.'
  await context.route(`${base}/**`, (route) => relay(route))
  const page = await context.newPage()
  const errors = []

  page.on('pageerror', (error) => errors.push(error.message))
  const homepage = await request('GET', '/')

  assert.equal(homepage.status, 200)
  const initialState = JSON.parse((await request('GET', '/badge/state')).body)

  for (const slot of initialState.slots) {
    if (slot.hasImage) {
      assert.equal((await request('DELETE', `/badge/image?slot=${slot.slot}`)).status, 200)
    }
  }

  const clearedState = JSON.parse((await request('GET', '/badge/state')).body)

  assert.equal(clearedState.slots.filter((slot) => slot.hasImage).length, 0)
  evidence.tests.push({ name: 'initial six slots empty', passed: true, state: clearedState })
  for (const route of ['/generate_204', '/hotspot-detect.html', '/connecttest.txt']) {
    const response = await request('GET', route)

    evidence.tests.push({
      name: `captive discovery ${route}`,
      passed: [200, 302].includes(response.status),
      observedStatus: response.status,
    })
  }

  await page.goto(base, { waitUntil: 'networkidle' })
  await page.locator('#slotsGrid .slot-tile').first().waitFor()
  const png = readFileSync(new URL('../assets/icon_clock.png', import.meta.url))
  const jpegDataUrl = await page.evaluate(async (base64) => {
    const image = new Image()

    image.src = 'data:image/png;base64,' + base64
    await image.decode()
    const canvas = document.createElement('canvas')

    canvas.width = image.width
    canvas.height = image.height
    canvas.getContext('2d').drawImage(image, 0, 0)

    return canvas.toDataURL('image/jpeg', 0.9)
  }, png.toString('base64'))
  const jpeg = Buffer.from(jpegDataUrl.split(',')[1], 'base64')

  async function screenshot(id, state) {
    const fullPagePng = await page.screenshot({
      path: path.join(destination, `${id}.png`),
      fullPage: true,
    })
    const receipt = {
      id,
      manifestScreenId: 'badge.phone',
      captureSource: 'playwright-browser',
      captureExtent: 'full-page',
      imageSize: [fullPagePng.readUInt32BE(16), fullPagePng.readUInt32BE(20)],
      manifestState: state,
      stateVerified: true,
      stateEvidence: {
        assertedControls: evidence.tests.filter((test) => test.passed),
        backendState: JSON.parse((await request('GET', '/badge/state')).body),
        slots: await page.locator('#slotsGrid .slot-tile').count(),
        preview: await page
          .locator('#previewCanvas')
          .evaluate((canvas) => ({
            width: canvas.width,
            height: canvas.height,
            pixels: canvas.toDataURL(),
          }))
          .then((preview) => ({ ...preview, pixels: sha256(preview.pixels) })),
      },
      viewport: page.viewportSize(),
      url: page.url(),
      status: await page.locator('#status').innerText(),
      errors: [...errors],
    }

    evidence.screenshots.push(receipt)
    writeFileSync(path.join(destination, `${id}.json`), JSON.stringify(receipt, null, 2) + '\n')
    const viewportPng = await page.screenshot({
      path: path.join(destination, `${id}-viewport.png`),
      fullPage: false,
    })
    const viewportReceipt = {
      ...receipt,
      id: `${id}-viewport`,
      captureExtent: 'viewport',
      imageSize: [viewportPng.readUInt32BE(16), viewportPng.readUInt32BE(20)],
    }

    writeFileSync(
      path.join(destination, `${id}-viewport.json`),
      JSON.stringify(viewportReceipt, null, 2) + '\n',
    )
    evidence.screenshots.push(viewportReceipt)
    save()
  }

  await screenshot('portal-desktop-initial', 'desktop layout')
  await page.setViewportSize({ width: 390, height: 844 })
  await screenshot('portal-mobile-initial', 'mobile layout')
  await page.locator('#file').setInputFiles({
    name: 'stopwatch-reference.jpg',
    mimeType: 'image/jpeg',
    buffer: jpeg,
  })
  await page.waitForFunction(
    () => document.querySelector('#status').textContent === 'Image loaded.',
  )
  await screenshot('portal-image-preview', 'image preview')
  await page.locator('#cropFrame').scrollIntoViewIfNeeded()
  const crop = await page.locator('#cropFrame').boundingBox()

  assert(crop)
  await page.locator('#zoomRange').evaluate((element) => {
    element.value = String(Number(element.value) * 2)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
  const beforeDrag = await page.locator('#previewCanvas').evaluate((canvas) => canvas.toDataURL())

  await page.mouse.move(crop.x + crop.width / 2, crop.y + crop.height / 2)
  await page.mouse.down()
  await page.mouse.move(crop.x + crop.width / 2 + 35, crop.y + crop.height / 2 + 20, { steps: 8 })
  await page.mouse.up()
  const afterDrag = await page.locator('#previewCanvas').evaluate((canvas) => canvas.toDataURL())

  assert.notEqual(beforeDrag, afterDrag, 'Dragging must change the actual crop pixels')
  evidence.tests.push({ name: 'pointer crop drag', passed: true })
  await screenshot('portal-crop-drag', 'drag crop')
  await page.locator('#zoomRange').evaluate((element) => {
    element.value = element.min
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.locator('#bgColor').evaluate((element) => {
    element.value = '#206080'
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
  const background = await page
    .locator('#previewCanvas')
    .evaluate((canvas) => Array.from(canvas.getContext('2d').getImageData(0, 0, 1, 1).data))

  assert.deepEqual(background, [32, 96, 128, 255])
  evidence.tests.push({ name: 'zoom and background live preview', passed: true, background })
  await screenshot('portal-crop-zoom-background', 'background color')
  let releaseUpload
  let uploadIntercepted
  const intercepted = new Promise((resolve) => {
    uploadIntercepted = resolve
  })
  const uploadGate = new Promise((resolve) => {
    releaseUpload = resolve
  })

  await page.route(
    '**/upload?slot=0',
    async (route) => {
      uploadIntercepted()
      await uploadGate
      await relay(route)
    },
    { times: 1 },
  )
  const uploaded = page.waitForResponse((response) => response.url().includes('/upload?slot=0'))

  await page.locator('#upload').click()
  await intercepted
  for (const selector of ['#upload', '#refresh', '#close', '#file', '#zoomRange', '#bgColor']) {
    assert(await page.locator(selector).isDisabled(), `${selector} must be disabled during upload`)
  }

  evidence.tests.push({ name: 'busy controls under controlled request delay', passed: true })
  await screenshot('portal-upload-busy', 'upload busy/success/error')
  releaseUpload()
  assert.equal((await uploaded).status(), 200)
  await page.waitForFunction(() =>
    document.querySelector('#status').textContent.includes('upload success'),
  )
  await screenshot('portal-upload-success', 'upload busy/success/error')
  const originalSlotZero = await request('GET', '/badge/image?slot=0')
  const slotZeroFilename = `badge-upload-${values.framework}-slot-0.jpg`

  writeFileSync(path.resolve(destination, '../../', slotZeroFilename), originalSlotZero.body)
  evidence.tests.push({
    name: 'actual UI crop upload retained',
    slot: 0,
    fixture: slotZeroFilename,
    sha256: originalSlotZero.sha256,
  })

  await page.route(
    '**/upload?slot=0',
    async (route) => {
      await relay(route, Buffer.alloc(0))
    },
    { times: 1 },
  )
  const rejected = page.waitForResponse((response) => response.url().includes('/upload?slot=0'))

  await page.locator('#upload').click()
  const rejectedResponse = await rejected

  assert.equal(rejectedResponse.status(), 400)
  evidence.tests.push({
    name: 'real empty-upload response',
    status: rejectedResponse.status(),
    contentType: rejectedResponse.headers()['content-type'],
    body: await rejectedResponse.text(),
  })
  await page.waitForFunction(
    () => document.querySelector('#status').textContent === 'invalid upload size',
  )
  assert.equal((await request('GET', '/badge/image?slot=0')).sha256, originalSlotZero.sha256)
  assert(!(await page.locator('#upload').isDisabled()))
  evidence.tests.push({
    name: 'actual server empty-body error shown and busy controls restored',
    passed: true,
    faultInjection: 'replace request body with zero bytes',
  })
  await screenshot('portal-upload-error', 'upload busy/success/error')

  const fixtures = new Map()

  for (let slot = 1; slot < 6; slot++) {
    const mime = slot === 1 ? 'image/png' : 'image/jpeg'
    const [width, height] = slot === 1 ? [200, 200] : slot === 3 ? [320, 180] : [466, 466]
    const dataUrl = await page.evaluate(
      async ({ base64, slot, mime, width, height }) => {
        const image = new Image()

        image.src = 'data:image/png;base64,' + base64
        await image.decode()
        const canvas = document.createElement('canvas')

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        const colors = ['#206080', '#803020', '#208040', '#602080', '#807020']

        ctx.fillStyle = colors[slot - 1]
        ctx.fillRect(0, 0, width, height)
        const iconSize = Math.min(200, width - 60, height - 60)

        ctx.drawImage(image, (width - iconSize) / 2, (height - iconSize) / 2, iconSize, iconSize)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(20, 20, slot * 25, 12)

        return canvas.toDataURL(mime, 0.9)
      },
      { base64: png.toString('base64'), slot, mime, width, height },
    )
    const bytes = Buffer.from(dataUrl.split(',')[1], 'base64')
    const filename = `badge-upload-slot-${slot}.${slot === 1 ? 'png' : 'jpg'}`
    const fixturePath = path.resolve(destination, '../../', filename)

    if (existsSync(fixturePath)) {
      assert.equal(
        sha256(readFileSync(fixturePath)),
        sha256(bytes),
        'Both apps use identical fixtures',
      )
    } else {
      writeFileSync(fixturePath, bytes)
    }

    fixtures.set(slot, bytes)
    evidence.tests.push({
      name: 'display decoding fixture',
      slot,
      width,
      height,
      mime,
      uploadMetadata: 'JPG-labeled body, matching factory acceptance policy',
      sha256: sha256(bytes),
      fixture: filename,
    })
    if (slot === 1) {
      const correctlyLabeledPng = await request('POST', '/upload?slot=1', bytes, {
        'Content-Type': 'image/png',
        'X-File-Name': filename,
      })

      assert.equal(correctlyLabeledPng.status, 400)
      assert.equal(correctlyLabeledPng.body.toString('utf8'), 'only jpg images are supported')
    }

    const response = await request('POST', `/upload?slot=${slot}`, bytes, {
      'Content-Type': 'image/jpeg',
      'X-File-Name': `reference-slot-${slot}.jpg`,
    })

    assert.equal(response.status, 200)
  }

  const state = await request('GET', '/badge/state')

  assert.equal(JSON.parse(state.body).slots.filter((slot) => slot.hasImage).length, 6)
  for (let slot = 0; slot < 6; slot++) {
    assert.equal((await request('POST', `/badge/active?slot=${slot}`)).status, 200)
    const image = await request('GET', `/badge/image?slot=${slot}`)

    assert.equal(image.status, 200)
    assert(image.bytes > 0)
    if (slot > 0) {
      assert.equal(image.sha256, sha256(fixtures.get(slot)))
    }
  }

  await page.locator('#refresh').click()
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'OK')
  await screenshot('portal-six-slots', 'occupied thumbnails')
  assert.equal((await request('POST', '/upload?slot=6', jpeg)).status, 400)
  assert.equal((await request('POST', '/upload?slot=0', Buffer.alloc(0))).status, 400)
  assert.equal((await request('GET', '/badge/image?slot=6')).status, 404)
  assert.equal((await request('DELETE', '/badge/image?slot=5')).status, 200)
  assert.equal((await request('GET', '/badge/image?slot=5')).status, 404)
  assert.equal((await request('POST', '/badge/active?slot=5')).status, 400)
  assert.equal((await request('POST', '/badge/active?slot=0')).status, 200)
  const finalState = await request('GET', '/badge/state')

  assert.equal(finalState.status, 200)
  evidence.finalBackendState = JSON.parse(finalState.body)
  evidence.finalBackendResponse = {
    status: finalState.status,
    headers: finalState.headers,
    bytes: finalState.bytes,
    sha256: finalState.sha256,
  }
  assert.deepEqual(
    evidence.finalBackendState.slots.map((slot) => slot.hasImage),
    [true, true, true, true, true, false],
  )
  assert.equal(evidence.finalBackendState.activeSlot, 0)
  evidence.pageErrors = errors
  assert.deepEqual(errors, [])
  if (!values['leave-open']) {
    const closing = page.waitForResponse((response) => response.url().endsWith('/close'))

    await page.locator('#close').click()
    assert.equal((await closing).status(), 200)
  }

  evidence.completedAt = new Date().toISOString()
  evidence.completed = true
  evidence.passed = !evidence.tests.some((test) => test.passed === false)
  save()
} catch (error) {
  evidence.passed = false
  evidence.failure = error.stack
  save()
  throw error
} finally {
  await browser.close()
}
