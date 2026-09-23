import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = fileURLToPath(new URL('..', import.meta.url))
const booksRoot = join(appRoot, 'books')
if (!existsSync(booksRoot)) {
  console.log('No local books directory; native EPUB fixture test skipped.')
  process.exit(0)
}

const fixtures = readdirSync(booksRoot).filter(filename => filename.toLowerCase().endsWith('.epub')).sort()
if (!fixtures.length) {
  console.log('No local EPUB fixtures; native parser test skipped.')
  process.exit(0)
}

const coreRoot = dirname(createRequire(import.meta.url).resolve('@geastack/core/package.json'))
const output = join(appRoot, 'dist')
mkdirSync(output, { recursive: true })
const binary = join(output, 'epub-parser-test')
try {
  execFileSync('c++', [
    '-std=c++20',
    '-O2',
    '-I', join(coreRoot, 'include'),
    // The parser executable does not use the thumbnail renderer in this source
    // file. Drop unused functions while keeping their engine types checked.
    '-ffunction-sections',
    '-fdata-sections',
    process.platform === 'darwin' ? '-Wl,-dead_strip' : '-Wl,--gc-sections',
    '-DEPUB_ARCHIVE_TEST_MAIN=1',
    join(appRoot, 'native', 'epub_archive.cpp'),
    '-o', binary
  ], { stdio: 'inherit' })

  for (const filename of fixtures) {
    const raw = execFileSync(binary, [join(booksRoot, filename)], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    // Flat record stream: `title \x1d author` then per chapter
    // `id \x1d title \x1d para \x1f para ...`, records joined by \x1e.
    const records = raw.split('\x1e')
    const header = records[0].split('\x1d')
    const chapters = records.slice(1).map(record => record.split('\x1d'))
    if (!header[0] || !header[1] || chapters.length < 1)
      throw new Error(`${filename}: native parser returned an incomplete book`)
    if (!chapters.some(chapter => (chapter[2] || '').split('\x1f').length > 2))
      throw new Error(`${filename}: native parser returned no substantial chapter`)
    console.log(`✓ ${filename}: ${chapters.length} chapters`)
  }
} finally {
  rmSync(binary, { force: true })
}
