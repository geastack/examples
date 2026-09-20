import { Store, type VirtualListElement } from '@geastack/core'
import { ITEM_COUNT, ITEM_HEIGHT, LIST_H } from '../constants'

const SLOT_COUNT = 16
const SLOT_OVERSCAN = 3

interface SlotView {
  top: number
  label: string
  pixels: string
  display: 'flex' | 'none'
  contentClass: string
}

export class VirtualScrollStore extends Store {
  scrollTop = 0
  // Recycled row pool. The native <virtual-list> windows over a virtual height
  // of ITEM_COUNT * ITEM_HEIGHT; we keep a fixed pool of SLOT_COUNT real rows and
  // recompute each one's content-space top + content here (plain fields the
  // template fast-path can bind directly) as the element's scrollTop changes.
  slots: SlotView[] = [{ top: 0, label: '#1', pixels: '0 px', display: 'flex', contentClass: 'probe-row-content probe-row-even' }]
  velocityPxPerSecond = 0
  speedText = '0 px/s'
  scrollText = '0 px'
  windowText = '1-4 / 5000'
  directionText = 'idle'
  progressText = '0%'
  // Plain string (set in refreshLabels) so the compiler types it as a string
  // field with a reader and the template fast-path can bind it — a template
  // literal initializer here would type it as gea_cpp_value and break lowering.
  scaleText = ''

  private lastFrameMs = 0
  private lastHudUpdateMs = 0
  private nativeList: VirtualListElement | null = null
  private tracking = false
  // Single source of truth for the row height: the <virtual-list> measures its
  // first slot's rendered CSS layout height and exposes it as `.rowHeight`. We
  // read that and window the recycled slots from it, instead of recomputing an
  // item height in JS — that duplicate (round(DISPLAY_H * 0.18)) diverged from
  // the CSS on dense/short panels (e.g. ESP32) and clipped the row content.
  // ITEM_HEIGHT is only a bootstrap fallback until the first slot is laid out.
  private rowHeight = ITEM_HEIGHT

  init() {
    this.scrollTop = 0
    this.velocityPxPerSecond = 0
    this.lastFrameMs = 0
    this.lastHudUpdateMs = 0
    this.nativeList = null
    this.tracking = false
    this.refreshLabels()
    // Position the recycled slots after mount completes. Deferred via rAF so the
    // write to `slots` happens outside the tracked mount pass (a synchronous
    // updateSlots() here re-enters the keyed-list mount and overflows the stack).
    requestAnimationFrame(() => this.updateSlots())
  }

  track() {
    if (this.tracking) return
    this.tracking = true
    requestAnimationFrame((timestampMs) => this.trackFrame(timestampMs))
  }

  private trackFrame(timestampMs: number) {
    if (!this.tracking) return
    if (this.tick(timestampMs)) {
      requestAnimationFrame((nextTimestampMs) => this.trackFrame(nextTimestampMs))
    } else {
      this.tracking = false
    }
  }

  tick(timestampMs: number): boolean {
    if (this.lastFrameMs === 0) {
      this.lastFrameMs = timestampMs
      this.readNativeScroll()
      this.refreshLabels()
      this.lastHudUpdateMs = timestampMs
      return true
    }

    let dt = timestampMs - this.lastFrameMs
    if (dt < 0) dt = 0
    if (dt > 100) dt = 100
    this.lastFrameMs = timestampMs

    const previousScrollTop = this.scrollTop
    const wasMoving = this.velocityPxPerSecond !== 0
    this.readNativeScroll()

    let measuredVelocity = 0
    if (dt > 0) {
      measuredVelocity = ((this.scrollTop - previousScrollTop) * 1000) / dt
    }

    if (measuredVelocity > 0 || measuredVelocity < 0) {
      this.velocityPxPerSecond = this.velocityPxPerSecond * 0.72 + measuredVelocity * 0.28
    } else {
      this.velocityPxPerSecond = this.velocityPxPerSecond * 0.92
    }
    if (this.velocityPxPerSecond < 8 && this.velocityPxPerSecond > -8) {
      this.velocityPxPerSecond = 0
    }

    const isMoving = this.velocityPxPerSecond !== 0
    const scrollChanged = this.scrollTop !== previousScrollTop
    const hudUpdateDue = timestampMs - this.lastHudUpdateMs >= 100
    // Throttle the HUD label refresh to ~10 Hz while moving (hudUpdateDue) plus
    // a final update on settle. The speed/scrolled readouts change digit count
    // every frame, and re-laying-out that variable-width text fails
    // layoutUnchanged() — refreshing it per-frame would force a full layout each
    // frame and drop the scroll to ~20 fps. The rows themselves still reposition
    // every poll via updateSlots() through the cheap scroll-only path.
    if (wasMoving !== isMoving || hudUpdateDue || (scrollChanged && !isMoving)) {
      this.refreshLabels()
      this.lastHudUpdateMs = timestampMs
    }
    return isMoving || scrollChanged
  }

