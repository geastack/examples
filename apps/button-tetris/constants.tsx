export const APP_WIDTH = window.innerWidth
export const APP_HEIGHT = window.innerHeight

export const BOARD_COLS = 10
export const BOARD_ROWS = 18
export const PLAYFIELD_BORDER_WIDTH = 2

// Snap the grid to whole physical pixels. Positions used to be computed from a
// fractional cell size (APP_WIDTH * 0.052) and rounded independently per block,
// so the grid step alternated ±1px while the block size was fixed — that's what
// made the spacing look uneven. With an integer CELL every cell is identical and
// every inter-block gap is exactly BLOCK_GAP, at any window size.
// Cell size is bounded by BOTH axes so the full 10×18 board — plus the title
// above (top:6vh) and the score below — fits any viewport, not just tall
// portrait ones. Width keeps the original feel on tall screens; height caps it
// on square/short panels (the 480×480 geaos board, where a width-only cell
// makes the 18-row board overflow the bottom edge). Board top sits at 14% of
// height, so ~86% remains below it; reserve 2 rows under the board for the
// score label + margin. min() keeps cells square and snapped to whole pixels.
const CELL_FROM_WIDTH = Math.max(1, Math.round(APP_WIDTH * 0.052))
const CELL_FROM_HEIGHT = Math.max(1, Math.floor((APP_HEIGHT * 0.86) / (BOARD_ROWS + 2)))
export const CELL_WIDTH = Math.min(CELL_FROM_WIDTH, CELL_FROM_HEIGHT)
export const CELL_HEIGHT = CELL_WIDTH
export const BLOCK_GAP = Math.max(1, Math.round(CELL_WIDTH * 0.1))
export const BLOCK_SIZE = CELL_WIDTH - BLOCK_GAP

// Board origin + extent, all integer so the border aligns with the block grid.
export const BOARD_WIDTH = BOARD_COLS * CELL_WIDTH
export const BOARD_HEIGHT = BOARD_ROWS * CELL_HEIGHT
export const BOARD_Y = Math.round(APP_HEIGHT * 0.14)
// Center the board horizontally so the gutters on either side become equal
// columns for the control buttons (the 3-column layout: buttons | board |
// buttons). The block positions all derive from BOARD_X, so they follow.
export const BOARD_X = Math.round((APP_WIDTH - BOARD_WIDTH) / 2)

// Control columns live in the gutters flanking the centered board. Both gutters
// are BOARD_X wide; the buttons are slightly narrower and centered in each.
export const SIDE_GUTTER = BOARD_X
export const BUTTON_WIDTH = Math.max(1, Math.round(SIDE_GUTTER * 0.84))
export const LEFT_COL_LEFT = Math.round((SIDE_GUTTER - BUTTON_WIDTH) / 2)
export const RIGHT_COL_LEFT = BOARD_X + BOARD_WIDTH + Math.round((SIDE_GUTTER - BUTTON_WIDTH) / 2)

// The Drop button spans the board's full width just below its bottom edge —
// where the score label used to sit (the score now lives next to the title).
export const DROP_GAP = Math.max(2, Math.round(CELL_HEIGHT * 0.3))
export const DROP_TOP = BOARD_Y + BOARD_HEIGHT + DROP_GAP
export const DROP_HEIGHT = Math.max(CELL_HEIGHT, APP_HEIGHT - DROP_TOP - DROP_GAP)

export const STACK_MAX = 180
