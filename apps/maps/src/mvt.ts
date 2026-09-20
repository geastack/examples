// Mapbox Vector Tile (MVT) decoder — pure, dependency-free, no DOM.
//
// Written in a geatsc-friendly style so it lowers to native C++ on the device:
//  - parser state (buffer + cursor) is MODULE-GLOBAL, not a passed-around object
//    (geatsc passes object params as `const&`, so a function can't advance a
//    cursor it receives as an argument);
//  - functions RETURN records rather than mutating a parameter, for the same
//    reason; mutation only ever happens on locals the function owns.
// Records lower to native structs and `number[]`/`string[]` to native vectors,
// so the whole decode is native (no gea_cpp_value). The same source runs in the
// browser and Node unchanged.

// MVT geometry command ids (lower 3 bits of a command integer).
const CMD_MOVE_TO = 1
const CMD_LINE_TO = 2
const CMD_CLOSE_PATH = 7

// Feature geometry kinds (Tile.GeomType).
export const GEOM_POINT = 1
export const GEOM_LINE = 2
export const GEOM_POLYGON = 3

// A tag value is either a string or a number (bools fold to 0/1).
export const VAL_STRING = 0
export const VAL_NUMBER = 1

export interface VectorFeature {
  type: number
  id: number
  tagKeys: number[]
  tagVals: number[]
  x: number[]
  y: number[]
  parts: number[]
}

export interface VectorLayer {
  name: string
  version: number
  extent: number
  keys: string[]
  valKind: number[]
  valStr: string[]
  valNum: number[]
  features: VectorFeature[]
}

export interface VectorTile {
  layers: VectorLayer[]
}

// ── Module-global protobuf cursor ────────────────────────────────────────────
let buf: Uint8Array = new Uint8Array(0)
let pos = 0

function pbVarint(): number {
  let val = 0
  let shift = 0
  let b = 0
  do {
    b = buf[pos]
    pos++
    val += (b & 0x7f) * Math.pow(2, shift)
    shift += 7
  } while (b >= 0x80)
  return val
}

function pbSVarint(): number {
  const n = pbVarint()
  return n & 1 ? -(n + 1) / 2 : n / 2
}

function pbFloat(): number {
  const p = pos
  pos += 4
  const bits = (buf[p] | (buf[p + 1] << 8) | (buf[p + 2] << 16) | (buf[p + 3] << 24)) >>> 0
  const sign = bits >>> 31 ? -1 : 1
  const exp = (bits >>> 23) & 0xff
  const frac = bits & 0x7fffff
  if (exp === 0) return sign * frac * Math.pow(2, -149)
  if (exp === 255) return frac ? NaN : sign * Infinity
  return sign * (1 + frac * Math.pow(2, -23)) * Math.pow(2, exp - 127)
}

function pbDouble(): number {
  const p = pos
  pos += 8
  const lo = (buf[p] | (buf[p + 1] << 8) | (buf[p + 2] << 16) | (buf[p + 3] << 24)) >>> 0
  const hi = (buf[p + 4] | (buf[p + 5] << 8) | (buf[p + 6] << 16) | (buf[p + 7] << 24)) >>> 0
  const sign = hi >>> 31 ? -1 : 1
  const exp = (hi >>> 20) & 0x7ff
  const frac = (hi & 0xfffff) * Math.pow(2, 32) + lo
  if (exp === 0) return sign * frac * Math.pow(2, -1074)
  if (exp === 2047) return frac ? NaN : sign * Infinity
  return sign * (1 + frac * Math.pow(2, -52)) * Math.pow(2, exp - 1023)
}

// Read `len` UTF-8 bytes from the cursor into a string. Single index increments
// (no multiple `++` in one expression — that is undefined behaviour in C++).
function pbString(len: number): string {
  let out = ''
  const end = pos + len
  let i = pos
  pos = end
  while (i < end) {
    const c = buf[i]
    i++
    if (c < 0x80) {
      out += String.fromCharCode(c)
    } else if (c < 0xe0) {
      const c1 = buf[i]
      i++
      out += String.fromCharCode(((c & 0x1f) << 6) | (c1 & 0x3f))
    } else if (c < 0xf0) {
      const c1 = buf[i]
      i++
      const c2 = buf[i]
      i++
      out += String.fromCharCode(((c & 0x0f) << 12) | ((c1 & 0x3f) << 6) | (c2 & 0x3f))
    } else {
      const c1 = buf[i]
      i++
      const c2 = buf[i]
      i++
      const c3 = buf[i]
      i++
      const cp = ((c & 0x07) << 18) | ((c1 & 0x3f) << 12) | ((c2 & 0x3f) << 6) | (c3 & 0x3f)
      const u = cp - 0x10000
      out += String.fromCharCode(0xd800 + (u >> 10), 0xdc00 + (u & 0x3ff))
    }
  }
  return out
}

