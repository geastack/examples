declare const epubArchive: {
  parse(path: string, fallbackTitle: string, fallbackAuthor: string): string
  meta(path: string, fallbackTitle: string, fallbackAuthor: string): string
  chapter(path: string, spineIndex: number): string
  readTextFile(path: string): string
  writeTextFile(path: string, text: string): boolean
  coverBytes(path: string): Uint8Array
  cacheCover(path: string, outPath: string): boolean
  thumbnailCover(path: string, thumbPath: string, maxW: number, maxH: number): boolean
  imageBytes(path: string, href: string): Uint8Array
}

// Image paragraphs from chapter() carry this U+E000 private-use sentinel prefix
// followed by the image's resolved zip href. It never appears in book text.
export const IMAGE_MARKER = ''

// The resolved zip href of an image-marker paragraph, or '' for normal text.
export function imageHrefOf(paragraph: string): string {
  return paragraph.length > 0 && paragraph.charCodeAt(0) == 0xe000 ? paragraph.slice(1) : ''
}

// Styled blocks carry a U+E001 prefix followed by three style characters:
// A align ('l'/'c'/'r'), S size bucket ('0' body, '1' ~1.3x, '2' ~1.6x),
// F flag digit (bit0 bold, bit1 italic). Emitted by the native parser from
// the book's own stylesheets; plain body paragraphs stay unprefixed.

// 0 = plain body text, 1 = styled block, 2 = image.
export function paragraphKind(paragraph: string): number {
  if (paragraph.length == 0) return 0
  const code = paragraph.charCodeAt(0)
  if (code == 0xe000) return 2
  if (code == 0xe001) return 1
  return 0
}

// Styled-block accessors; safe on any paragraph (defaults for body text).
export function styledAlign(paragraph: string): number {
  if (paragraphKind(paragraph) != 1 || paragraph.length < 4) return 0
  const align = paragraph.slice(1, 2)
  return align == 'c' ? 1 : align == 'r' ? 2 : 0
}

export function styledSize(paragraph: string): number {
  if (paragraphKind(paragraph) != 1 || paragraph.length < 4) return 0
  const size = paragraph.charCodeAt(2) - 48
  return size >= 0 && size <= 2 ? size : 0
}

export function styledFlags(paragraph: string): number {
  if (paragraphKind(paragraph) != 1 || paragraph.length < 4) return 0
  const flags = paragraph.charCodeAt(3) - 48
  return flags >= 0 && flags <= 3 ? flags : 0
}

export function styledText(paragraph: string): string {
  return paragraphKind(paragraph) == 1 ? paragraph.slice(4) : paragraph
}

// A chapter whose content opens with its own styled heading (a size-1/2
// block within the first few paragraphs) renders that heading in place; the
// reader must then neither reserve nor draw the synthesized chapter-title
// block, or the heading appears twice.
export function chapterRendersOwnHeading(paragraphs: string[]): number {
  const limit = paragraphs.length < 4 ? paragraphs.length : 4
  for (let i = 0; i < limit; i++) {
    if (paragraphKind(paragraphs[i]) == 1 && styledSize(paragraphs[i]) >= 1) return 1
  }
  return 0
}

export function epubCoverBytes(path: string): Uint8Array {
  return epubArchive.coverBytes(path)
}

export function epubImageBytes(path: string, href: string): Uint8Array {
  return epubArchive.imageBytes(path, href)
}

// Extract the book's cover to an absolute SD path so the cover page can render
// it with <img src>. Returns false when the book has no cover (caller falls back
// to the text title card). Cached: an already-present file is left untouched.
export function epubCacheCover(path: string, outPath: string): boolean {
  return epubArchive.cacheCover(path, outPath)
}

// Generate (once) the library-grid thumbnail for a book's cover: contain-fit
// into maxW x maxH with aspect preserved and the driving dimension exact, so
// the tile <img fit="contain"> draws it 1:1. Returns false when no cover.
export function epubThumbnailCover(path: string, thumbPath: string, maxW: number, maxH: number): boolean {
  return epubArchive.thumbnailCover(path, thumbPath, maxW, maxH)
}

// The native parser emits a flat delimited stream instead of JSON so the book
// never round-trips through a boxed JSON value tree (which exhausted the 4 MB
// PSRAM heap on device):
//   header record:   title \x1d author
//   chapter records: id \x1d title \x1d para \x1f para \x1f ...
//   records joined by \x1e
const RECORD_SEPARATOR = '\x1e'
const FIELD_SEPARATOR = '\x1d'
const VALUE_SEPARATOR = '\x1f'

// Each helper carries an explicit string[] return so geatsc lowers the split
// results (and the callers' bindings) to native string vectors instead of
// boxed records.

// One chapter fetched from the card on demand: [title, joined paragraphs].
// The book itself stays on the card — nothing book-sized is ever resident in
// RAM (a resident novel exhausted the 4 MB PSRAM heap). The native side keeps
// the book's zip session cached, so each call costs one entry inflate.
export function epubChapterFields(path: string, spineIndex: number): string[] {
  const raw = epubArchive.chapter(path, spineIndex)
  if (raw.length == 0) return []
  return raw.split(FIELD_SEPARATOR)
}

export function splitParagraphs(joined: string): string[] {
  if (joined.length == 0) return []
  return joined.split(VALUE_SEPARATOR)
}

// Book metadata: [title, author, chapterCount] straight from the EPUB's
// package document — no index file needed. Falls back to the provided values
// (with a zero chapter count) when the archive is unreadable.
export function epubMeta(path: string, fallbackTitle: string, fallbackAuthor: string): string[] {
  const raw = epubArchive.meta(path, fallbackTitle, fallbackAuthor)
  if (raw.length == 0) return [fallbackTitle, fallbackAuthor, '0']
  const fields = raw.split(FIELD_SEPARATOR)
  if (fields.length < 3) return [fallbackTitle, fallbackAuthor, '0']
  return fields
}

// Whole-text file IO on the card for the pagination cache. Native strings
// carry the UTF-8 bytes directly — no TS-side byte walking.
export function readTextFile(path: string): string {
  return epubArchive.readTextFile(path)
}

export function writeTextFile(path: string, text: string): boolean {
  return epubArchive.writeTextFile(path, text)
}
