import { listCacheFiles } from '@geastack/core'
import type { ReaderBook } from '../models'
import { epubMeta } from './epub'
import { slug } from './text'

export const SD_BOOKS_DIR = '/sdcard/books'

function isEpubName(name: string): boolean {
  const lower = name.toLowerCase()
  return lower.length > 5 && lower.lastIndexOf('.epub') == lower.length - 5
}

function titleFromFileName(name: string): string {
  return name.substring(0, name.length - 5)
}

// The device library is whatever .epub files are on the card — no index file
// required. Scans /sdcard/books first, then the card root, so books work
// wherever they were dropped. Title/author come from each EPUB's own package
// document (a small ranged read per book, not a full parse).
export function scanSdBooks(): ReaderBook[] {
  const books: ReaderBook[] = []
  const seen = new Set<string>()
  const dirs = [SD_BOOKS_DIR, '/sdcard']
  for (let d = 0; d < dirs.length; d++) {
    const names = listCacheFiles(dirs[d])
    for (let i = 0; i < names.length; i++) {
      const name = names[i]
      if (!isEpubName(name)) continue
      if (seen.has(name)) continue
      seen.add(name)
      const path = dirs[d] + '/' + name
      const fallbackTitle = titleFromFileName(name)
      const meta = epubMeta(path, fallbackTitle, 'Unknown author')
      const title = meta[0].length > 0 ? meta[0] : fallbackTitle
      books.push({
        id: slug(title.length > 0 ? title : name),
        title,
        author: meta[1].length > 0 ? meta[1] : 'Unknown author',
        path,
        format: 'EPUB',
        source: 'SD CARD',
        coverTone: books.length % 5,
        coverThumb: '',
        progress: 0,
        lastReadAt: 0,
        lastPage: 0,
        bookmarks: [],
        chapters: []
      })
    }
  }
  return books
}
