import { Display, Store } from '@geastack/core'
import { anchorFontKey, loadAnchorCache, saveAnchorCache } from '../lib/anchorCache'
import { chapterParagraphsCached, clearChapterCache } from '../lib/chapterCache'
import { chapterRendersOwnHeading, epubCacheCover, epubChapterFields, epubMeta, epubThumbnailCover, imageHrefOf, splitParagraphs } from '../lib/epub'
import { drawPageArt } from '../lib/pageArt'
import { applyCoverSrc } from '../lib/coverArt'
import { slug } from '../lib/text'
import { applyEpaperReadingMode, setEpaperGrayscale } from '../lib/epaperMode'
import { Paginator, type PageAnchor } from '../lib/pagination'
import { scanSdBooks } from '../lib/storage'
import type { BookRow, ReaderBook, ReaderDisplayRow, TocRow } from '../models'

export const VIEW_LIBRARY = 0
export const VIEW_READER = 1

export const FILTER_ALL = 0
export const FILTER_READING = 1
export const FILTER_UNREAD = 2


function clampIndex(value: number, maximum: number): number {
  if (maximum <= 0) return 0
  if (value < 0) return 0
  if (value >= maximum) return maximum - 1
  return Math.floor(value)
}

// Where a book's extracted cover lives on the card. Content-sniffed at decode
// time, so the extension is cosmetic. Shares the .folio cache dir with anchors.
function coverCachePath(bookPath: string): string {
  return '/sdcard/.folio/' + slug(bookPath) + '-cover.img'
}

// Where a book's library-grid thumbnail lives. Generated once per book by the
// post-scan pump (see pumpThumbnails); sized 1:1 for the compact tile so the
// row <img fit="contain"> never rescales at draw time.
function thumbCachePath(bookPath: string): string {
  // Size-tagged so a tile-geometry change regenerates instead of reusing stale art.
  return '/sdcard/.folio/' + slug(bookPath) + '-thumb150.gth'
}

// Library grid tile box in CSS px (BookCover.css .book-cover): 3 columns on
// the 540px panel with 22px side padding and 14px gaps, sized with slack for
// the scroll bar (3*150 + 2*14 = 478 <= ~488 usable).
const THUMB_MAX_W = 150
const THUMB_MAX_H = 220

function readSavedBookmarks(id: string): number[] {
  const raw = localStorage.getItem('folio_marks_' + id)
  const marks: number[] = []
  if (raw.length == 0) return marks
  const values = raw.split(',')
  for (let i = 0; i < values.length; i++) {
    const value = Number(values[i])
    if (value >= 0) marks.push(Math.floor(value))
  }
  return marks
}

function bookmarkString(marks: number[]): string {
  let value = ''
  for (let i = 0; i < marks.length; i++) {
    if (i > 0) value += ','
    value += String(marks[i])
  }
  return value
}

function bookMonogram(title: string): string {
  const words = title.split(' ')
  let value = ''
  for (let i = 0; i < words.length && value.length < 2; i++) {
    if (words[i].length > 2) value += words[i].slice(0, 1).toUpperCase()
  }
  return value.length > 0 ? value : 'F'
}

export class ReaderStore extends Store {
  view = VIEW_LIBRARY
  books: ReaderBook[] = []
  visibleBooks: BookRow[] = []
  visibleBookCount = 0
  readingBookCount = 0
  unreadBookCount = 0

  currentBookId = ''
  currentBookPath = ''
  currentTitle = ''
  currentAuthor = ''
  currentBookmarks: number[] = []
  tocTitles: string[] = []
  tocRows: TocRow[] = []
  // The open book stays on the SD card: only its chapter count and one tiny
  // PageAnchor per page live in RAM. The visible page's text is derived on
  // demand by streaming a single chapter back in. A resident novel (in any
  // shape — parsed pages, chapter list, or one flat string) exhausted the
  // device's 4 MB PSRAM heap.
  chapterCount = 0
  pageAnchors: PageAnchor[] = []
  chapterStartPages: number[] = []
  pageText = ''
  // The visible page as display rows, split around its (single rendered)
  // illustration so the art canvas mounts in flow between them. Style classes
  // are precomputed per row; pages without art keep pageRowsB empty.
  pageRowsA: ReaderDisplayRow[] = []
  pageRowsB: ReaderDisplayRow[] = []
  pageImageOn = 0
  pageImageHref = ''
  // The book's landing page (page 0): its larger cover image decodes opaque and
  // is deferred until the walk frees memory (see paintPageArt).
  pageIsCover = 0
  // Absolute SD path to the extracted cover image, or '' when the book has no
  // cover. The cover page renders this full-screen via <img>; '' falls back to
  // the text title card. Populated once per book open (see cacheCoverArt).
  coverArtSrc = ''
  // 1 when the visible chapter opens with its own styled heading — the
  // synthesized chapter-title block stays hidden then (the book's heading
  // renders in flow instead).
  pageOwnHeading = 0
  pageChapterIndex = 0
  pageChapterTitle = ''
  pageFirstInChapter = 0
  pageIndex = 0
  // The page number SHOWN on screen. pageIndex advances instantly on every tap
  // (so a rapid burst accumulates), but the "N / M" label must not run ahead of
  // the page body — it's updated only when a page is actually derived+drawn
  // (see syncReaderLists), so the count changes together with the content.
  displayPageIndex = 0
  filter = FILTER_ALL
  selectedBookIndex = 0
  // Post-scan thumbnail pump cursor; -1 = idle (see pumpThumbnails).
  thumbPumpIndex = -1
  selectedBookId = ''

  settingsOpen = 0
  tocOpen = 0
  controlsOpen = 0
  fontIndex = 0
  fontSizeIndex = 1
  spacingIndex = 1
  marginIndex = 0

  librarySource = 'SD CARD / BOOKS'
  libraryStatus = 'SCANNING SD CARD'
  lastError = ''

  // Async settings-change repagination: the full-book anchor walk runs one
  // chapter per animation frame so the UI stays live (the visible page
  // re-renders in the new type instantly; page boundaries follow when the
  // walk completes). repagLabel feeds the settings panel's APPLYING row.
  repaginating = 0
  repagChapterIndex = 0
  repagFontKey = ''
  // Exact content position of the page on screen when the type change fired,
  // captured once (see rebuildPages) and resolved back to a page after the
  // walk (see finishRepagination/findPageForAnchor). A proportional page-ratio
  // resume drifted badly: reflow doesn't distribute pages evenly across
  // chapters (an image- or heading-heavy chapter grows disproportionately),
  // so a % position from the old pagination could land many pages — even
  // chapters — away from the actual text you were reading.
  repagResumeChapterIndex = 0
  repagResumeParagraphIndex = 0
  repagResumeWordIndex = 0
  repagLabel = ''
  // Settings taps only mark the pagination stale; the walk starts when the
  // settings panel closes (DONE), so cycling through fonts costs nothing.
  repagDirty = 0
  // Non-nullable class field: keeps reference identity across the rAF steps.
  // (A module-level `let` holding the builder was NOT visible across functions
  // in the generated C++ — reassignment silently split the cell.)
  repagBuilder = new Paginator(0, 1, 1, 0, 0)

