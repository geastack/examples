import { epubChapterFields, splitParagraphs } from './epub'

// One chapter's split paragraphs held in RAM (~50-200 KB): consecutive page
// turns land in the same chapter almost always, so this turns the per-turn
// SD fetch + split into a plain vector reuse. Module-level state (not a store
// field) so reactive tracking never copies the vector.
let cachedPath = ''
let cachedIndex = -1
let cachedParagraphs: string[] = []

export function chapterParagraphsCached(path: string, chapterIndex: number): string[] {
  if (cachedPath == path && cachedIndex == chapterIndex) return cachedParagraphs
  const fields = epubChapterFields(path, chapterIndex)
  cachedParagraphs = fields.length >= 2 ? splitParagraphs(fields[1]) : []
  cachedPath = path
  cachedIndex = chapterIndex
  return cachedParagraphs
}

export function clearChapterCache() {
  cachedPath = ''
  cachedIndex = -1
  cachedParagraphs = []
}
