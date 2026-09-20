import { chapterRendersOwnHeading, paragraphKind, styledAlign, styledFlags, styledSize, styledText } from './epub'
import type { EpubChapter, ReaderPage, ReaderPageParagraph } from '../models'

interface WordChunk {
  text: string
  lineCount: number
  nextWord: number
}

const FONT_SIZES = [22, 26, 30]
// Includes typical word-boundary slack, not just the fonts' raw average glyph
// width. Without that slack a nominal 20-line page can become 23 native lines.
// Literata measures ~0.50 average advance per em; like Cossette and Oswald the
// factor carries ~6% slack on top so estimated lines never wrap when rendered.
const WIDTH_FACTORS = [0.48, 0.46, 0.39, 0.53]
const HORIZONTAL_PADDING = [84, 136]

// Body line-heights per [spacingIndex][fontSizeIndex], mirroring the
// `.spacing-N.size-N .page-text` rules in ReaderScreen.css. Used only to
// convert the fixed-height chapter-title block into a reserved line count.
const LINE_HEIGHTS = [
  [29, 35, 40],
  [33, 40, 46]
]

// Vertical space reserved at the top of a chapter's first page for its large
// title (the title itself plus breathing room beneath it). Kept in pixels so
// the title block stays a constant visual size across type settings; the
// reserved line count is derived from it per setting. ReaderScreen.css
// `.chapter-title-block` height must match.
const CHAPTER_TITLE_BLOCK_PX = 220

// Vertical space an inline illustration occupies (the `.page-image` height in
// ReaderScreen.css). Converted to body lines per type setting; an image never
// splits across pages.
const IMAGE_BLOCK_PX = 320

// Styled-heading metrics relative to the body text, in half-line units so the
// accounting stays integer: a body line costs 2 units, a size-1 heading line
// 3 (1.5x line-height), a size-2 heading line 4 (2x). ReaderScreen.css derives
// the actual heading font sizes/line-heights from the same ratios.
const HEADING_FONT_FACTORS = [1, 1.3, 1.6]
const HEADING_LINE_UNITS = [2, 3, 4]

// Exact line budgets for the 540x960 reader viewport. ReaderScreen.css keeps
// a dedicated page-number gutter at the bottom:
//   narrow: 960 - 46px top - 72px bottom = 842px
//   wide:   960 - 54px top - 78px bottom = 828px
// Each row is [22px, 26px, 30px], first compact then relaxed leading.
const LINE_BUDGETS = [
  [
    [29, 24, 21],
    [25, 21, 18]
  ],
  [
    [28, 23, 20],
    [25, 20, 18]
  ]
]

export function readerLineBudget(fontSizeIndex: number, spacingIndex: number, marginIndex: number): number {
  return LINE_BUDGETS[marginIndex][spacingIndex][fontSizeIndex]
}

function charactersPerLine(fontIndex: number, fontSizeIndex: number, marginIndex: number): number {
  const fontSize = FONT_SIZES[fontSizeIndex]
  const contentWidth = 540 - HORIZONTAL_PADDING[marginIndex]
  return Math.max(16, Math.floor(contentWidth / (fontSize * WIDTH_FACTORS[fontIndex])))
}

// Heading lines hold fewer characters: the scaled-up font plus a little extra
// slack for the bold weight.
function headingCharactersPerLine(fontIndex: number, fontSizeIndex: number, marginIndex: number, sizeBucket: number): number {
  const fontSize = Math.round(FONT_SIZES[fontSizeIndex] * HEADING_FONT_FACTORS[sizeBucket])
  const contentWidth = 540 - HORIZONTAL_PADDING[marginIndex]
  return Math.max(10, Math.floor(contentWidth / (fontSize * WIDTH_FACTORS[fontIndex] * 1.08)))
}

// Split a paragraph into whole words, hard-chopping any word longer than a
// line (URLs and the like). Paginating over the word list keeps the hot loop
// free of per-character string slicing: the generated C++ string ops resolve
// UTF-16 indices by rescanning the string, so a per-character walk over a
// whole novel is quadratic (it tripped the task watchdog on device).
function splitWords(text: string, maxCharactersPerLine: number): string[] {
  const words = text.split(' ')
  const out: string[] = []
  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    if (word.length == 0) continue
    let start = 0
    while (word.length - start > maxCharactersPerLine) {
      out.push(word.slice(start, start + maxCharactersPerLine))
      start += maxCharactersPerLine
    }
    if (start == 0) out.push(word)
    else if (start < word.length) out.push(word.slice(start))
  }
  return out
}