  // First-open anchor walk. Opening a book with no cached pagination has to
  // stream and paginate every chapter, which takes seconds on device — so it
  // runs one chapter per animation frame behind a modal (opening = 1) instead
  // of blocking the UI in a single tick. openLabel / openChapterIndex drive
  // the modal's status line and progress bar; the same builder-identity note
  // as repagBuilder applies.
  // `opening` gates the modal; `openWalking` gates the rAF walk loop. They are
  // decoupled so the walk can keep paginating in the BACKGROUND after the modal
  // is dismissed: the reader shows the first (or resume) page the instant enough
  // of the book is paginated to place it, then the remaining chapters fill in
  // over the next frames while the user reads. `openEntered` guards the one-time
  // hand-off; `openNeedsFullWalk` marks the rare progress-only resume that can't
  // pick a page until the final page count is known.
  opening = 0
  openWalking = 0
  openEntered = 0
  openNeedsFullWalk = 0
  openLabel = ''
  openChapterIndex = 0
  openFontKey = ''
  openResumePage = 0
  openResumeProgress = 0
  openTitles: string[] = []
  openBuilder = new Paginator(0, 1, 1, 0, 0)

  initialize() {
    this.loadPreferences()
    this.applyRefreshMode()
    this.scanSd()
  }

  loadPreferences() {
    const font = Number(localStorage.getItem('folio_font'))
    const size = Number(localStorage.getItem('folio_size'))
    const spacing = Number(localStorage.getItem('folio_spacing'))
    const margin = Number(localStorage.getItem('folio_margin'))
    if (font >= 0 && font <= 3) this.fontIndex = Math.floor(font)
    if (size >= 0 && size <= 2) this.fontSizeIndex = Math.floor(size)
    if (spacing >= 0 && spacing <= 1) this.spacingIndex = Math.floor(spacing)
    if (margin >= 0 && margin <= 1) this.marginIndex = Math.floor(margin)
    const refresh = localStorage.getItem('folio_refresh')
    if (refresh == '0') this.refreshMode = 0
    else if (refresh == '1') this.refreshMode = 1
  }

  savePreferences() {
    localStorage.setItem('folio_font', String(this.fontIndex))
    localStorage.setItem('folio_size', String(this.fontSizeIndex))
    localStorage.setItem('folio_spacing', String(this.spacingIndex))
    localStorage.setItem('folio_margin', String(this.marginIndex))
    localStorage.setItem('folio_refresh', String(this.refreshMode))
  }

  // Page-turn refresh policy. FAST (1, the default) turns pages with the
  // calibrated 7-field four-gray waveform — no black flash — and clears
  // ghosting with an automatic full every 10 turns. QUALITY (0) promotes every
  // page turn to a full refresh: maximum crispness, with the classic e-ink flash.
  refreshMode = 1

  applyRefreshMode() {
    // Module-level helper on purpose: Display.setEpaperRefreshConfig only
    // lowers to the static host binding at module scope (see epaperMode.ts).
    applyEpaperReadingMode(this.refreshMode)
  }

  setRefreshMode(mode: number) {
    if (this.refreshMode == mode) return
    this.refreshMode = mode
    this.savePreferences()
    this.applyRefreshMode()
    // Immediate feedback + a clean slate for the newly selected waveform.
    Display.epaperFullRefresh()
  }

  savedPage(id: string): number {
    const value = Number(localStorage.getItem('folio_page_' + id))
    return value >= 0 ? Math.floor(value) : 0
  }

  savedProgress(id: string, fallback: number): number {
    const raw = localStorage.getItem('folio_progress_' + id)
    if (raw.length == 0) return fallback
    const value = Number(raw)
    return value >= 0 && value <= 1 ? value : fallback
  }

  savedLastReadAt(id: string, fallback: number): number {
    const raw = localStorage.getItem('folio_last_read_' + id)
    if (raw.length == 0) return fallback
    const value = Number(raw)
    return value >= 0 ? value : fallback
  }

  hydrateBookAt(index: number) {
    const id = this.books[index].id
    this.books[index].lastPage = this.savedPage(id)
    this.books[index].progress = this.savedProgress(id, this.books[index].progress)
    this.books[index].lastReadAt = this.savedLastReadAt(id, this.books[index].lastReadAt)
  }

  scanSd() {
    this.lastError = ''
    let sdBooks: ReaderBook[] = []
    try {
      sdBooks = scanSdBooks()
    } catch {
      this.lastError = 'THE SD CARD COULD NOT BE READ'
    }

    this.books = sdBooks
    for (let i = 0; i < this.books.length; i++) this.hydrateBookAt(i)
    this.librarySource = 'SD CARD / BOOKS'
    if (sdBooks.length > 0) {
      this.libraryStatus = sdBooks.length + (sdBooks.length == 1 ? ' EPUB FOUND' : ' EPUBS FOUND')
    } else {
      this.libraryStatus = this.lastError.length > 0 ? this.lastError : 'NO EPUBS FOUND • ADD .EPUB FILES TO /BOOKS'
    }
    this.selectedBookIndex = 0
    this.refreshVisibleBooks()
    this.pumpThumbnails()
  }

  // Cover thumbnails, one book per animation frame: existing thumb files
  // resolve instantly (a stat), missing ones pay one decode+downsample each --
  // spread across frames so a fresh card never freezes the library. One
  // refresh at the end swaps the typographic tiles for the art.
  pumpThumbnails() {
    // No running-guard: a pre-mount kick (initialize -> scanSd) schedules into
    // a frame loop that isn't running yet and silently dies, so the post-mount
    // kick must always start a fresh chain. Two live chains merely interleave
    // steps over the shared cursor -- harmless.
    this.thumbPumpIndex = 0
    requestAnimationFrame(() => this.thumbStep())
  }

