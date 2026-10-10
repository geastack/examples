import {
  http,
  WiFi,
  Profiler,
  readCacheFile,
  writeCacheFile,
  removeCacheFile,
} from '@geastack/core'
import type { HttpReply, IncomingMessage } from '@geastack/core'
import portal from '../assets/badge-config.html?raw'
import { setting, saveSetting } from './settings'

let serverHandle = 0
let activeSlot = 0
let editorActive = false
let editorDone = false
let networkName = ''
const slots = [false, false, false, false, false, false]

function imagePath(slot: number): string {
  return '/storage/m5badge' + slot + '.jpg'
}

export function initBadge(): void {
  activeSlot = setting('badge', 0)
  for (let slot = 0; slot < 6; slot++) {
    slots[slot] = readCacheFile(imagePath(slot)).length > 0
  }

  if (!Number.isInteger(activeSlot) || !slots[activeSlot]) {
    selectFirstAvailable()
  }
}

function selectFirstAvailable(): void {
  activeSlot = 0
  for (let slot = 0; slot < 6; slot++) {
    if (slots[slot]) {
      activeSlot = slot

      break
    }
  }

  saveSetting('badge', activeSlot)
}

function querySlot(query: string): number {
  // ESP-IDF's factory handler uses64-byte query/16-byte value buffers and
  // strtoul(base10), including leading whitespace/sign and numeric prefixes.
  if (query.length >= 64) {
    return -1
  }

  let queryPosition = 0

  while (queryPosition < query.length) {
    const equals = query.indexOf('=', queryPosition)

    if (equals < 0) {
      break
    }

    if (query.slice(queryPosition, equals).toLowerCase() !== 'slot') {
      const next = query.indexOf('&', equals)

      if (next < 0) {
        break
      }

      queryPosition = next + 1
      continue
    }

    const next = query.indexOf('&', equals + 1)
    const text = query.slice(equals + 1, next < 0 ? query.length : next)

    if (text.length >= 16) {
      return -1
    }

    let position = 0

    while (position < text.length) {
      const code = text.charCodeAt(position)

      if (code !== 32 && (code < 9 || code > 13)) {
        break
      }

      position++
    }

    const negative = text.charCodeAt(position) === 45

    if (negative || text.charCodeAt(position) === 43) {
      position++
    }

    let value = 0

    while (position < text.length) {
      const digit = text.charCodeAt(position) - 48

      if (digit < 0 || digit > 9) {
        break
      }

      value = value * 10 + digit
      if (value > 4294967295) {
        return 4294967295
      }

      position++
    }

    return negative && value !== 0 ? 4294967296 - value : value
  }

  return -1
}

function header(request: IncomingMessage, name: string): string {
  for (const field of request.headers) {
    if (field.name.toLowerCase() === name) {
      return field.value
    }
  }

  return ''
}

function jpegUpload(request: IncomingMessage): boolean {
  const fileName = (header(request, 'x-file-name') || 'badge.jpg').toLowerCase()
  const extension = fileName.split('.').pop() || ''

  if (extension === 'png') {
    return false
  }

  if (extension === 'jpg' || extension === 'jpeg') {
    return true
  }

  const contentType = header(request, 'content-type').toLowerCase()

  return (
    !contentType.includes('png') && (contentType.includes('jpeg') || contentType.includes('jpg'))
  )
}

function captiveProbe(path: string): boolean {
  return (
    path === '/hotspot-detect.html' ||
    path.startsWith('/generate_204') ||
    path === '/mobile/status.php' ||
    path === '/check_network_status.txt' ||
    path === '/ncsi.txt' ||
    path === '/fwlink/' ||
    path === '/connectivity-check.html' ||
    path === '/success.txt' ||
    path === '/portal.html' ||
    path === '/library/test/success.html'
  )
}

