import { Display } from '@geastack/core'

export const DISPLAY_W = Math.max(1, Math.floor(window.innerWidth))
export const DISPLAY_H = Math.max(1, Math.floor(window.innerHeight))
export const CSS_PX = Math.max(1, Display.getDevicePixelRatio())

// Header chrome holds DPR-scaled text, so its height tracks the device pixel
// ratio (matches the .probe-hud / .probe-scale CSS heights below).
export const HUD_H = Math.round(96 * CSS_PX)
export const SCALE_H = Math.round(22 * CSS_PX)
export const LIST_H = DISPLAY_H - HUD_H - SCALE_H

export const ITEM_COUNT = 5000

// Bootstrap fallback only. The real row height is the <virtual-list>'s measured
// `rowHeight` (the first slot's rendered CSS layout height, floored at 18vh by
// .probe-row-content) — the store reads that and windows its slots from it, so
// the JS row height and the CSS are one source of truth. This value is used
// only for the first frame, before the first slot has been laid out.
export const ITEM_HEIGHT = Math.max(48, Math.round(DISPLAY_H * 0.18))