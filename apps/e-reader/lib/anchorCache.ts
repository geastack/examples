import { readTextFile, writeTextFile } from './epub'
import type { PageAnchor } from './pagination'
import { slug } from './text'

// Persisted pagination for instant re-opens: the anchor pass over a full novel
// costs ~10s of word-walking on device, but its output is tiny (one
// (chapter,paragraph,word) triple per page plus the TOC titles). Cache it on
// the card, keyed by book path + font settings + chapter count.
//
// Flat delimited format (record separator \x1e):
//   FOLIOANCHORS1 \x1e fontKey \x1e chapterCount \x1e titles(\x1f) \x1e
//   chapterStartPages(,) \x1e anchors(; of c,p,w,f)
// v3: styled/image marker paragraphs changed the paginator's line accounting,
// so anchors cached by earlier builds describe different page boundaries.
const CACHE_HEADER = 'FOLIOANCHORS3'
const RECORD_SEPARATOR = '\x1e'
const TITLE_SEPARATOR = '\x1f'

// A class, NOT an interface returned as `CachedAnchors | null`: the nullable
// record-union return forced geatsc to BOX the whole result (every one of a
// novel's ~2000 anchors deep-converted to a gea_cpp_value record in one
// allocation storm), which exhausted the device's 4 MB PSRAM heap inside
// loadAnchorCache and crashed every cache-hit book open. A class lowers to a
// native shared_ptr<struct> whose vectors stay native; callers check `ok`.
export class CachedAnchors {
  ok = 0
  titles: string[] = []
  chapterStartPages: number[] = []
  anchors: PageAnchor[] = []
}

export function anchorCachePath(bookPath: string, fontKey: string): string {
  return '/sdcard/.folio/' + slug(bookPath) + '-' + fontKey + '-v3.anchors'
}

export function anchorFontKey(fontIndex: number, fontSizeIndex: number, spacingIndex: number, marginIndex: number): string {
  return fontIndex + '-' + fontSizeIndex + '-' + spacingIndex + '-' + marginIndex
}

export function saveAnchorCache(
  bookPath: string,
  fontKey: string,
  chapterCount: number,
  titles: string[],
  chapterStartPages: number[],
  anchors: PageAnchor[]
): boolean {
  let text = CACHE_HEADER + RECORD_SEPARATOR + fontKey + RECORD_SEPARATOR + chapterCount + RECORD_SEPARATOR
  for (let i = 0; i < titles.length; i++) {
    if (i > 0) text += TITLE_SEPARATOR
    text += titles[i]
  }
  text += RECORD_SEPARATOR
  for (let i = 0; i < chapterStartPages.length; i++) {
    if (i > 0) text += ','
    text += chapterStartPages[i]
  }
  text += RECORD_SEPARATOR
  for (let i = 0; i < anchors.length; i++) {
    if (i > 0) text += ';'
    text += anchors[i].chapterIndex + ',' + anchors[i].paragraphIndex + ',' + anchors[i].wordIndex + ',' + anchors[i].firstInChapter
  }
  return writeTextFile(anchorCachePath(bookPath, fontKey), text)
}

export function loadAnchorCache(bookPath: string, fontKey: string, chapterCount: number): CachedAnchors {
  const out = new CachedAnchors()
  const raw = readTextFile(anchorCachePath(bookPath, fontKey))
  if (raw.length == 0) return out
  const records = raw.split(RECORD_SEPARATOR)
  if (records.length < 6) return out
  if (records[0] != CACHE_HEADER) return out
  if (records[1] != fontKey) return out
  if (Math.floor(Number(records[2])) != chapterCount) return out

  const titles = records[3].split(TITLE_SEPARATOR)
  if (titles.length != chapterCount) return out

  const startFields = records[4].split(',')
  if (startFields.length != chapterCount) return out
  for (let i = 0; i < startFields.length; i++) {
    const page = Number(startFields[i])
    if (!(page >= 0)) return out
    out.chapterStartPages.push(Math.floor(page))
  }

  const anchorRecords = records[5].split(';')
  if (anchorRecords.length == 0) return out
  for (let i = 0; i < anchorRecords.length; i++) {
    const fields = anchorRecords[i].split(',')
    if (fields.length != 4) return out
    const chapterIndex = Number(fields[0])
    const paragraphIndex = Number(fields[1])
    const wordIndex = Number(fields[2])
    const firstInChapter = Number(fields[3])
    if (!(chapterIndex >= 0 && paragraphIndex >= 0 && wordIndex >= 0 && firstInChapter >= 0)) return out
    out.anchors.push({
      chapterIndex: Math.floor(chapterIndex),
      paragraphIndex: Math.floor(paragraphIndex),
      wordIndex: Math.floor(wordIndex),
      firstInChapter: Math.floor(firstInChapter)
    })
  }
  out.titles = titles
  out.ok = 1
  return out
}
