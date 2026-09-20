import { rail } from '../stores/RailStore'

// Keyed-list child whose generated renderer BINDS THROUGH ITS STORE PARAM
// (`bindReactiveApply(store, …)`, `read_RailStore_field_active(store)`) — the
// weather CityRail shape. A typed parent used to be unable to mount it; now it
// threads the one global store the subtree reads:
// `mount_Rail(__gea_global_rail(), disposer)`.
export function Rail() {
  return (
    <div class="rail">
      {rail.items.map(item => (
        <button class={{ 'rail-chip': true, 'is-active': rail.active == item.id }} onClick={() => rail.setActive(item.id)}>
          <span class="rail-chip-label">{item.label}</span>
        </button>
      ))}
    </div>
  )
}
