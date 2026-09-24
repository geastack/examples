import { ITEM_COUNT } from '../constants'
import { scrollProbe } from '../stores/VirtualScrollStore'

// The recycled row pool lives in its own child component so the App stays on
// the optimized mount path (its HUD/scale reactive text keeps firing). The
// native <virtual-list> windows over itemCount * rowHeight and shifts these
// content-positioned slots by its scroll offset; the store recomputes each
// slot's top/content as scrollTop changes. The row height is NOT hard-coded
// here — each slot auto-sizes to its content (floored at 18vh by .probe-row-
// content), and the store reads the element's measured `rowHeight` to position
// the slots, so the JS and CSS share one source of truth.
export function VirtualListView() {
  return (
    <virtual-list
      id="native-virtual-list"
      class="probe-list"
      item-count={ITEM_COUNT}
      onTouchStart={() => scrollProbe.track()}
      onTouchMove={() => scrollProbe.track()}
      onTouchEnd={() => scrollProbe.track()}
      onScroll={() => scrollProbe.track()}
    >
      {scrollProbe.slots.map(slot => (
        <div
          class="probe-row"
          style={{ position: 'absolute', left: 0, top: slot.top, width: '100vw', display: slot.display }}
        >
          <div class={slot.contentClass}>
            <span class="probe-row-index">{slot.label}</span>
            <span class="probe-row-pixels">{slot.pixels}</span>
          </div>
        </div>
      ))}
    </virtual-list>
  )
}
