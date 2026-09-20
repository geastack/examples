// Pure-TS DEFLATE / gzip / zlib inflate. No platform dependency (no
// DecompressionStream, no zlib) — so the SAME code decompresses PMTiles tile
// data in the browser, in Node, and (compiled by geatsc) natively on the
// device. PMTiles stores both its directory and its tiles gzip-compressed, so
// this is on the offline read path.
//
// Compact port of the classic "tiny inflate" (tinf) algorithm.

class Huffman {
  // counts[i] = number of codes of length i; symbols[] = symbols in canonical order.
  counts = new Int32Array(16)
  symbols = new Int32Array(288)
}

class BitReader {
  pos = 0
  tag = 0
  bitcount = 0
  constructor(public src: Uint8Array) {}

  getbit(): number {
    if (this.bitcount === 0) {
      this.tag = this.src[this.pos++]
      this.bitcount = 8
    }
    const bit = this.tag & 1
    this.tag >>= 1
    this.bitcount--
    return bit
  }

  getbits(num: number, base: number): number {
    let val = 0
    for (let i = 0; i < num; i++) val |= this.getbit() << i
    return val + base
  }

  decodeSymbol(t: Huffman): number {
    let sum = 0
    let cur = 0
    let len = 0
    do {
      cur = 2 * cur + this.getbit()
      len++
      sum += t.counts[len]
      cur -= t.counts[len]
    } while (cur >= 0)
    return t.symbols[sum + cur]
  }
}

function buildTree(t: Huffman, lengths: Int32Array, off: number, num: number) {
  for (let i = 0; i < 16; i++) t.counts[i] = 0
  for (let i = 0; i < num; i++) t.counts[lengths[off + i]]++
  t.counts[0] = 0
  const offs = new Int32Array(16)
  let sum = 0
  for (let i = 1; i < 16; i++) {
    offs[i] = sum
    sum += t.counts[i]
  }
  for (let i = 0; i < num; i++) {
    if (lengths[off + i]) t.symbols[offs[lengths[off + i]]++] = i
  }
}

const LENGTH_BITS = new Int32Array([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0])
const LENGTH_BASE = new Int32Array([3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258])
const DIST_BITS = new Int32Array([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13])
const DIST_BASE = new Int32Array([1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577])
const CLCIDX = new Int32Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15])

class Out {
  buf: Uint8Array
  pos = 0
  constructor(cap: number) {
    this.buf = new Uint8Array(cap)
  }
  ensure(extra: number) {
    if (this.pos + extra <= this.buf.length) return
    let cap = this.buf.length * 2
    while (cap < this.pos + extra) cap *= 2
    const next = new Uint8Array(cap)
    next.set(this.buf.subarray(0, this.pos))
    this.buf = next
  }
  push(b: number) {
    this.ensure(1)
    this.buf[this.pos++] = b
  }
}

const sltree = new Huffman()
const sdtree = new Huffman()
{
  // Fixed Huffman trees (RFC 1951 §3.2.6).
  const lengths = new Int32Array(288 + 30)
  let i = 0
  for (; i < 144; i++) lengths[i] = 8
  for (; i < 256; i++) lengths[i] = 9
  for (; i < 280; i++) lengths[i] = 7
  for (; i < 288; i++) lengths[i] = 8
  buildTree(sltree, lengths, 0, 288)
  for (i = 0; i < 30; i++) lengths[288 + i] = 5
  buildTree(sdtree, lengths, 288, 30)
}

function inflateBlockData(d: BitReader, out: Out, lt: Huffman, dt: Huffman) {
  for (;;) {
    let sym = d.decodeSymbol(lt)
    if (sym === 256) return
    if (sym < 256) {
      out.push(sym)
    } else {
      sym -= 257
      const length = d.getbits(LENGTH_BITS[sym], LENGTH_BASE[sym])
      const distSym = d.decodeSymbol(dt)
      const dist = d.getbits(DIST_BITS[distSym], DIST_BASE[distSym])
      const offs = out.pos - dist
      out.ensure(length)
      for (let i = 0; i < length; i++) out.buf[out.pos++] = out.buf[offs + i]
    }
  }
}