// Width of a word in average-prose-character units. Uppercase letters and
// digits are ~1.2-1.3x the prose average in every bundled font (measured from
// the TTFs), so counting them as plain characters under-estimates all-caps
// lines and overflows the page. Only wide classes are penalized — narrow
// characters deliberately stay at 1 so estimates err toward shorter lines
// (bottom whitespace) rather than overflow. Per-character walks are safe here:
// words are short standalone strings, not whole-chapter scans.
function wordUnits(word: string): number {
  let units = 0
  for (let i = 0; i < word.length; i++) {
    const code = word.charCodeAt(i)
    units += (code >= 65 && code <= 90) || (code >= 48 && code <= 57) ? 1.3 : 1
  }
  return units
}

// Greedily fill up to maxLines lines starting at words[startWord]. Returns the
// chunk's text (empty when collectText is 0 — the anchor pass only needs line
// accounting), how many lines it occupies, and the index of the first word
// that did not fit.
function takeWordLines(words: string[], startWord: number, maxCharactersPerLine: number, maxLines: number, collectText: number): WordChunk {
  let lineCount = 0
  let lineLength = 0
  let started = 0
  let text = ''
  for (let w = startWord; w < words.length; w++) {
    const word = words[w]
    const units = wordUnits(word)
    if (started == 0) {
      if (collectText == 1) text = word
      lineLength = units
      started = 1
      continue
    }
    if (lineLength + 1 + units > maxCharactersPerLine) {
      lineCount++
      if (lineCount >= maxLines) return { text, lineCount, nextWord: w }
      lineLength = units
    } else {
      lineLength = lineLength + 1 + units
    }
    if (collectText == 1) text += ' ' + word
  }
  if (started == 1) lineCount++
  return { text, lineCount, nextWord: words.length }
}

// Where a page begins: (chapter, paragraph, word). A full book paginates into
// a list of these tiny anchors instead of materialized page text — a novel's
// page list held ~2 full copies of the book and exhausted the device's 4 MB
// PSRAM heap. The visible page's text is derived on demand from the anchor.
// ⚠ Keep this record ALL-NUMERIC. Adding a string field (tried for image
// pages) flips geatsc's lowering of PageAnchor[] from a packed native struct
// vector to boxed gea_cpp_value records — one heap record per page exhausted
// the device's 4 MB PSRAM in loadAnchorCache and crashed on book open.
export interface PageAnchor {
  chapterIndex: number
  paragraphIndex: number
  wordIndex: number
  firstInChapter: number
}

// One pagination engine for both passes so page boundaries always agree:
// - anchor mode (captureRows = 0): stream every chapter through; records a
//   PageAnchor per page start plus each chapter's starting page. No text is
//   accumulated.
// - capture mode (captureRows = 1): fill exactly one page's rows starting
//   from an anchor; stops with pageFull = 1 at the page boundary.
// A class (not a record) so the mutable state keeps reference identity in the
// generated C++.
export class Paginator {
  anchors: PageAnchor[] = []
  chapterStartPages: number[] = []
  rows: ReaderPageParagraph[] = []
  pageFull = 0
  // Vertical budget in HALF-LINE units (a body line costs 2) so styled-heading
  // lines can cost 3 (1.5x leading) or 4 (2x) without float accounting.
  usedUnits = 0
  maxUnits = 0
  pieceCount = 0
  captureRows = 0
  maxCharactersPerLine = 0
  headingChars1 = 0
  headingChars2 = 0
  titleUnits = 0
  imageUnits = 0
  // Style key of the previous emitted piece (-1 body/image): consecutive
  // same-style heading lines (an <h1> split by <br/>) stack without the
  // paragraph gap, like the book lays them out.
  lastStyleKey = -1

  constructor(fontIndex: number, fontSizeIndex: number, spacingIndex: number, marginIndex: number, captureRows: number) {
    this.maxUnits = readerLineBudget(fontSizeIndex, spacingIndex, marginIndex) * 2
    this.maxCharactersPerLine = charactersPerLine(fontIndex, fontSizeIndex, marginIndex)
    this.headingChars1 = headingCharactersPerLine(fontIndex, fontSizeIndex, marginIndex, 1)
    this.headingChars2 = headingCharactersPerLine(fontIndex, fontSizeIndex, marginIndex, 2)
    this.captureRows = captureRows
    const lineHeight = LINE_HEIGHTS[spacingIndex][fontSizeIndex]
    this.titleUnits = Math.ceil(CHAPTER_TITLE_BLOCK_PX / lineHeight) * 2
    this.imageUnits = Math.ceil((IMAGE_BLOCK_PX * 2) / lineHeight)
  }