  thumbStep() {
    if (this.thumbPumpIndex < 0) return
    if (this.thumbPumpIndex >= this.books.length) {
      this.thumbPumpIndex = -1
      this.refreshVisibleBooks()
      return
    }
    const path = this.books[this.thumbPumpIndex].path
    let ok = false
    try {
      ok = epubThumbnailCover(path, thumbCachePath(path), THUMB_MAX_W, THUMB_MAX_H)
    } catch {
      ok = false
    }
    // Write through the array index: a `const book = this.books[i]` binding
    // lowers to a VALUE COPY of the record in geatsc, so mutating it is lost.
    this.books[this.thumbPumpIndex].coverThumb = ok ? thumbCachePath(path) : ''
    this.thumbPumpIndex++
    requestAnimationFrame(() => this.thumbStep())
  }


  refreshVisibleBooks() {
    const visible: BookRow[] = []
    let readingCount = 0
    let unreadCount = 0
    for (let i = 0; i < this.books.length; i++) {
      const book = this.books[i]
      if (book.progress > 0 && book.progress < 1) readingCount++
      else if (book.progress <= 0) unreadCount++
      if (this.filter == FILTER_ALL ||
          (this.filter == FILTER_READING && book.progress > 0 && book.progress < 1) ||
          (this.filter == FILTER_UNREAD && book.progress <= 0)) {
        visible.push({
          id: book.id,
          title: book.title,
          author: book.author,
          monogram: bookMonogram(book.title),
          format: book.format,
          coverTone: book.coverTone,
          coverThumb: book.coverThumb,
          hasArt: book.coverThumb.length > 0 ? 1 : 0,
          progress: book.progress,
          progressPercent: Math.round(book.progress * 100),
          lastReadAt: book.lastReadAt
        })
      }
    }

    // Stable newest-first ordering. Books that have never been opened retain
    // their original library order below the most recently read titles.
    for (let i = 1; i < visible.length; i++) {
      const current = visible[i]
      let j = i - 1
      while (j >= 0 && visible[j].lastReadAt < current.lastReadAt) {
        visible[j + 1] = visible[j]
        j--
      }
      visible[j + 1] = current
    }

    this.visibleBooks = visible
    this.visibleBookCount = visible.length
    this.readingBookCount = readingCount
    this.unreadBookCount = unreadCount
    this.selectedBookId = visible.length > 0 ? visible[clampIndex(this.selectedBookIndex, visible.length)].id : ''
  }

  // Re-run the page-fill for a single page starting at its anchor and turn the
  // captured pieces into display rows. Costs one chapter fetch from the card —
  // cheap enough per page turn, and it keeps only the visible page
  // materialized. Rows split around the page's illustration (first image piece
  // wins; a second image on the same page is not rendered) so the art canvas
  // mounts in flow between the two lists.
  derivePageRows(pageIndex: number) {
    const anchor = this.pageAnchors[pageIndex]
    const filler = new Paginator(this.fontIndex, this.fontSizeIndex, this.spacingIndex, this.marginIndex, 1)
    // Each page belongs to a single chapter, so the fill stays within the
    // anchor's own chapter. firstInChapter pages reserve the title block (the
    // large chapter title is rendered separately by ReaderScreen) unless the
    // chapter opens with its own styled heading.
    const chapterAlreadyStarted = anchor.firstInChapter == 1 ? 0 : 1
    const paragraphs = chapterParagraphsCached(this.currentBookPath, anchor.chapterIndex)
    const hasTitle = this.tocTitles[anchor.chapterIndex].length > 0 ? 1 : 0
    filler.addChapterSlice(anchor.chapterIndex, 'ch' + anchor.chapterIndex, paragraphs, anchor.paragraphIndex, anchor.wordIndex, chapterAlreadyStarted, hasTitle)

    const rowsA: ReaderDisplayRow[] = []
    const rowsB: ReaderDisplayRow[] = []
    let imageHref = ''
    let text = ''
    for (let i = 0; i < filler.rows.length; i++) {
      const row = filler.rows[i]
      if (row.kind == 2) {
        if (imageHref.length == 0) imageHref = imageHrefOf(row.text)
        continue
      }
      // Consecutive same-style heading lines (an <h1> split by <br/>) stack
      // without the paragraph gap — mirrors the paginator's tight-run rule.
      let tight = 0
      if (row.kind == 1 && i + 1 < filler.rows.length) {
        const next = filler.rows[i + 1]
        if (next.kind == 1 && next.align == row.align && next.size == row.size && next.flags == row.flags) tight = 1
      }
      let className = 'page-par'
      if (row.align == 1) className += ' page-c'
      else if (row.align == 2) className += ' page-r'
      if (row.size == 1) className += ' page-s1'
      else if (row.size == 2) className += ' page-s2'
      if (row.flags == 1 || row.flags == 3) className += ' page-b'
      if (row.flags >= 2) className += ' page-i'
      if (tight == 1) className += ' page-tight'
      if (text.length > 0) text += '\n\n'
      text += row.text
      if (imageHref.length == 0) rowsA.push({ id: row.id, text: row.text, className })
      else rowsB.push({ id: row.id, text: row.text, className })
    }

    this.pageRowsA = rowsA
    this.pageRowsB = rowsB
    this.pageText = text
    this.pageOwnHeading = chapterRendersOwnHeading(paragraphs)
    this.pageIsCover = pageIndex == 0 ? 1 : 0
    // Was the art canvas already on screen (this page's predecessor also had
    // an image)? Captured before pageImageOn is overwritten below.
    const canvasAlreadyMounted = this.pageImageOn == 1
    if (imageHref.length > 0) {
      this.pageImageHref = imageHref
      this.pageImageOn = 1
      if (canvasAlreadyMounted) {
        // The <canvas> node already exists — paint right now, in the SAME
        // reactive flush as the text rows above, so the panel's e-paper
        // refresh carries the new image and new text together. Deferring
        // this (as the mount case below must) let the OLD image sit on
        // screen through one extra partial refresh before being replaced —
        // a visible lingering-then-swapped flash on every page turn between
        // two image pages.
        this.paintPageArt()
      } else {
        // First art on this canvas: the node doesn't exist until THIS
        // update's reactive re-render mounts it (the JSX conditional reacts
        // to pageImageOn after this method returns), so the draw has to wait
        // one frame for that mount to land.
        requestAnimationFrame(() => reader.paintPageArt())
      }
    } else {
      this.pageImageOn = 0
      this.pageImageHref = ''
    }
    // On the cover page the full-screen <img> (CoverArt) replaces the whole
    // paper, so PageArt's canvas isn't mounted and paintPageArt no-ops. Drive
    // the cover's runtime src from the store instead (mirroring paintPageArt) —
    // the bridged CoverArt's onAfterRender is not a reliable mount hook. The
    // node mounts during this update's flush; set src the following frame.
    if (this.pageIsCover == 1 && this.coverArtSrc.length > 0) {
      requestAnimationFrame(() => reader.paintCoverArt())
    }
  }