function reply(request: IncomingMessage): HttpReply {
  if (request.path === '/' && request.method === 'GET') {
    return { contentType: 'text/html; charset=utf-8', body: portal }
  }

  if (request.method === 'GET' && captiveProbe(request.path)) {
    return {
      status: 302,
      contentType: 'text/html',
      headers: [
        { name: 'Location', value: 'http://192.168.4.1/?_=' + Profiler.nowUs() },
        { name: 'Connection', value: 'close' },
      ],
      body: '',
    }
  }

  if (request.path === '/badge/state' && request.method === 'GET') {
    return {
      contentType: 'application/json',
      body: JSON.stringify({
        apSsid: networkName,
        apUrl: 'http://192.168.4.1',
        slotCount: 6,
        activeSlot,
        slots: slots.map((hasImage, slot) => ({
          slot,
          hasImage,
          isActive: slot === activeSlot,
          imageUrl: '/badge/image?slot=' + slot,
        })),
      }),
    }
  }

  if (request.path === '/close' && request.method === 'POST') {
    editorDone = true

    return { body: 'closing' }
  }

  const imageRead = request.path === '/badge/image' && request.method === 'GET'
  const imageDelete = request.path === '/badge/image' && request.method === 'DELETE'
  const activate = request.path === '/badge/active' && request.method === 'POST'
  const upload = request.path === '/upload' && request.method === 'POST'

  if (!imageRead && !imageDelete && !activate && !upload) {
    return { status: 404, body: 'Not found' }
  }

  if (upload && (request.body.length === 0 || request.body.length > 2 * 1024 * 1024)) {
    return { status: 400, body: 'invalid upload size' }
  }

  const slot = querySlot(request.query)

  if (slot < 0) {
    return { status: 400, body: 'missing slot' }
  }

  if (slot >= 6) {
    return { status: imageRead ? 404 : 400, body: 'invalid badge slot' }
  }

  if (imageRead) {
    if (!slots[slot]) {
      return { status: 404, body: 'badge image not found' }
    }

    return { contentType: 'image/jpeg', file: imagePath(slot) }
  }

  if (imageDelete) {
    if (!slots[slot]) {
      return { status: 400, body: 'badge image not found' }
    }

    if (!removeCacheFile(imagePath(slot))) {
      return { status: 400, body: 'failed to delete image' }
    }

    slots[slot] = false
    if (activeSlot === slot) {
      selectFirstAvailable()
    }

    return {
      contentType: 'application/json',
      body: '{"status":"ok","message":"badge image deleted"}',
    }
  }

  if (activate) {
    if (!slots[slot]) {
      return { status: 400, body: 'badge image not found' }
    }

    activeSlot = slot
    saveSetting('badge', slot)

    return {
      contentType: 'application/json',
      body: '{"status":"ok","message":"active slot updated"}',
    }
  }

  if (upload) {
    const bytes = request.body

    if (bytes.length === 0 || bytes.length > 2 * 1024 * 1024) {
      return { status: 400, body: 'invalid upload size' }
    }

    if (!jpegUpload(request)) {
      return { status: 400, body: 'only jpg images are supported' }
    }

    // The factory accepts nonempty JPG-labeled bytes without decoder validation.
    // Invalid JPEG data can therefore be stored; preserve that API policy.

    if (!writeCacheFile(imagePath(slot), bytes)) {
      return { status: 400, body: 'failed to store image' }
    }

    slots[slot] = true
    activeSlot = slot
    saveSetting('badge', slot)

    return { contentType: 'application/json', body: '{"status":"ok","message":"upload success"}' }
  }

  return { status: 404, body: 'Not found' }
}

export function editBadge(): boolean {
  closeBadge()
  const mac = WiFi.accessPointMac().replaceAll(':', '')

  networkName = mac.length > 0 ? 'M5StopWatch-' + mac.slice(-4) : 'M5StopWatch'
  if (!WiFi.startAccessPoint(networkName)) {
    return false
  }

  const server = http.createServer(reply)

  if (!server.listen(80)) {
    server.close()
    WiFi.stopAccessPoint()

    return false
  }

  if (!WiFi.startCaptivePortal()) {
    server.close()
    WiFi.stopAccessPoint()

    return false
  }

  serverHandle = server.id()
  editorActive = true
  editorDone = false

  return true
}

export function closeBadge(): void {
  if (serverHandle !== 0) {
    http.close(serverHandle)
  }

  if (editorActive) {
    WiFi.stopCaptivePortal()
    WiFi.stopAccessPoint()
  }

  serverHandle = 0
  editorActive = false
}

export function editingBadge(): boolean {
  if (editorDone) {
    editorDone = false
    closeBadge()
  }

  return editorActive
}

export function badgePath(): string {
  return slots[activeSlot] ? imagePath(activeSlot) : ''
}

export function badgeStep(direction: number): void {
  for (let distance = 1; distance <= 6; distance++) {
    const slot = (activeSlot + direction * distance + 12) % 6

    if (slots[slot]) {
      activeSlot = slot
      saveSetting('badge', slot)

      return
    }
  }
}

export function apName(): string {
  return networkName
}
