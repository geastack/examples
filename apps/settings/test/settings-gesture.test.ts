import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const shared = resolve(__dirname, '..', '..', '..', 'shared', 'Settings')

function source(path: string): string {
  return readFileSync(resolve(shared, path), 'utf8')
}

// The settings swipe is handled once, here in TypeScript. The C++ runtime used
// to detect it too, so a top-edge swipe could open the control centre twice or
// fight this handler for the same touch; geastack/core guards that the runtime
// half stays gone.
//
// This is the other half, and it needs a test precisely because it has no
// static caller: the host dispatches straight into these handlers, so deleting
// one leaves the gesture silently dead and the typecheck green.
describe('settings swipe gesture', () => {
  const store = source('store.tsx')

  it.each(['handleSwipeStart', 'handleSwipeMove', 'handleSwipeEnd'])(
    'keeps the host-dispatched %s handler',
    (handler) => {
      expect(store).toMatch(new RegExp(`\\b${handler}\\s*\\(`))
    }
  )

  it('gates the gesture on a screen edge rather than any touch', () => {
    expect(store).toContain('SETTINGS_SWIPE_EDGE_PX')
  })

  it('does not call the retired single-shot entry point', () => {
    // Settings.handleSwipe(...) was the one-call API the C++ detector fed. It is
    // replaced by the three-phase handlers above; a call to it would mean some
    // component is driving the gesture on its own again.
    for (const file of ['store.tsx', 'SettingsPanel.tsx', 'index.tsx']) {
      expect(source(file)).not.toMatch(/Settings\.handleSwipe\s*\(/)
    }
  })
})