function pbSkip(wireType: number) {
  if (wireType === 0) pbVarint()
  else if (wireType === 1) pos += 8
  else if (wireType === 2) pos += pbVarint()
  else if (wireType === 5) pos += 4
}

// ── Decode ──────────────────────────────────────────────────────────────────

export function decodeMvt(bytes: Uint8Array): VectorTile {
  buf = bytes
  pos = 0
  const layers: VectorLayer[] = []
  const end = bytes.length
  while (pos < end) {
    const tag = pbVarint()
    const field = tag >> 3
    const wire = tag & 0x7
    if (field === 3 && wire === 2) {
      const len = pbVarint()
      layers.push(decodeLayer(pos + len))
    } else {
      pbSkip(wire)
    }
  }
  return { layers }
}

function decodeLayer(end: number): VectorLayer {
  const keys: string[] = []
  const valKind: number[] = []
  const valStr: string[] = []
  const valNum: number[] = []
  const features: VectorFeature[] = []
  let name = ''
  let version = 1
  let extent = 4096
  // Feature byte ranges, decoded after the layer's keys/values are read.
  const featStart: number[] = []
  const featEnd: number[] = []
  while (pos < end) {
    const tag = pbVarint()
    const field = tag >> 3
    const wire = tag & 0x7
    if (field === 1 && wire === 2) {
      name = pbString(pbVarint())
    } else if (field === 15 && wire === 0) {
      version = pbVarint()
    } else if (field === 5 && wire === 0) {
      extent = pbVarint()
    } else if (field === 3 && wire === 2) {
      keys.push(pbString(pbVarint()))
    } else if (field === 4 && wire === 2) {
      const vlen = pbVarint()
      const v = decodeValue(pos + vlen)
      valKind.push(v.kind)
      valStr.push(v.str)
      valNum.push(v.num)
    } else if (field === 2 && wire === 2) {
      const len = pbVarint()
      featStart.push(pos)
      featEnd.push(pos + len)
      pos += len
    } else {
      pbSkip(wire)
    }
  }
  // Skip decoding/storing features for the densest layers the renderer doesn't
  // draw at these zooms — `building`/`housenumber`/`poi` dominate a city tile's
  // geometry, and keeping them blew PSRAM (each decoded tile is double[] arrays).
  const skip = name === 'building' || name === 'housenumber' || name === 'poi' || name === 'aerodrome_label'
  if (!skip) {
    for (let i = 0; i < featStart.length; i++) features.push(decodeFeature(featStart[i], featEnd[i]))
  }
  pos = end
  return { name, version, extent, keys, valKind, valStr, valNum, features }
}

interface DecodedValue {
  kind: number
  str: string
  num: number
}

function decodeValue(end: number): DecodedValue {
  let kind = VAL_STRING
  let str = ''
  let num = 0
  while (pos < end) {
    const tag = pbVarint()
    const field = tag >> 3
    const wire = tag & 0x7
    if (field === 1 && wire === 2) {
      kind = VAL_STRING
      str = pbString(pbVarint())
    } else if (field === 2 && wire === 5) {
      kind = VAL_NUMBER
      num = pbFloat()
    } else if (field === 3 && wire === 1) {
      kind = VAL_NUMBER
      num = pbDouble()
    } else if (field === 4 && wire === 0) {
      kind = VAL_NUMBER
      num = pbVarint()
    } else if (field === 5 && wire === 0) {
      kind = VAL_NUMBER
      num = pbVarint()
    } else if (field === 6 && wire === 0) {
      kind = VAL_NUMBER
      num = pbSVarint()
    } else if (field === 7 && wire === 0) {
      kind = VAL_NUMBER
      num = pbVarint()
    } else {
      pbSkip(wire)
    }
  }
  pos = end
  return { kind, str, num }
}

interface DecodedGeometry {
  x: number[]
  y: number[]
  parts: number[]
}

