// PMTiles v3 reader — random-access tile lookup over a single archive buffer.
//
// Geatsc-friendly (same discipline as mvt.ts): the archive bytes live in a
// MODULE-GLOBAL Uint8Array and every read goes through it. A `Uint8Array` stored
// as a class field or read through a function parameter lowers to a per-byte
// `gea_cpp_value` box on device (a 7 MB archive → a ~1.5 GB allocation → OOM),
// so we never do that — the only Uint8Array binding is the module global.
//
// Archives from scripts/build-pmtiles.mjs are stored UNCOMPRESSED (directory +
// tiles), so no gzip inflate is needed — just byte slicing.

const COMPRESSION_GZIP = 2

export interface PMTilesHeader {
  rootDirOffset: number
  rootDirLength: number
  leafDirsOffset: number
  tileDataOffset: number
  minZoom: number
  maxZoom: number
  internalCompression: number
  tileCompression: number
}

interface DirEntry {
  tileId: number
  offset: number
  length: number
  runLength: number
}

// (z,x,y) → Hilbert tile id, the PMTiles addressing scheme.
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

// ── Module-global archive + cursor ───────────────────────────────────────────
let archive: Uint8Array = new Uint8Array(0)
let cur = 0

function u64le(off: number): number {
  let v = 0
  for (let i = 7; i >= 0; i--) v = v * 256 + archive[off + i]
  return v
}

// Single byte as a number (avoids a uint8→double narrowing in record literals).
function u8(off: number): number {
  return archive[off] + 0
}

// Read one varint from the module cursor, bounded by `end`.
function varint(end: number): number {
  let val = 0
  let shift = 0
  let b = 0
  do {
    if (cur >= end) return val
    b = archive[cur]
    cur++
    val += (b & 0x7f) * Math.pow(2, shift)
    shift += 7
  } while (b >= 0x80)
  return val
}

// Deserialize a directory occupying archive[start, end).
function deserializeDirectory(start: number, end: number): DirEntry[] {
  cur = start
  const num = varint(end)
  const entries: DirEntry[] = []
  // A real directory needs ≥ num bytes; a count past the window is garbage.
  if (num <= 0 || num > end - start) return entries
  let lastId = 0
  for (let i = 0; i < num; i++) {
    lastId += varint(end)
    entries.push({ tileId: lastId, offset: 0, length: 0, runLength: 0 })
  }
  for (let i = 0; i < num; i++) entries[i].runLength = varint(end)
  for (let i = 0; i < num; i++) entries[i].length = varint(end)
  for (let i = 0; i < num; i++) {
    const v = varint(end)
    if (v === 0 && i > 0) entries[i].offset = entries[i - 1].offset + entries[i - 1].length
    else entries[i].offset = v - 1
  }
  return entries
}

// Largest entry with tileId <= target (entries sorted by tileId).
function findEntry(entries: DirEntry[], tileId: number): number {
  let lo = 0
  let hi = entries.length - 1
  let ans = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (entries[mid].tileId <= tileId) {
      ans = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return ans
}

// Copy a byte range out of the archive into a fresh Uint8Array (for decodeMvt).
function sliceArchive(start: number, len: number): Uint8Array {
  const out = new Uint8Array(len)
  for (let i = 0; i < len; i++) out[i] = archive[start + i]
  return out
}

export class PMTiles {
  header: PMTilesHeader
  ok = false
  private root: DirEntry[] = []

  constructor(bytes: Uint8Array) {
    archive = bytes // hand straight to the module global — never store on `this`
    cur = 0
    this.header = {
      rootDirOffset: 0,
      rootDirLength: 0,
      leafDirsOffset: 0,
      tileDataOffset: 0,
      minZoom: 0,
      maxZoom: 0,
      internalCompression: 1,
      tileCompression: 1
    }
    if (bytes.length < 127 || bytes[0] !== 0x50 || bytes[1] !== 0x4d) return
    this.header = {
      rootDirOffset: u64le(8),
      rootDirLength: u64le(16),
      leafDirsOffset: u64le(40),
      tileDataOffset: u64le(56),
      minZoom: u8(100),
      maxZoom: u8(101),
      internalCompression: u8(97),
      tileCompression: u8(98)
    }
    const ro = this.header.rootDirOffset
    const rl = this.header.rootDirLength
    if (ro < 127 || rl <= 0 || ro + rl > bytes.length) return // truncated
    this.root = deserializeDirectory(ro, ro + rl)
    this.ok = this.root.length > 0
  }

  // Decompressed tile bytes (MVT) for z/x/y, or null if absent.
  getTile(z: number, x: number, y: number): Uint8Array | null {
    if (!this.ok || this.header.tileCompression === COMPRESSION_GZIP) {
      if (this.header.tileCompression === COMPRESSION_GZIP) return null // unsupported here
    }
    const tileId = zxyToTileId(z, x, y)
    const idx = findEntry(this.root, tileId)
    if (idx < 0) return null
    const e = this.root[idx]
    if (e.runLength === 0) return null // leaf dirs not used by our archives
    if (tileId >= e.tileId + e.runLength) return null
    return sliceArchive(this.header.tileDataOffset + e.offset, e.length)
  }
}