  charactersForSize(sizeBucket: number): number {
    if (sizeBucket == 1) return this.headingChars1
    if (sizeBucket == 2) return this.headingChars2
    return this.maxCharactersPerLine
  }

  // Feed one chapter (or, in capture mode, its tail from startParagraph /
  // startWord) through the engine. chapterAlreadyStarted is 0 when this call
  // begins a chapter (anchor mode always; capture mode only for a chapter's
  // first page) — it forces the chapter onto a fresh page, reserves the title
  // block, and drives chapterStartPages + the anchors' firstInChapter flag.
  // chapterHasTitle is 1 when the chapter has a title to render — the block is
  // only reserved when the content doesn't open with its own styled heading
  // (which would render the same title twice).
  addChapterSlice(chapterIndex: number, chapterId: string, paragraphs: string[], startParagraph: number, startWord: number, chapterAlreadyStarted: number, chapterHasTitle: number) {
    let chapterStarted = chapterAlreadyStarted
    // Every chapter begins on its own page. Flush any partial page left by the
    // previous chapter (anchor mode) — in capture mode a filled-in page ending
    // at a chapter boundary is simply full — then reserve the title block's
    // height on this first page.
    if (chapterStarted == 0) {
      if (this.pieceCount > 0 || this.usedUnits > 0) {
        if (this.captureRows == 1) {
          this.pageFull = 1
          return
        }
        this.usedUnits = 0
        this.pieceCount = 0
        this.lastStyleKey = -1
      }
      if (chapterHasTitle == 1 && chapterRendersOwnHeading(paragraphs) == 0) this.usedUnits += this.titleUnits
    }
    for (let paragraphIndex = startParagraph; paragraphIndex < paragraphs.length; paragraphIndex++) {
      const paragraph = paragraphs[paragraphIndex]
      const kind = paragraphKind(paragraph)

      if (kind == 2) {
        // An illustration: one unfracturable block. If it doesn't fit what's
        // left of the page it moves whole to the next one (clamped to a full
        // page for oversize art).
        const gapUnits = this.pieceCount > 0 ? 2 : 0
        let needUnits = this.imageUnits
        if (needUnits > this.maxUnits) needUnits = this.maxUnits
        if (this.pieceCount > 0 && this.usedUnits + gapUnits + needUnits > this.maxUnits) {
          if (this.captureRows == 1) {
            this.pageFull = 1
            return
          }
          this.usedUnits = 0
          this.pieceCount = 0
        }
        if (this.captureRows == 0) {
          if (this.pieceCount == 0) {
            this.anchors.push({
              chapterIndex,
              paragraphIndex,
              wordIndex: 0,
              firstInChapter: chapterStarted == 0 ? 1 : 0
            })
          }
          if (chapterStarted == 0) {
            this.chapterStartPages.push(this.anchors.length > 0 ? this.anchors.length - 1 : 0)
            chapterStarted = 1
          }
        } else {
          this.rows.push({
            id: chapterId + '-p-' + paragraphIndex + '-0',
            text: paragraph,
            kind: 2,
            align: 1,
            size: 0,
            flags: 0
          })
        }
        this.usedUnits += (this.pieceCount > 0 ? 2 : 0) + needUnits
        this.pieceCount++
        this.lastStyleKey = -1
        continue
      }

      const sizeBucket = kind == 1 ? styledSize(paragraph) : 0
      const align = kind == 1 ? styledAlign(paragraph) : 0
      const flags = kind == 1 ? styledFlags(paragraph) : 0
      const styleKey = kind == 1 ? align * 16 + sizeBucket * 4 + flags : -1
      const lineUnits = HEADING_LINE_UNITS[sizeBucket]
      const lineChars = this.charactersForSize(sizeBucket)
      const words = splitWords(styledText(paragraph), lineChars)
      let wordIndex = paragraphIndex == startParagraph ? startWord : 0
      let pieceIndex = wordIndex > 0 ? 1 : 0
      while (wordIndex < words.length) {
        // Consecutive same-style heading lines stack tight (no paragraph gap),
        // matching the .page-tight margin rule the reader renders them with.
        const tightRun = styleKey >= 0 && styleKey == this.lastStyleKey ? 1 : 0
        const gapUnits = this.pieceCount > 0 && pieceIndex == 0 && tightRun == 0 ? 2 : 0
        const availableLines = Math.floor((this.maxUnits - this.usedUnits - gapUnits) / lineUnits)
        if (this.pieceCount > 0 && availableLines <= 0) {
          if (this.captureRows == 1) {
            this.pageFull = 1
            return
          }
          this.usedUnits = 0
          this.pieceCount = 0
          this.lastStyleKey = -1
          continue
        }

        if (this.captureRows == 0) {
          if (this.pieceCount == 0) {
            this.anchors.push({
              chapterIndex,
              paragraphIndex,
              wordIndex,
              firstInChapter: chapterStarted == 0 ? 1 : 0
            })
          }
          if (chapterStarted == 0) {
            this.chapterStartPages.push(this.anchors.length > 0 ? this.anchors.length - 1 : 0)
            chapterStarted = 1
          }
        }

        const chunk = takeWordLines(words, wordIndex, lineChars, availableLines, this.captureRows)
        if (this.captureRows == 1) {
          this.rows.push({
            id: chapterId + '-p-' + paragraphIndex + '-' + pieceIndex,
            text: chunk.text,
            kind,
            align,
            size: sizeBucket,
            flags
          })
        }
        this.usedUnits += chunk.lineCount * lineUnits + gapUnits
        this.pieceCount++
        this.lastStyleKey = styleKey
        wordIndex = chunk.nextWord
        if (wordIndex < words.length) {
          if (this.captureRows == 1) {
            this.pageFull = 1
            return
          }
          this.usedUnits = 0
          this.pieceCount = 0
          this.lastStyleKey = -1
          pieceIndex++
        }
      }
    }
  }
}

