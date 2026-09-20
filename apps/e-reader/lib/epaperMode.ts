import { Display } from '@geastack/core'

// Toggle e-paper refresh policy. On selects reading mode: calibrated four-level
// FAST partials plus periodic full cleanup. Off selects transient FAST without
// cadence cleanup while the Contents list is moving. A
// module function on purpose: `Display.setEpaperRefreshConfig({...})` resolves
// to the static host binding at module scope (as in index.tsx), but inside a
// class method it mis-lowers to a dynamic dispatch on a bare `Display` value.
export function setEpaperGrayscale(on: number): void {
  if (on == 1) Display.setEpaperRefreshConfig({ grayscale: true })
  else Display.setEpaperRefreshConfig({ grayscale: false })
}

// Reading refresh policy (same module-scope constraint as above). fast == 1:
// page turns stay PARTIAL (no flash) and ghosting clears via an
// automatic full every 10 partials. fast == 0 (quality): every full-coverage
// update — i.e. every page turn — is promoted to a flashing GC16 full.
export function applyEpaperReadingMode(fast: number): void {
  if (fast == 1) Display.setEpaperRefreshConfig({ grayscale: true, fullOnCover: false, fullRefreshEveryPartials: 10, fastStreakWindowMs: 350 })
  // fullRefreshEveryPartials: periodic GC16 hygiene — without it, ghosting
  // (e.g. 1-bit scroll residue) accumulates forever in quality mode.
  else Display.setEpaperRefreshConfig({ grayscale: true, fullOnCover: true, fullRefreshEveryPartials: 10, fastStreakWindowMs: 350 })
}
