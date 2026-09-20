import { beforeAll, describe, expect, it, vi } from 'vitest'

let epub: typeof import('../lib/epub')

beforeAll(async () => {
  vi.stubGlobal('epubArchive', {
    meta() {
      return 'Fixture Book\x1dFixture Author\x1d2'
    },
    chapter(_path: string, spineIndex: number) {
      return spineIndex == 0
        ? 'First Chapter\x1dA readable paragraph.\x1fA second paragraph.'
        : 'Second Chapter\x1dThe next chapter.'
    }
  })
  epub = await import('../lib/epub')
})

describe('native EPUB bridge', () => {
  it('decodes book metadata with the chapter count', () => {
    const meta = epub.epubMeta('/sdcard/books/fixture.epub', 'Fallback', 'Unknown')
    expect(meta[0]).toBe('Fixture Book')
    expect(meta[1]).toBe('Fixture Author')
    expect(meta[2]).toBe('2')
  })

  it('streams chapters by index with their titles', () => {
    const first = epub.epubChapterFields('/sdcard/books/fixture.epub', 0)
    expect(first[0]).toBe('First Chapter')
    expect(epub.splitParagraphs(first[1])).toEqual(['A readable paragraph.', 'A second paragraph.'])
    const second = epub.epubChapterFields('/sdcard/books/fixture.epub', 1)
    expect(second[0]).toBe('Second Chapter')
    expect(epub.splitParagraphs(second[1])).toEqual(['The next chapter.'])
  })
})