  paintCoverArt() {
    if (this.pageIsCover == 0 || this.coverArtSrc.length == 0) return
    applyCoverSrc(this.coverArtSrc)
  }

  // Rebuild a PageAnchor[] as a fresh value vector. Object-literal pushes keep
  // the element type PageAnchor (value) — the loadAnchorCache shape — whereas
  // spread/slice of a typed struct vector boxes elements to shared_ptr and
  // mismatches the field type. Used for the incremental-open entry preview so
  // its array reference differs from the raw vector published at completion.
  copyAnchors(src: PageAnchor[]): PageAnchor[] {
    const out: PageAnchor[] = []
    for (let i = 0; i < src.length; i++) {
      const a = src[i]
      out.push({ chapterIndex: a.chapterIndex, paragraphIndex: a.paragraphIndex, wordIndex: a.wordIndex, firstInChapter: a.firstInChapter })
    }
    return out
  }

  paintPageArt() {
    if (this.pageImageOn == 0) return
    // Defer the cover's larger decode until the background walk frees its memory;
    // the walk-completion re-derive repaints it. Decode the cover opaque (no
    // alpha plane) — with the monochrome grayscale decode this fits device PSRAM.
    if (this.pageIsCover == 1 && this.openWalking == 1) return
    drawPageArt(this.currentBookPath, this.pageImageHref, this.pageIsCover == 1)
  }

  syncReaderLists() {
    if (this.pageAnchors.length == 0) {
      this.pageText = ''
      this.pageRowsA = []
      this.pageRowsB = []
      this.pageImageOn = 0
      this.pageImageHref = ''
      this.pageIsCover = 0
      this.pageOwnHeading = 0
      this.pageChapterIndex = 0
      this.pageChapterTitle = ''
      this.pageFirstInChapter = 0
      this.refreshTocRows()
      return
    }
    const index = clampIndex(this.pageIndex, this.pageAnchors.length)
    const anchor = this.pageAnchors[index]
    // Update the on-screen page number in lockstep with the body being drawn.
    this.displayPageIndex = index
    this.derivePageRows(index)
    this.pageChapterIndex = anchor.chapterIndex
    this.pageChapterTitle = this.tocTitles[anchor.chapterIndex]
    this.pageFirstInChapter = anchor.firstInChapter
    // Rebuilding the TOC rows costs a full record-list churn per page turn;
    // the panel refreshes itself when it opens.
    if (this.tocOpen == 1) this.refreshTocRows()
  }

  refreshTocRows() {
    const rows: TocRow[] = []
    for (let chapterIndex = 0; chapterIndex < this.tocTitles.length; chapterIndex++) {
      rows.push({
        id: 'toc-' + chapterIndex,
        chapterIndex,
        number: chapterIndex + 1,
        title: this.tocTitles[chapterIndex],
        pageNumber: this.pageForChapter(chapterIndex),
        current: this.pageChapterIndex == chapterIndex ? 1 : 0
      })
    }
    this.tocRows = rows
    this.refreshTocPage()
  }

  // The Contents list is PAGED, not scrolled: every scroll update costs a full
  // 540x856 FAST partial, so continuous
  // scrolling tops out around 5 updates/s and smears — a page flip is one clean
  // partial, exactly like turning a reading page. 8 rows of 88 px fill the list
  // area above the pager bar; titles ellipsize to one line so rows stay fixed.
  tocPage = 0
  tocPageCount = 1
  tocPageRows: TocRow[] = []

  refreshTocPage() {
    const perPage = 8
    const total = this.tocRows.length
    this.tocPageCount = total > 0 ? Math.ceil(total / perPage) : 1
    this.tocPage = clampIndex(this.tocPage, this.tocPageCount)
    const start = this.tocPage * perPage
    const rows: TocRow[] = []
    for (let i = start; i < start + perPage && i < total; i++) rows.push(this.tocRows[i])
    this.tocPageRows = rows
  }

  tocNextPage() {
    if (this.tocPage + 1 >= this.tocPageCount) return
    this.tocPage = this.tocPage + 1
    this.refreshTocPage()
  }

  tocPrevPage() {
    if (this.tocPage <= 0) return
    this.tocPage = this.tocPage - 1
    this.refreshTocPage()
  }

  get tocPageLabel(): string {
    return this.tocPage + 1 + ' / ' + this.tocPageCount
  }

  // All reading-position readouts track displayPageIndex (the drawn page), not
  // the live pageIndex which races ahead during a coalesced multi-tap burst.
  get pageNumberLabel(): string {
    return this.pageAnchors.length > 0 ? this.displayPageIndex + 1 + ' / ' + this.pageAnchors.length : '0 / 0'
  }

  get progressPercent(): number {
    if (this.pageAnchors.length <= 1) return 0
    return Math.round((this.displayPageIndex / (this.pageAnchors.length - 1)) * 100)
  }

  get progressHeight(): number {
    return Math.max(18, Math.round((this.progressPercent / 100) * 960))
  }

  get minutesLeft(): number {
    return Math.max(1, Math.ceil((this.pageAnchors.length - this.displayPageIndex - 1) * 1.6))
  }

  // A chapter's first page shows its title as a large header (pagination
  // reserved the space); only when the chapter actually has a title AND its
  // content doesn't open with its own styled heading (which renders the same
  // title in flow — showing both would duplicate it).
  get showChapterTitle(): number {
    return this.pageFirstInChapter == 1 && this.pageChapterTitle.length > 0 && this.pageOwnHeading == 0 ? 1 : 0
  }

  get isBookmarked(): number {
    for (let i = 0; i < this.currentBookmarks.length; i++) {
      if (this.currentBookmarks[i] == this.pageIndex) return 1
    }
    return 0
  }

  get readerClass(): string {
    // toc-covering hides everything the full-screen opaque Contents panel sits
    // on (page, zones, chrome) while it is open. Not cosmetic: the engine's
    // scroll fast path (RootScrollOnlyRefresh) rejects a scroll frame when any
    // visible node outside the scroll subtree overlaps the scroll viewport, so
    // with the reader page "visible" underneath, every Contents drag fell back
    // to a full-tree relayout+replay (~850 ms on device) that also starved
    // touch events. Hidden, the drag takes the shift+translate path.
    return 'reader-screen font-' + this.fontIndex + ' size-' + this.fontSizeIndex + ' spacing-' + this.spacingIndex + ' margin-' + this.marginIndex + (this.tocOpen == 1 ? ' toc-covering' : '')
  }