function decodeFeature(start: number, end: number): VectorFeature {
  pos = start
  let type = 0
  let id = 0
  const tagKeys: number[] = []
  const tagVals: number[] = []
  let geomStart = -1
  let geomEnd = -1
  while (pos < end) {
    const tag = pbVarint()
    const field = tag >> 3
    const wire = tag & 0x7
    if (field === 1 && wire === 0) {
      id = pbVarint()
    } else if (field === 2 && wire === 2) {
      const tlen = pbVarint()
      const tend = pos + tlen
      let toggle = 0
      while (pos < tend) {
        const v = pbVarint()
        if (toggle === 0) tagKeys.push(v)
        else tagVals.push(v)
        toggle ^= 1
      }
    } else if (field === 3 && wire === 0) {
      type = pbVarint()
    } else if (field === 4 && wire === 2) {
      const glen = pbVarint()
      geomStart = pos
      geomEnd = pos + glen
      pos = geomEnd
    } else {
      pbSkip(wire)
    }
  }
  let gx: number[] = []
  let gy: number[] = []
  let gparts: number[] = []
  if (geomStart >= 0) {
    const g = decodeGeometry(geomStart, geomEnd)
    gx = g.x
    gy = g.y
    gparts = g.parts
  }
  pos = end
  return { type, id, tagKeys, tagVals, x: gx, y: gy, parts: gparts }
}

function decodeGeometry(start: number, end: number): DecodedGeometry {
  pos = start
  const x: number[] = []
  const y: number[] = []
  const parts: number[] = []
  let cx = 0
  let cy = 0
  while (pos < end) {
    const cmdInt = pbVarint()
    const cmd = cmdInt & 0x7
    const count = cmdInt >> 3
    if (cmd === CMD_MOVE_TO) {
      for (let i = 0; i < count; i++) {
        cx += pbSVarint()
        cy += pbSVarint()
        parts.push(x.length)
        x.push(cx)
        y.push(cy)
      }
    } else if (cmd === CMD_LINE_TO) {
      for (let i = 0; i < count; i++) {
        cx += pbSVarint()
        cy += pbSVarint()
        x.push(cx)
        y.push(cy)
      }
    } else if (cmd === CMD_CLOSE_PATH) {
      // No coordinates; the part's first vertex closes it for fills.
    }
  }
  return { x, y, parts }
}

// ── Property lookup helpers (read-only; safe as const-ref params) ────────────

export function featureStr(layer: VectorLayer, feat: VectorFeature, key: string): string {
  const ki = indexOf(layer.keys, key)
  if (ki < 0) return ''
  for (let i = 0; i < feat.tagKeys.length; i++) {
    if (feat.tagKeys[i] === ki) {
      const vi = feat.tagVals[i]
      return layer.valKind[vi] === VAL_STRING ? layer.valStr[vi] : ''
    }
  }
  return ''
}

export function featureNum(layer: VectorLayer, feat: VectorFeature, key: string): number {
  const ki = indexOf(layer.keys, key)
  if (ki < 0) return NaN
  for (let i = 0; i < feat.tagKeys.length; i++) {
    if (feat.tagKeys[i] === ki) {
      const vi = feat.tagVals[i]
      return layer.valKind[vi] === VAL_NUMBER ? layer.valNum[vi] : NaN
    }
  }
  return NaN
}

function indexOf(arr: string[], key: string): number {
  for (let i = 0; i < arr.length; i++) if (arr[i] === key) return i
  return -1
}

export function findLayer(tile: VectorTile, name: string): VectorLayer | null {
  for (let i = 0; i < tile.layers.length; i++) if (tile.layers[i].name === name) return tile.layers[i]
  return null
}

export function partLength(feat: VectorFeature, p: number): number {
  const startIdx = feat.parts[p]
  const endIdx = p + 1 < feat.parts.length ? feat.parts[p + 1] : feat.x.length
  return endIdx - startIdx
}

// ── PMTiles: random byte-range access over a microSD file ────────────────────
// Reads tiles ON DEMAND by byte offset — the whole point of PMTiles. The tiny
// directory is read once; each tile is read as just its own byte range. The
// archive is NEVER loaded whole into RAM. Bytes reach the decoder via host-fn
// returns assigned straight to the module-global `buf` (a Uint8Array crossing a
// function parameter would box per-byte → gea_cpp_value on device), and lookups
// pass only numbers/strings.
import { readFileRange, fetchBytes } from '@geastack/core'

// Directory as PARALLEL number[] arrays (geatsc doesn't persist
// `entries[i].field = x` mutations to a record array; push() does).
let pmTileIds: number[] = []
let pmOffsets: number[] = []
let pmLengths: number[] = []
let pmTileDataOffset = 0
let pmOkFlag = 0
let pmPath = ''
export let pmMinZoom = 0
export let pmMaxZoom = 0

function bufU64(off: number): number {
  let v = 0
  for (let i = 7; i >= 0; i--) v = v * 256 + buf[off + i]
  return v
}

