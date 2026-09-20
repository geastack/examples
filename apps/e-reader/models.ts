export interface EpubChapter {
  id: string
  title: string
  paragraphs: string[]
}

export interface ParsedEpub {
  title: string
  author: string
  chapters: EpubChapter[]
}

export interface ReaderBook {
  id: string
  title: string
  author: string
  path: string
  format: string
  source: string
  coverTone: number
  coverThumb: string
  progress: number
  lastReadAt: number
  lastPage: number
  bookmarks: number[]
  chapters: EpubChapter[]
}

export interface BookRow {
  id: string
  title: string
  author: string
  monogram: string
  format: string
  coverTone: number
  coverThumb: string
  hasArt: number
  progress: number
  progressPercent: number
  lastReadAt: number
}

export interface TocRow {
  id: string
  chapterIndex: number
  number: number
  title: string
  pageNumber: number
  current: number
}

export interface ReaderPageParagraph {
  id: string
  // For kind 2 the text is the U+E000 image marker (href follows the marker);
  // otherwise the visible words of this piece.
  text: string
  kind: number // 0 body, 1 styled block, 2 image
  align: number // 0 left, 1 center, 2 right
  size: number // 0 body, 1 ~1.3x, 2 ~1.6x
  flags: number // bit0 bold, bit1 italic
}

// One visible paragraph piece prepared for the template: the style classes
// are precomputed so the row record stays plain strings.
export interface ReaderDisplayRow {
  id: string
  text: string
  className: string
}

export interface ReaderPage {
  id: string
  chapterIndex: number
  chapterTitle: string
  firstInChapter: number
  chapterStarts: number[]
  paragraphs: ReaderPageParagraph[]
}

export interface SdBookRecord {
  id?: string
  title?: string
  author?: string
  path: string
  coverTone?: number
  progress?: number
  lastReadAt?: number
}

export interface SdLibraryIndex {
  version: number
  books: SdBookRecord[]
}
