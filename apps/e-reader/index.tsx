import { Display, mount } from '@geastack/core'
import { App } from './components/App'
import { reader } from './stores/ReaderStore'

// NOT a render-rate knob — this paces the WHOLE app_frame loop, and touch
// polling (TouchRuntime::poll) rides that same tick. At 10fps (100ms between
// polls) a real finger's rapid taps either land within one sampled window and
// merge into a single press, or fall entirely between two polls and vanish;
// the drag-vs-tap threshold also gets less reliable (fewer, coarser move
// samples make ordinary tap jitter look like a 16px drag and swallow the
// click). Actual e-paper flushes stay cheap regardless of this rate — they're
// async on a separate task and only fire when the page-turn coalescing
// (ReaderStore.flushPageTurn) actually has something dirty to show.
Display.setFrameRate(60)
Display.setTextRasterCache(true)
// The reader always sets its text on white paper (the monochrome theme), so
// glyphs can be pre-blended against white once and stamped as packed bytes --
// no per-pixel framebuffer read/blend on the page-turn hot path. Inverted
// (white-on-black) labels fall back to the true blend automatically.
Display.setTextSolidBackdrop(0xffffff)
// grayscale enables the reading policy: calibrated four-level FAST page turns
// (including antialiased glyph edges) with periodic full cleanup.
// fastStreakWindowMs: refreshes arriving within 350ms of each other (a scroll
// fling) ride the panel's calibrated FAST waveform instead — HIGH partials
// stacking faster than their ~450ms waveform read as flicker — and the
// display re-renders the scrolled area in quality gray once the streak ends.
Display.setEpaperRefreshConfig({ fastStreakWindowMs: 350, grayscale: true })

reader.initialize()
mount(App)
// The scan inside initialize() ran before the frame loop existed, so its
// thumbnail pump kick was lost -- restart it now that frames are live.
requestAnimationFrame(() => reader.pumpThumbnails())