export function zxyToTileId(z: number, x: number, y: number): number {
  let acc = 0
  for (let t = 0; t < z; t++) acc += Math.pow(4, t)
  const n = 1 << z
  let rx = 0
  let ry = 0
  let d = 0
  let xx = x
  let yy = y
  for (let s = n >> 1; s > 0; s >>= 1) {
    rx = (xx & s) > 0 ? 1 : 0
    ry = (yy & s) > 0 ? 1 : 0
    d += s * s * ((3 * rx) ^ ry)
    if (ry === 0) {
      if (rx === 1) {
        xx = s - 1 - xx
        yy = s - 1 - yy
      }
      const tmp = xx
      xx = yy
      yy = tmp
    }
  }
  return acc + d
}

// Open a .pmtiles on microSD: read its 127-byte header, then its (small)
// directory, by byte range. Returns 1 on success. Tiles stay on the card.
export function openSdArchive(path: string): number {
  pmTileIds = []
  pmOffsets = []
  pmLengths = []
  pmOkFlag = 0
  pmPath = path
  buf = readFileRange(path, 0, 127)
  pos = 0
  if (buf.length < 127 || buf[0] !== 0x50 || buf[1] !== 0x4d) return 0
  const rootDirOffset = bufU64(8)
  const rootDirLength = bufU64(16)
  pmTileDataOffset = bufU64(56)
  pmMinZoom = buf[100] + 0
  pmMaxZoom = buf[101] + 0
  if (rootDirOffset < 127 || rootDirLength <= 0) return 0
  // Read just the directory range, then parse it from the start of buf.
  buf = readFileRange(path, rootDirOffset, rootDirLength)
  pos = 0
  const dirEnd = buf.length
  const num = pbVarint()
  if (num <= 0 || num > dirEnd) return 0
  let lastId = 0
  for (let i = 0; i < num; i++) {
    lastId += pbVarint()
    pmTileIds.push(lastId)
  }
  for (let i = 0; i < num; i++) pbVarint() // runLengths (always 1 for our archives) — read to advance
  for (let i = 0; i < num; i++) pmLengths.push(pbVarint())
  for (let i = 0; i < num; i++) {
    const v = pbVarint()
    if (v === 0 && i > 0) pmOffsets.push(pmOffsets[i - 1] + pmLengths[i - 1])
    else pmOffsets.push(v - 1)
  }
  if (pmTileIds.length < 1) return 0
  // Reject a truncated archive (e.g. a half-finished transfer): the last tile's
  // final byte must be readable, else fall through to the WiFi path.
  const lastEnd = pmTileDataOffset + pmOffsets[pmTileIds.length - 1] + pmLengths[pmTileIds.length - 1]
  const tail = readFileRange(path, lastEnd - 1, 1)
  if (tail.length < 1) return 0
  pmOkFlag = 1
  return pmOkFlag
}

// Read + decode the tile at z/x/y from the SD archive (just its byte range), or
// an EMPTY tile (layers.length === 0) when absent. (Not `| null`: geatsc lowers
// `null` from a record-union return as an empty record; test layers.length.)
export function decodeSdTile(z: number, x: number, y: number): VectorTile {
  const empty: VectorTile = { layers: [] }
  if (pmOkFlag === 0) return empty
  const tileId = zxyToTileId(z, x, y)
  let lo = 0
  let hi = pmTileIds.length - 1
  let ans = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (pmTileIds[mid] <= tileId) {
      ans = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  if (ans < 0 || pmTileIds[ans] !== tileId) return empty
  buf = readFileRange(pmPath, pmTileDataOffset + pmOffsets[ans], pmLengths[ans])
  pos = 0
  return decodeMvtRange(0, buf.length)
}

// Fetch one MVT tile over WiFi and decode it. The bytes flow host-fn → module
// global buf (no Uint8Array parameter → no per-byte boxing). Empty on failure
// (WiFi down / non-200 / blocking fetch returned nothing).
export function fetchTile(url: string): VectorTile {
  buf = fetchBytes(url)
  pos = 0
  if (buf.length < 1) return { layers: [] }
  return decodeMvtRange(0, buf.length)
}

// Decode MVT layers from buf[start, end) in place (buf already holds the whole
// archive). Mirrors decodeMvt but bounded to a sub-range, no buffer swap.
function decodeMvtRange(start: number, end: number): VectorTile {
  pos = start
  const layers: VectorLayer[] = []
  while (pos < end) {
    const tag = pbVarint()
    const field = tag >> 3
    const wire = tag & 0x7
    if (field === 3 && wire === 2) {
      const len = pbVarint()
      layers.push(decodeLayer(pos + len))
    } else {
      pbSkip(wire)
    }
  }
  return { layers }
}