function inflateDynamic(d: BitReader, out: Out) {
  const lengths = new Int32Array(288 + 30)
  const hlit = d.getbits(5, 257)
  const hdist = d.getbits(5, 1)
  const hclen = d.getbits(4, 4)
  for (let i = 0; i < 19; i++) lengths[i] = 0
  for (let i = 0; i < hclen; i++) lengths[CLCIDX[i]] = d.getbits(3, 0)
  const codeTree = new Huffman()
  buildTree(codeTree, lengths, 0, 19)
  let num = 0
  while (num < hlit + hdist) {
    const sym = d.decodeSymbol(codeTree)
    if (sym === 16) {
      const prev = lengths[num - 1]
      for (let n = d.getbits(2, 3); n; n--) lengths[num++] = prev
    } else if (sym === 17) {
      for (let n = d.getbits(3, 3); n; n--) lengths[num++] = 0
    } else if (sym === 18) {
      for (let n = d.getbits(7, 11); n; n--) lengths[num++] = 0
    } else {
      lengths[num++] = sym
    }
  }
  const lt = new Huffman()
  const dt = new Huffman()
  buildTree(lt, lengths, 0, hlit)
  buildTree(dt, lengths, hlit, hdist)
  inflateBlockData(d, out, lt, dt)
}

function inflateUncompressed(d: BitReader, out: Out) {
  // Align to byte boundary, then copy LEN bytes.
  while (d.bitcount > 8) {
    d.pos--
    d.bitcount -= 8
  }
  const len = d.src[d.pos] | (d.src[d.pos + 1] << 8)
  d.pos += 4 // skip LEN + NLEN
  out.ensure(len)
  for (let i = 0; i < len; i++) out.buf[out.pos++] = d.src[d.pos++]
  d.bitcount = 0
}

// Raw DEFLATE stream → bytes.
export function inflateRaw(src: Uint8Array, expectedSize = 0): Uint8Array {
  const d = new BitReader(src)
  const out = new Out(expectedSize > 0 ? expectedSize : Math.max(64, src.length * 4))
  let bfinal = 0
  do {
    bfinal = d.getbit()
    const btype = d.getbits(2, 0)
    if (btype === 0) inflateUncompressed(d, out)
    else if (btype === 1) inflateBlockData(d, out, sltree, sdtree)
    else if (btype === 2) inflateDynamic(d, out)
    else throw new Error('inflate: bad block type')
  } while (!bfinal)
  return out.buf.subarray(0, out.pos)
}

// Detect gzip (0x1f 0x8b) / zlib (0x78 ..) wrappers and inflate the payload.
export function inflate(src: Uint8Array, expectedSize = 0): Uint8Array {
  if (src.length >= 2 && src[0] === 0x1f && src[1] === 0x8b) {
    // gzip: 10-byte fixed header, optional extra fields, then raw DEFLATE.
    let pos = 10
    const flg = src[3]
    if (flg & 4) {
      const xlen = src[pos] | (src[pos + 1] << 8)
      pos += 2 + xlen
    }
    if (flg & 8) while (src[pos++] !== 0) {} // FNAME
    if (flg & 16) while (src[pos++] !== 0) {} // FCOMMENT
    if (flg & 2) pos += 2 // FHCRC
    return inflateRaw(src.subarray(pos), expectedSize)
  }
  if (src.length >= 2 && (src[0] & 0x0f) === 0x08 && ((src[0] << 8) | src[1]) % 31 === 0) {
    // zlib: 2-byte header, then raw DEFLATE (ignore the Adler-32 trailer).
    return inflateRaw(src.subarray(2), expectedSize)
  }
  // Assume already raw DEFLATE.
  return inflateRaw(src, expectedSize)
}