  get fontLabel(): string {
    if (this.fontIndex == 0) return 'BOOK'
    if (this.fontIndex == 1) return 'CLEAN'
    if (this.fontIndex == 2) return 'CONDENSED'
    return 'SERIF'
  }

  get sizeLabel(): string {
    if (this.fontSizeIndex == 0) return '22 PX'
    if (this.fontSizeIndex == 1) return '26 PX'
    return '30 PX'
  }

  get spacingLabel(): string {
    return this.spacingIndex == 0 ? 'COMPACT' : 'RELAXED'
  }

  get marginLabel(): string {
    return this.marginIndex == 0 ? 'NARROW' : 'WIDE'
  }

  get fontPreviewClass(): string {
    return 'setting-preview font-preview font-preview-' + this.fontIndex
  }

  get sizePreviewClass(): string {
    return 'setting-preview size-preview size-preview-' + this.fontSizeIndex
  }

  get leadingPreviewClass(): string {
    return 'setting-preview leading-preview leading-preview-' + this.spacingIndex
  }

  // Just the fixed-size icon's classes — the flex:1 row-growing wrapper that
  // pushes the CHANGE button flush right lives separately in the template
  // (a bare .setting-preview span), so the icon can stay a small fixed box
  // instead of stretching to fill the row.
  get marginPreviewClass(): string {
    return 'margin-preview margin-preview-' + this.marginIndex
  }

  setFilter(filter: number) {
    this.filter = filter
    this.selectedBookIndex = 0
    this.refreshVisibleBooks()
  }

  moveLibrarySelection(delta: number) {
    const books: BookRow[] = this.visibleBooks
    if (books.length == 0) return
    let next = this.selectedBookIndex + delta
    if (next < 0) next = books.length - 1
    if (next >= books.length) next = 0
    this.selectedBookIndex = next
    this.selectedBookId = books[next].id
  }

  openSelectedBook() {
    const books: BookRow[] = this.visibleBooks
    if (books.length == 0) return
    this.openBook(books[clampIndex(this.selectedBookIndex, books.length)].id)
  }

  // Read just the book's metadata (title, author, chapter count) from the
  // card. Fast — no pagination. The heavy anchor walk that streams and
  // paginates every chapter is deferred to the incremental first-open path
  // (openStep) so it can report progress instead of freezing the UI.
  readBookMeta(path: string): number {
    clearChapterCache()
    this.currentBookPath = path
    const meta = epubMeta(path, this.currentTitle, this.currentAuthor)
    const count = Math.floor(Number(meta[2]))
    if (count <= 0) throw new Error('The EPUB has no readable spine content.')
    if (meta[0].length > 0) this.currentTitle = meta[0]
    if (meta[1].length > 0) this.currentAuthor = meta[1]
    return count
  }

  openBook(id: string) {
    // `opening` covers the modal phase; `openWalking` also covers the
    // background phase after incremental entry, so a re-open can't spawn a
    // second concurrent walk (closeBook clears both before returning to lib).
    if (this.opening == 1 || this.openWalking == 1) return
    let selectedIndex = -1
    for (let i = 0; i < this.books.length; i++) {
      if (this.books[i].id == id) selectedIndex = i
    }
    if (selectedIndex < 0) return

    this.lastError = ''
    this.currentBookId = this.books[selectedIndex].id
    this.currentTitle = this.books[selectedIndex].title
    this.currentAuthor = this.books[selectedIndex].author
    const savedPage = this.books[selectedIndex].lastPage
    const savedProgress = this.books[selectedIndex].progress
    const path = this.books[selectedIndex].path
    this.currentBookmarks = readSavedBookmarks(this.currentBookId)

    let count = 0
    try {
      count = this.readBookMeta(path)
    } catch {
      this.lastError = 'EPUB COULD NOT BE OPENED • CHECK THE FILE'
      this.libraryStatus = this.lastError
      this.view = VIEW_LIBRARY
      return
    }
    this.chapterCount = count

    // Extract the cover to an SD file (cached across opens) so the landing page
    // can render it full-screen with a plain <img src>. Empty path => no cover
    // => the reader shows the text page instead of the cover component.
    const coverPath = coverCachePath(path)
    this.coverArtSrc = epubCacheCover(path, coverPath) ? coverPath : ''

    // Re-opens (and any book already paginated for the current type settings)
    // hit the on-card anchor cache and open instantly — no walk, no modal.
    const fontKey = anchorFontKey(this.fontIndex, this.fontSizeIndex, this.spacingIndex, this.marginIndex)
    const cached = loadAnchorCache(path, fontKey, count)
    if (cached.ok == 1 && cached.anchors.length > 0) {
      this.tocTitles = cached.titles
      this.pageAnchors = cached.anchors
      this.chapterStartPages = cached.chapterStartPages
      this.enterReaderAtSaved(savedPage, savedProgress)
      return
    }

    // First open with no cached pagination: walk the book one chapter per
    // animation frame. The modal shows only until the resume page is reachable —
    // then the reader takes over and the rest paginates in the background.
    this.settingsOpen = 0
    this.tocOpen = 0
    this.controlsOpen = 0
    this.openResumePage = savedPage
    this.openResumeProgress = savedProgress
    this.openFontKey = fontKey
    this.openBuilder = new Paginator(this.fontIndex, this.fontSizeIndex, this.spacingIndex, this.marginIndex, 0)
    this.openTitles = []
    this.openChapterIndex = 0
    this.pageAnchors = []
    this.chapterStartPages = []
    this.tocTitles = []
    this.pageText = ''
    this.openEntered = 0
    // A resume stored only as a progress fraction (no page index) can't be
    // turned into a page until the whole book is paginated and the final count
    // is known, so that case keeps the modal to the end. Every normal resume
    // records a page index too (recordPosition writes both), so the common path
    // enters as soon as that page — or page 0 on a fresh open — is reachable.
    this.openNeedsFullWalk = savedPage == 0 && savedProgress > 0 ? 1 : 0
    this.opening = 1
    this.openWalking = 1
    this.openLabel = 'Reading the table of contents'
    requestAnimationFrame(() => reader.openStep())
  }

