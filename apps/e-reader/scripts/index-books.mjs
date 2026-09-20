import { execFileSync } from 'node:child_process'
import { readdirSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = fileURLToPath(new URL('..', import.meta.url))
const booksRoot = join(appRoot, 'books')

function decodeEntities(value) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function tagText(xml, name) {
  const pattern = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i')
  const match = xml.match(pattern)
  return match ? decodeEntities(match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()) : ''
}

function fallbackTitle(filename) {
  return basename(filename, '.epub').replace(/^\d+\s+/, '').replace(/\s+-\s+[^-]+$/, '').trim()
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'book'
}

function metadata(epubPath, filename) {
  const entries = execFileSync('unzip', ['-Z1', epubPath], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 })
    .split('\n')
    .filter(Boolean)
  const opf = entries.find(entry => entry.toLowerCase().endsWith('.opf'))
  if (!opf) return { title: fallbackTitle(filename), author: 'Unknown author' }
  const packageXml = execFileSync('unzip', ['-p', epubPath, opf], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
  return {
    title: tagText(packageXml, 'dc:title') || tagText(packageXml, 'title') || fallbackTitle(filename),
    author: tagText(packageXml, 'dc:creator') || tagText(packageXml, 'creator') || 'Unknown author'
  }
}

const filenames = readdirSync(booksRoot)
  .filter(filename => filename.toLowerCase().endsWith('.epub'))
  .sort((a, b) => a.localeCompare(b))

const ids = new Map()
const books = filenames.map((filename, index) => {
  const info = metadata(join(booksRoot, filename), filename)
  const baseId = slug(info.title)
  const occurrence = ids.get(baseId) || 0
  ids.set(baseId, occurrence + 1)
  return {
    id: occurrence ? `${baseId}-${occurrence + 1}` : baseId,
    title: info.title,
    author: info.author,
    path: `/sdcard/books/${filename}`,
    coverTone: index % 5,
    progress: 0,
    lastReadAt: 0
  }
})

writeFileSync(join(booksRoot, 'library.json'), `${JSON.stringify({ version: 1, books }, null, 2)}\n`)
console.log(`Indexed ${books.length} EPUB${books.length === 1 ? '' : 's'} in ${booksRoot}`)
