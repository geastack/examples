import { Profiler, Store } from '@geastack/core'

declare const nativeBench: {
  ttfFontReady(): number
  ttfFontBytes(): number
  ttfCMalloc64(): number
  ttfScaleForSize(sizePx: number): number
  ttfGlyphIndex(codepoint: number): number
  ttfGlyphAdvance(sizePx: number, codepoint: number): number
  ttfGlyphWidth(sizePx: number, codepoint: number): number
  ttfGlyphHeight(sizePx: number, codepoint: number): number
  ttfShapeCount(codepoint: number): number
  ttfShapeChecksum(codepoint: number): number
  ttfFlattenGlyph(sizePx: number, codepoint: number): number
  ttfRasterEmptyStatic(): number
  ttfManualBoxStatic(): number
  ttfSortEdgesStatic(): number
  ttfScanEdgesStatic(): number
  ttfRasterBoxSimple(): number
  ttfRasterBoxStatic(sizePx: number): number
  ttfRasterGlyphStatic(sizePx: number, codepoint: number): number
  ttfColdGlyph(sizePx: number, reps: number): number
  ttfColdRun(sizePx: number, reps: number): number
  ttfCachedRun(sizePx: number, reps: number): number
}

export interface Row {
  name: string
  value: string
}

const ROW_COUNT = 19
const CODEPOINT_A = 65

class TtfBenchStore extends Store {
  rows: Row[] = []
  status = 'checking font'
  idx: int = 0 as int
  pending = false
  sink = 0

  time(run: () => number): number {
    const t0 = Profiler.nowUs()
    const value = run()
    const dt = Profiler.nowUs() - t0
    this.sink = (this.sink + value) % 1000000000
    return dt / 1000
  }

  rowName(i: int): string {
    if (i === 0) return 'font ready'
    if (i === 1) return 'font bytes'
    if (i === 2) return 'timer check'
    if (i === 3) return 'c malloc 64'
    if (i === 4) return 'scale 27px x1e6'
    if (i === 5) return 'glyph A index'
    if (i === 6) return 'glyph A advance'
    if (i === 7) return 'glyph A width'
    if (i === 8) return 'glyph A height'
    if (i === 9) return 'shape A count'
    if (i === 10) return 'shape A checksum'
    if (i === 11) return 'flatten A 8px'
    if (i === 12) return 'raster empty'
    if (i === 13) return 'manual box'
    if (i === 14) return 'sort 2 edges'
    if (i === 15) return 'scan 2 edges'
    if (i === 16) return 'stb box simple'
    if (i === 17) return 'raster box 8px'
    return 'raster A 8px'
  }

  runValue(i: int): string {
    if (i === 0) return `${nativeBench.ttfFontReady()}`
    if (i === 1) return `${nativeBench.ttfFontBytes()}`
    if (i === 2) return `${this.time(() => 1)} ms`
    if (i === 3) return `${nativeBench.ttfCMalloc64()}`
    if (i === 4) return `${nativeBench.ttfScaleForSize(27)}`
    if (i === 5) return `${nativeBench.ttfGlyphIndex(CODEPOINT_A)}`
    if (i === 6) return `${nativeBench.ttfGlyphAdvance(27, CODEPOINT_A)}`
    if (i === 7) return `${nativeBench.ttfGlyphWidth(27, CODEPOINT_A)}`
    if (i === 8) return `${nativeBench.ttfGlyphHeight(27, CODEPOINT_A)}`
    if (i === 9) return `${this.time(() => nativeBench.ttfShapeCount(CODEPOINT_A))} ms`
    if (i === 10) return `${this.time(() => nativeBench.ttfShapeChecksum(CODEPOINT_A))} ms`
    if (i === 11) return `${this.time(() => nativeBench.ttfFlattenGlyph(8, CODEPOINT_A))} ms`
    if (i === 12) return `${this.time(() => nativeBench.ttfRasterEmptyStatic())} ms`
    if (i === 13) return `${this.time(() => nativeBench.ttfManualBoxStatic())} ms`
    if (i === 14) return `${this.time(() => nativeBench.ttfSortEdgesStatic())} ms`
    if (i === 15) return `${this.time(() => nativeBench.ttfScanEdgesStatic())} ms`
    if (i === 16) return `${this.time(() => nativeBench.ttfRasterBoxSimple())} ms`
    if (i === 17) return `${this.time(() => nativeBench.ttfRasterBoxStatic(8))} ms`
    return `${this.time(() => nativeBench.ttfRasterGlyphStatic(8, CODEPOINT_A))} ms`
  }

  runNext() {
    if (this.idx >= ROW_COUNT) {
      this.status = 'done'
      return
    }

    if (!this.pending) {
      const name = this.rowName(this.idx)
      this.rows.push({ name, value: 'running' })
      this.rows = this.rows
      this.status = `running ${name}`
      this.pending = true
      return
    }

    const value = this.runValue(this.idx)
    this.rows[this.rows.length - 1].value = value
    this.rows = this.rows
    if (this.idx === 0 && value === '0') {
      this.idx = ROW_COUNT as int
      this.status = 'font missing'
      return
    }
    this.idx = (this.idx + 1) as int
    this.pending = false
    this.status = this.idx >= ROW_COUNT ? 'done' : `running ${this.idx}/${ROW_COUNT}`
  }

  reset() {
    this.rows = []
    this.idx = 0 as int
    this.pending = false
    this.status = 'rerun'
  }
}

export const ttfBench = new TtfBenchStore()