  openStep() {
    if (this.openWalking == 0) return
    const i = this.openChapterIndex
    if (i < this.chapterCount) {
      const fields = epubChapterFields(this.currentBookPath, i)
      const title = fields.length >= 1 ? fields[0] : ''
      this.openTitles.push(title)
      this.openBuilder.addChapterSlice(i, 'ch' + i, fields.length >= 2 ? splitParagraphs(fields[1]) : [], 0, 0, 0, title.length > 0 ? 1 : 0)
      while (this.openBuilder.chapterStartPages.length < i + 1) {
        this.openBuilder.chapterStartPages.push(this.openBuilder.anchors.length > 0 ? this.openBuilder.anchors.length - 1 : 0)
      }
      this.openChapterIndex = i + 1
      this.openLabel = 'Paginating chapter ' + (i + 1) + ' of ' + this.chapterCount
      // Hand off to the reader the moment the resume page is paginated; the
      // loop keeps running in the background for the remaining chapters.
      this.maybeEnterIncrementally()
      requestAnimationFrame(() => reader.openStep())
      return
    }

    // Whole book paginated: publish the final anchors and persist them.
    this.openWalking = 0
    this.openLabel = ''
    if (this.openBuilder.anchors.length == 0) {
      this.opening = 0
      this.lastError = 'EPUB COULD NOT BE OPENED • CHECK THE FILE'
      this.libraryStatus = this.lastError
      this.view = VIEW_LIBRARY
      return
    }
    // Publish the raw grown vectors. Their references differ from the entry
    // preview copies (maybeEnterIncrementally), so the reactive store registers
    // these as new values and the reader jumps from the entry snapshot to the
    // full book. Raw (no copy) is safe here — this is exactly what the original
    // blocking open did, and it's the single authoritative publish.
    this.tocTitles = this.openTitles
    this.pageAnchors = this.openBuilder.anchors
    this.chapterStartPages = this.openBuilder.chapterStartPages
    saveAnchorCache(this.currentBookPath, this.openFontKey, this.chapterCount, this.openTitles, this.openBuilder.chapterStartPages, this.openBuilder.anchors)
    if (this.openEntered == 1) {
      // Already reading in the background — refresh the now-final page count /
      // TOC and record the exact position (the walking guard is now clear). The
      // library→reader transition full-refresh was deferred from the incremental
      // entry to here (scheduling it mid-walk stalls the walk); do it now.
      this.opening = 0
      this.syncReaderLists()
      this.recordPosition()
      this.scheduleTransitionRefresh()
      return
    }
    this.opening = 0
    this.enterReaderAtSaved(this.openResumePage, this.openResumeProgress)
  }

  // Enter the reader mid-walk once enough chapters are paginated to place the
  // reader at its resume page (page 0 on a fresh open). The published arrays are
  // the builder's own still-growing vectors, so page turns and rendering pick up
  // new pages as they land; the visible page count is approximate until the walk
  // finishes (it catches up on the next turn) and exact once it completes.
  maybeEnterIncrementally() {
    if (this.openEntered == 1) return
    if (this.openNeedsFullWalk == 1) return
    if (this.openBuilder.anchors.length <= this.openResumePage) return
    this.openEntered = 1
    // Publish a DISTINCT array reference from the one completion will publish:
    // the reactive store snapshots the array on assignment and never observes
    // later in-place growth of the SAME reference, so the entry preview and the
    // final full list must be different objects or the reader freezes on the
    // entry snapshot. Entry gets a fresh rebuilt copy (tiny — only the chapters
    // walked so far); completion (openStep) assigns the raw growing vector,
    // whose reference differs from this copy, so that publish registers.
    // copyAnchors rebuilds via object-literal pushes (the loadAnchorCache
    // shape) because spreading/slicing a typed struct vector boxes the elements
    // to shared_ptr and mismatches the PageAnchor[] field type.
    this.tocTitles = [...this.openTitles]
    this.pageAnchors = this.copyAnchors(this.openBuilder.anchors)
    this.chapterStartPages = [...this.openBuilder.chapterStartPages]
    this.pageIndex = clampIndex(this.openResumePage, this.pageAnchors.length)
    this.opening = 0
    this.openLabel = ''
    this.settingsOpen = 0
    this.tocOpen = 0
    this.controlsOpen = 0
    this.view = VIEW_READER
    this.syncReaderLists()
    // NOTE: do NOT schedule the transition full-refresh here. This runs mid-walk
    // (openWalking == 1), and its extra requestAnimationFrame competes with the
    // walk's own openStep rAF continuation and silently stalls the walk right
    // after entry. The full refresh is scheduled once at walk completion instead
    // (openStep, openEntered branch).
  }

  enterReaderAtSaved(savedPage: number, savedProgress: number) {
    this.pageIndex = clampIndex(savedPage, this.pageAnchors.length)
    if (savedPage == 0 && savedProgress > 0 && this.pageAnchors.length > 1) {
      this.pageIndex = clampIndex(Math.round(savedProgress * (this.pageAnchors.length - 1)), this.pageAnchors.length)
    }
    this.settingsOpen = 0
    this.tocOpen = 0
    this.controlsOpen = 0
    this.view = VIEW_READER
    this.syncReaderLists()
    this.recordPosition()
    this.scheduleTransitionRefresh()
  }

  get openPercent(): number {
    if (this.chapterCount <= 0) return 0
    const pct = Math.round((this.openChapterIndex / this.chapterCount) * 100)
    return pct > 100 ? 100 : pct
  }

  // Fill width in px against the 380px-wide .opening-track. Numeric px inline
  // width is the reliable style binding on device (percentage-string widths
  // are not); the track width here must match OpeningModal.css.
  get openFillPx(): number {
    return Math.round((this.openPercent / 100) * 380)
  }

  recordPosition() {
    if (this.currentBookId.length == 0 || this.pageAnchors.length == 0) return
    // While the background walk is still running the page COUNT isn't final, so
    // a progress fraction computed now (small denominator) would read far too
    // high. Persist the page index and timestamp (both exact) and leave the
    // stored progress alone until the walk completes and recordPosition runs
    // again with the true denominator. hasProgress<0 marks "don't touch it".
    const hasProgress = this.openWalking == 0 && this.pageAnchors.length > 1
    const progress = hasProgress ? this.pageIndex / (this.pageAnchors.length - 1) : -1
    const lastReadAt = Date.now()
    for (let i = 0; i < this.books.length; i++) {
      if (this.books[i].id == this.currentBookId) {
        this.books[i].lastPage = this.pageIndex
        if (hasProgress) this.books[i].progress = progress
        this.books[i].lastReadAt = lastReadAt
      }
    }
    localStorage.setItem('folio_page_' + this.currentBookId, String(this.pageIndex))
    if (hasProgress) localStorage.setItem('folio_progress_' + this.currentBookId, String(progress))
    localStorage.setItem('folio_last_read_' + this.currentBookId, String(lastReadAt))
    localStorage.setItem('folio_marks_' + this.currentBookId, bookmarkString(this.currentBookmarks))
  }

