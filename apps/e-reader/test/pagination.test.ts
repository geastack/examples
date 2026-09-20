import { describe, expect, it } from 'vitest'
import { paginateChapters, readerLineBudget, textForPage } from '../lib/pagination'

describe('reader pagination', () => {
  it('fills the full body viewport on a chapter continuation page', () => {
    const paragraph = new Array(2001).join('word ')
    const pages = paginateChapters([
      { id: 'chapter-1', title: 'Chapter One', paragraphs: [paragraph] }
    ], 1, 0, 0, 0)

    // Page 0 reserves the chapter-title block, so the full-viewport check
    // targets a continuation page (no title) instead.
    expect(pages[1].firstInChapter).toBe(0)
    expect(textForPage(pages, 1).length).toBeGreaterThan(1200)
    expect(pages.length).toBeLessThanOrEqual(16)
  })

  it('starts every chapter on its own page', () => {
    const pages = paginateChapters([
      { id: 'a', title: 'First', paragraphs: ['A short opening section.'] },
      { id: 'b', title: 'Second', paragraphs: ['The next section is a new chapter and gets its own page.'] }
    ], 0, 1, 1, 0)

    expect(pages).toHaveLength(2)
    expect(pages[0].firstInChapter).toBe(1)
    expect(pages[1].firstInChapter).toBe(1)
    expect(pages[0].chapterStarts).toEqual([0])
    expect(pages[1].chapterStarts).toEqual([1])
    expect(textForPage(pages, 0)).toContain('short opening')
    expect(textForPage(pages, 1)).toContain('The next section')
  })

  it('splits a paragraph to use the space left by the preceding paragraph', () => {
    const first = new Array(181).join('first ')
    const second = new Array(121).join('second ')
    const pages = paginateChapters([
      { id: 'chapter', title: 'Chapter', paragraphs: [first, second] }
    ], 1, 0, 0, 0)

    // The two paragraphs belong to one chapter, so the second continues on the
    // same page where the first ends — some page holds the boundary between
    // them (independent of the title block on page 0).
    let boundaryPage = -1
    for (let i = 0; i < pages.length; i++) {
      const text = textForPage(pages, i)
      if (text.indexOf('first') >= 0 && text.indexOf('second') >= 0) boundaryPage = i
    }
    expect(boundaryPage).toBeGreaterThanOrEqual(0)
  })

  it('uses fixed line budgets that reserve the bottom page-number gutter', () => {
    expect(readerLineBudget(0, 0, 0)).toBe(29)
    expect(readerLineBudget(1, 0, 0)).toBe(24)
    expect(readerLineBudget(2, 0, 0)).toBe(21)
    expect(readerLineBudget(0, 1, 0)).toBe(25)
    expect(readerLineBudget(2, 1, 1)).toBe(18)
  })

  it('keeps page boundaries on words after multibyte punctuation', () => {
    const sentence = 'She’d heard about the ancient boughs and wouldn’t forget them. '
    const pages = paginateChapters([
      { id: 'unicode', title: 'Unicode', paragraphs: [new Array(201).join(sentence)] }
    ], 2, 2, 0, 1)

    for (let i = 0; i < pages.length - 1; i++) {
      const text = textForPage(pages, i)
      expect(text.slice(text.length - 1)).toMatch(/[A-Za-z.!?]/)
      expect(text).not.toMatch(/\b(?:bou|woul|forg)$/)
    }
  })
})