  private readNativeScroll() {
    if (!this.nativeList) {
      this.nativeList = document.getElementById('native-virtual-list') as VirtualListElement | null
    }
    if (!this.nativeList) return

    // Take the row height the element actually rendered (its first slot's CSS
    // layout height). Falls back to ITEM_HEIGHT only until the first layout.
    const measured = this.nativeList.rowHeight
    if (measured > 0) this.rowHeight = measured
    let maxScroll = ITEM_COUNT * this.rowHeight - LIST_H
    if (maxScroll < 0) maxScroll = 0

    let next = this.nativeList.scrollTop
    if (next < 0) next = 0
    if (next > maxScroll) next = maxScroll
    this.scrollTop = next
    this.updateSlots()
  }

  private updateSlots() {
    const rowH = this.rowHeight
    let start = Math.floor(this.scrollTop / rowH) - SLOT_OVERSCAN
    if (start < 0) start = 0
    // Fill the pool to its full size BEFORE indexing into it. Reading
    // `this.slots[k]` past the end as an existence test is a hole read: the
    // array is seeded with one element, so `k = 1` reads index 1 of a length-1
    // array. In JS that is `undefined`; there is no carrier for absence here,
    // so it is refused rather than silently answered.
    while (this.slots.length < SLOT_COUNT) {
      this.slots.push({ top: 0, label: '', pixels: '', display: 'none', contentClass: 'probe-row-content probe-row-even' })
    }
    for (let k = 0; k < SLOT_COUNT; k++) {
      const idx = start + ((((k - start) % SLOT_COUNT) + SLOT_COUNT) % SLOT_COUNT)
      const slot = this.slots[k]
      const top = idx * rowH
      const label = `#${idx + 1}`
      const pixels = `${top} px`
      const display = idx < ITEM_COUNT ? 'flex' : 'none'
      const contentClass = idx % 2 === 0 ? 'probe-row-content probe-row-even' : 'probe-row-content probe-row-odd'
      if (slot.top !== top) slot.top = top
      if (slot.label !== label) slot.label = label
      if (slot.pixels !== pixels) slot.pixels = pixels
      if (slot.display !== display) slot.display = display
      if (slot.contentClass !== contentClass) slot.contentClass = contentClass
    }
  }

  private refreshLabels() {
    const signedVelocity = Math.floor(this.velocityPxPerSecond)
    const rowH = this.rowHeight
    let maxScroll = ITEM_COUNT * rowH - LIST_H
    if (maxScroll < 1) maxScroll = 1
    // ceil(LIST_H / rowH) without Math.ceil (integer ceiling via floor).
    let visibleRows = Math.floor((LIST_H + rowH - 1) / rowH)
    if (visibleRows < 1) visibleRows = 1
    const firstItem = Math.floor(this.scrollTop / rowH) + 1
    let lastItem = firstItem + visibleRows - 1
    if (lastItem > ITEM_COUNT) lastItem = ITEM_COUNT
    const progress = Math.floor((this.scrollTop * 100) / maxScroll)
    const scrolled = Math.floor(this.scrollTop)
    const totalItems = '5000'

    const speedText = `${signedVelocity} px/s`
    const scrollText = `${scrolled} px`
    const windowText = `${firstItem}-${lastItem} / ${totalItems}`
    const progressText = `${progress}%`
    let directionText = 'idle'
    if (signedVelocity > 0) directionText = 'down'
    else if (signedVelocity < 0) directionText = 'up'

    const scaleText = `${ITEM_COUNT} rows x ${rowH} px = ${ITEM_COUNT * rowH} px`

    if (this.speedText !== speedText) this.speedText = speedText
    if (this.scrollText !== scrollText) this.scrollText = scrollText
    if (this.windowText !== windowText) this.windowText = windowText
    if (this.progressText !== progressText) this.progressText = progressText
    if (this.directionText !== directionText) this.directionText = directionText
    if (this.scaleText !== scaleText) this.scaleText = scaleText
  }
}

export const scrollProbe = new VirtualScrollStore()