  // Page turns respond IMMEDIATELY (no settle delay) but still COALESCE any
  // taps that land during a refresh. A tap moves pageIndex (instant) and, if no
  // derive is already pending, schedules one for the next frame. Because the
  // ~1 s e-paper refresh blocks the runtime task, taps arriving mid-refresh
  // keep advancing pageIndex and re-arm a single pending derive that fires when
  // the refresh finishes — reading the LATEST pageIndex. So one tap turns on
  // the next frame (~16 ms), while three quick taps on page 60 draw page 61
  // (the first, shown at once) then jump straight to 63 — the 62 render is
  // never generated. The "N / M" label reads displayPageIndex (set at draw time
  // in syncReaderLists), so the count changes together with the page body.
  pageTurnQueued = 0

  nextPage() {
    if (this.repaginating == 1) return
    if (this.pageIndex + 1 >= this.pageAnchors.length) return
    this.pageIndex = this.pageIndex + 1
    this.queuePageTurn()
  }

  previousPage() {
    if (this.repaginating == 1) return
    if (this.pageIndex <= 0) return
    this.pageIndex = this.pageIndex - 1
    this.queuePageTurn()
  }

  queuePageTurn() {
    if (this.pageTurnQueued == 1) return
    this.pageTurnQueued = 1
    requestAnimationFrame(() => reader.flushPageTurn())
  }

  flushPageTurn() {
    // Clear the pending flag FIRST so taps that arrive during the refresh this
    // derive kicks off re-arm a fresh flush (and thus a jump to the new page).
    this.pageTurnQueued = 0
    if (this.view != VIEW_READER) return
    this.syncReaderLists()
    this.recordPosition()
  }

  closeBook() {
    this.recordPosition()
    this.settingsOpen = 0
    this.tocOpen = 0
    this.controlsOpen = 0
    this.view = VIEW_LIBRARY
    // Release the open book's state — the next open rebuilds it from the card
    // (with the current preferences, so a pending settings flush is moot).
    this.repaginating = 0
    this.repagLabel = ''
    this.repagDirty = 0
    // Stop any in-flight background pagination walk.
    this.openWalking = 0
    this.openEntered = 0
    this.opening = 0
    clearChapterCache()
    this.chapterCount = 0
    this.pageAnchors = []
    this.chapterStartPages = []
    this.tocTitles = []
    this.tocRows = []
    this.pageText = ''
    this.pageRowsA = []
    this.pageRowsB = []
    this.pageImageOn = 0
    this.pageImageHref = ''
    this.pageOwnHeading = 0
    this.currentBookId = ''
    this.currentBookPath = ''
    this.selectedBookIndex = 0
    this.refreshVisibleBooks()
    this.scheduleTransitionRefresh()
  }

  toggleBookmark() {
    let found = -1
    for (let i = 0; i < this.currentBookmarks.length; i++) {
      if (this.currentBookmarks[i] == this.pageIndex) found = i
    }
    if (found >= 0) this.currentBookmarks.splice(found, 1)
    else this.currentBookmarks.push(this.pageIndex)
    this.recordPosition()
  }

  toggleSettings() {
    this.settingsOpen = this.settingsOpen ? 0 : 1
    if (this.settingsOpen) {
      this.tocOpen = 0
      this.controlsOpen = 0
    } else {
      this.flushSettingsChanges()
    }
    this.syncEpaperScrollMode()
  }

  toggleToc() {
    this.tocOpen = this.tocOpen ? 0 : 1
    if (this.tocOpen) {
      this.settingsOpen = 0
      this.controlsOpen = 0
      // Open on the page that contains the chapter being read.
      this.tocPage = Math.floor(this.pageChapterIndex / 8)
      this.refreshTocRows()
      this.flushSettingsChanges()
    }
    this.syncEpaperScrollMode()
  }

  toggleReaderControls() {
    this.controlsOpen = this.controlsOpen ? 0 : 1
    if (this.controlsOpen) {
      this.settingsOpen = 0
      this.tocOpen = 0
      this.flushSettingsChanges()
    }
    this.syncEpaperScrollMode()
  }

  closeReaderControls() {
    this.controlsOpen = 0
    this.syncEpaperScrollMode()
  }

  closePanels() {
    this.settingsOpen = 0
    this.tocOpen = 0
    this.controlsOpen = 0
    this.flushSettingsChanges()
    this.syncEpaperScrollMode()
  }

  jumpToChapter(chapterIndex: number) {
    if (this.repaginating == 1) return
    if (chapterIndex < 0 || chapterIndex >= this.chapterStartPages.length) return
    this.pageIndex = clampIndex(this.chapterStartPages[chapterIndex], this.pageAnchors.length)
    this.tocOpen = 0
    this.syncReaderLists()
    this.recordPosition()
    this.syncEpaperScrollMode()
  }

  pageForChapter(chapterIndex: number): number {
    if (chapterIndex < 0 || chapterIndex >= this.chapterStartPages.length) return 1
    return this.chapterStartPages[chapterIndex] + 1
  }

  rebuildPages() {
    if (this.currentBookId.length == 0 || this.chapterCount == 0) return
    // A settings change supersedes any first-open background walk (it paginated
    // the previous type settings). Stop it before repaginating for the new ones.
    this.openWalking = 0
    this.openEntered = 0
    this.savePreferences()
    // Preserve the reading position as the exact content anchor of the page on
    // screen — captured once so rapid setting taps mid-repagination keep the
    // original spot (not whatever's on screen after the first walk moved it).
    if (this.repaginating == 0) {
      if (this.pageAnchors.length > 0) {
        const anchor = this.pageAnchors[clampIndex(this.pageIndex, this.pageAnchors.length)]
        this.repagResumeChapterIndex = anchor.chapterIndex
        this.repagResumeParagraphIndex = anchor.paragraphIndex
        this.repagResumeWordIndex = anchor.wordIndex
      } else {
        this.repagResumeChapterIndex = 0
        this.repagResumeParagraphIndex = 0
        this.repagResumeWordIndex = 0
      }
    }
    const fontKey = anchorFontKey(this.fontIndex, this.fontSizeIndex, this.spacingIndex, this.marginIndex)
    const cached = loadAnchorCache(this.currentBookPath, fontKey, this.chapterCount)
    if (cached.ok == 1 && cached.anchors.length > 0) {
      this.pageAnchors = cached.anchors
      this.chapterStartPages = cached.chapterStartPages
      this.finishRepagination()
      return
    }
    // No cached pagination for this font key: walk the book one chapter per
    // animation frame. A repeat tap while a walk is running simply restarts
    // it with the newest settings.
    this.repagBuilder = new Paginator(this.fontIndex, this.fontSizeIndex, this.spacingIndex, this.marginIndex, 0)
    this.repagChapterIndex = 0
    this.repagFontKey = fontKey
    this.repagLabel = 'APPLYING 0 / ' + this.chapterCount
    if (this.repaginating == 0) {
      this.repaginating = 1
      requestAnimationFrame(() => reader.repagStep())
    }
  }