// Materialized-page wrapper over the anchor engine — retained for the web
// simulator dev flows and the vitest suite; the device reader keeps anchors
// only and derives the visible page.
export function paginateChapters(chapters: EpubChapter[], fontIndex: number, fontSizeIndex: number, spacingIndex: number, marginIndex: number): ReaderPage[] {
  const anchorPass = new Paginator(fontIndex, fontSizeIndex, spacingIndex, marginIndex, 0)
  for (let chapterIndex = 0; chapterIndex < chapters.length; chapterIndex++) {
    const hasTitle = chapters[chapterIndex].title.length > 0 ? 1 : 0
    anchorPass.addChapterSlice(chapterIndex, chapters[chapterIndex].id, chapters[chapterIndex].paragraphs, 0, 0, 0, hasTitle)
    while (anchorPass.chapterStartPages.length < chapterIndex + 1) {
      anchorPass.chapterStartPages.push(anchorPass.anchors.length > 0 ? anchorPass.anchors.length - 1 : 0)
    }
  }

  const pages: ReaderPage[] = []
  for (let p = 0; p < anchorPass.anchors.length; p++) {
    const anchor = anchorPass.anchors[p]
    const anchorChapterIndex: number = anchor.chapterIndex
    // Each page now belongs to a single chapter (chapters always begin on a
    // fresh page), so the fill runs within the anchor's own chapter only.
    const filler = new Paginator(fontIndex, fontSizeIndex, spacingIndex, marginIndex, 1)
    const chapterAlreadyStarted = anchor.firstInChapter == 1 ? 0 : 1
    const hasTitle = chapters[anchorChapterIndex].title.length > 0 ? 1 : 0
    filler.addChapterSlice(anchorChapterIndex, chapters[anchorChapterIndex].id, chapters[anchorChapterIndex].paragraphs, anchor.paragraphIndex, anchor.wordIndex, chapterAlreadyStarted, hasTitle)
    const starts: number[] = []
    for (let k = 0; k < anchorPass.chapterStartPages.length; k++) {
      if (anchorPass.chapterStartPages[k] == p) starts.push(k)
    }
    pages.push({
      id: 'reader-page-' + p,
      chapterIndex: anchorChapterIndex,
      chapterTitle: chapters[anchorChapterIndex].title,
      firstInChapter: anchor.firstInChapter,
      chapterStarts: starts,
      paragraphs: filler.rows
    })
  }
  return pages
}

export function textForPage(pages: ReaderPage[], pageIndex: number): string {
  if (pageIndex < 0 || pageIndex >= pages.length) return ''
  let text = ''
  const paragraphs = pages[pageIndex].paragraphs
  for (let i = 0; i < paragraphs.length; i++) {
    if (paragraphs[i].kind == 2) continue
    if (text.length > 0) text += '\n\n'
    text += paragraphs[i].text
  }
  return text
}