  repagStep() {
    if (this.repaginating == 0) return
    const i = this.repagChapterIndex
    if (i < this.chapterCount) {
      const fields = epubChapterFields(this.currentBookPath, i)
      const hasTitle = i < this.tocTitles.length && this.tocTitles[i].length > 0 ? 1 : 0
      this.repagBuilder.addChapterSlice(i, 'ch' + i, fields.length >= 2 ? splitParagraphs(fields[1]) : [], 0, 0, 0, hasTitle)
      while (this.repagBuilder.chapterStartPages.length < i + 1) {
        this.repagBuilder.chapterStartPages.push(this.repagBuilder.anchors.length > 0 ? this.repagBuilder.anchors.length - 1 : 0)
      }
      this.repagChapterIndex = i + 1
      this.repagLabel = 'APPLYING ' + (i + 1) + ' / ' + this.chapterCount
      requestAnimationFrame(() => reader.repagStep())
      return
    }
    if (this.repagBuilder.anchors.length > 0) {
      this.pageAnchors = this.repagBuilder.anchors
      this.chapterStartPages = this.repagBuilder.chapterStartPages
      saveAnchorCache(this.currentBookPath, this.repagFontKey, this.chapterCount, this.tocTitles, this.repagBuilder.chapterStartPages, this.repagBuilder.anchors)
    }
    this.finishRepagination()
  }

  finishRepagination() {
    this.repaginating = 0
    this.repagLabel = ''
    this.pageIndex = this.findPageForAnchor(this.repagResumeChapterIndex, this.repagResumeParagraphIndex, this.repagResumeWordIndex)
    this.syncReaderLists()
    this.recordPosition()
  }

  // The last page whose own anchor is at or before the given content
  // position — i.e. the page that contains it. pageAnchors is in strict
  // reading order (chapter, then paragraph, then word), so once an anchor is
  // found past the target every later one is too; the scan can stop there.
  findPageForAnchor(chapterIndex: number, paragraphIndex: number, wordIndex: number): number {
    let result = 0
    for (let i = 0; i < this.pageAnchors.length; i++) {
      const a = this.pageAnchors[i]
      const atOrBefore = a.chapterIndex < chapterIndex ||
        (a.chapterIndex == chapterIndex && a.paragraphIndex < paragraphIndex) ||
        (a.chapterIndex == chapterIndex && a.paragraphIndex == paragraphIndex && a.wordIndex <= wordIndex)
      if (atOrBefore) result = i
      else break
    }
    return result
  }

  cycleFont() {
    this.fontIndex = (this.fontIndex + 1) % 4
    this.markSettingsChanged()
  }

  cycleSize() {
    this.fontSizeIndex = (this.fontSizeIndex + 1) % 3
    this.markSettingsChanged()
  }

  cycleSpacing() {
    this.spacingIndex = this.spacingIndex ? 0 : 1
    this.markSettingsChanged()
  }

  cycleMargins() {
    this.marginIndex = this.marginIndex ? 0 : 1
    this.markSettingsChanged()
  }

  markSettingsChanged() {
    this.savePreferences()
    this.repagDirty = 1
  }

  // Runs the deferred repagination when the settings panel goes away.
  flushSettingsChanges() {
    if (this.repagDirty == 0) return
    this.repagDirty = 0
    this.rebuildPages()
  }

  fullRefresh() {
    Display.epaperFullRefresh()
  }

  // The reader renders through calibrated four-level FAST with periodic cleanup.
  // The Contents panel is the only scrollable surface, so while it is open use
  // transient FAST without spending a full cleanup in the middle of a fling.
  // Restore reading cadence the moment the panel closes.
  // Toggling grayscale also forces a full refresh in the driver, which cleanly
  // brackets the panel open/close — but that full refresh is exactly why this
  // must fire ONLY on an actual mode change, never per scroll frame.
  epaperFastMode = 0
  syncEpaperScrollMode() {
    const fast = this.tocOpen == 1 ? 1 : 0
    if (this.epaperFastMode == fast) return
    this.epaperFastMode = fast
    // fast==1 → transient FAST; fast==0 → reading policy with cleanup cadence.
    setEpaperGrayscale(fast == 1 ? 0 : 1)
  }

  // A library<->reader view switch replaces the whole screen, but the e-paper
  // panel only does incremental (partial) updates by default — so pixels from
  // the old view that the new one doesn't overdraw (the reader's "N / M" page
  // label, a book cover's blank area) linger as ghosts. Request a full GC16
  // refresh, but on the NEXT frame: the driver's forceFullRefresh flag is
  // consumed by the following present, so the destination view must be painted
  // first or the refresh would just re-flush the stale frame. Page turns keep
  // using partial refresh (this is only wired to the two view transitions), so
  // there's no full-screen flash while reading.
  scheduleTransitionRefresh() {
    requestAnimationFrame(() => Display.epaperFullRefresh())
  }

  keydown(keyCode: number) {
    if (this.view == VIEW_LIBRARY) {
      if (keyCode == 38) this.moveLibrarySelection(-1)
      else if (keyCode == 40) this.moveLibrarySelection(1)
      else if (keyCode == 13 || keyCode == 39) this.openSelectedBook()
      else if (keyCode == 82) this.scanSd()
      return
    }

    if (this.settingsOpen || this.tocOpen || this.controlsOpen) {
      if (keyCode == 27 || keyCode == 8) this.closePanels()
      else if (this.tocOpen == 1 && (keyCode == 37 || keyCode == 38)) this.tocPrevPage()
      else if (this.tocOpen == 1 && (keyCode == 39 || keyCode == 40 || keyCode == 32)) this.tocNextPage()
      return
    }
    if (keyCode == 37 || keyCode == 38) this.previousPage()
    else if (keyCode == 39 || keyCode == 40 || keyCode == 32) this.nextPage()
    else if (keyCode == 27 || keyCode == 8) this.closeBook()
    else if (keyCode == 66) this.toggleBookmark()
    else if (keyCode == 84) this.toggleToc()
    else if (keyCode == 77) this.toggleSettings()
  }
}

export const reader = new ReaderStore()
