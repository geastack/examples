export const DISPLAY_W = Math.max(1, Math.floor(window.innerWidth))
export const DISPLAY_H = Math.max(1, Math.floor(window.innerHeight))
const CONTROL_PANEL_H = 112
const PORTRAIT_STAGE_RATIO = 4 / 3

export const TALL_CONTROLS_LAYOUT = DISPLAY_H >= Math.floor(DISPLAY_W * 1.45) && DISPLAY_H > DISPLAY_W + CONTROL_PANEL_H
export const GAME_VIEW_H = TALL_CONTROLS_LAYOUT
  ? Math.max(1, Math.min(DISPLAY_H - CONTROL_PANEL_H, Math.floor(DISPLAY_W * PORTRAIT_STAGE_RATIO)))
  : DISPLAY_H
export const CONTROLS_PANEL_TOP = TALL_CONTROLS_LAYOUT ? GAME_VIEW_H : 0

export const TILE = 36
export const PLAYER_W = 29
export const PLAYER_H = 34
export const ENEMY_W = 28
export const ENEMY_H = 22

export const HUD_H = 36
export const HORIZON_Y = 182
export const WATER_H = Math.max(0, GAME_VIEW_H - HORIZON_Y)
export const HILL_BG_W = DISPLAY_W
export const HILL_BG_H = 202
export const FLAG_W = 62
export const FLAG_H = 94
export const PLAYER_SPRITE = 38
export const DRONE_SPRITE = 32

export const GRAVITY = 0.00142
export const MOVE_ACCEL = 0.0019
export const GROUND_FRICTION = 0.92
export const AIR_FRICTION = 1.0
export const MAX_SPEED = 0.552
export const MAX_FALL = 0.72
export const JUMP_VELOCITY = -0.70
export const JUMP_SIDE_BOOST = 0.384
export const STOMP_BOUNCE = -0.4968
export const COYOTE_MS = 120
export const JUMP_BUFFER_MS = 160
export const HURT_COOLDOWN_MS = 900

export const COIN_RADIUS = 8
export const COIN_SIZE = 16
export const COIN_PULSE_FRAMES = 28

export const TILES_CAP = 256
export const COINS_CAP = 16
export const ENEMIES_CAP = 8

export const TILE_KIND_DIRT = 0
export const TILE_KIND_GRASS = 1
export const TILE_KIND_CRATE = 2

export const COLOR_SKY = '#2F96D1'
export const COLOR_HILL_NEAR = '#41AB6C'
export const COLOR_HILL_FAR = '#62CA80'
export const COLOR_WATER = '#2A99D2'
export const COLOR_GRASS = '#62CA80'
export const COLOR_GRASS_TOP = '#9DE070'
export const COLOR_DIRT = '#8B5A2B'
export const COLOR_DIRT_DARK = '#6B4220'
export const COLOR_CRATE = '#C28F3C'
export const COLOR_CRATE_BAND = '#7A5A20'
export const COLOR_COIN = '#F8C44D'
export const COLOR_COIN_RIM = '#855C1F'
export const COLOR_PLAYER = '#F4A261'
export const COLOR_PLAYER_DARK = '#A8551F'
export const COLOR_PLAYER_FACE = '#FFE0BD'
export const COLOR_ENEMY = '#7F4FBF'
export const COLOR_ENEMY_DARK = '#3F1F6F'
export const COLOR_FLAG_POLE = '#F5F5F5'
export const COLOR_FLAG = '#F8C44D'
export const COLOR_FLAG_SHADOW = '#855C1F'
export const COLOR_HUD_BG = '#162639'
export const COLOR_HUD_TEXT = '#FFFFFF'
export const COLOR_HUD_GOLD = '#F8C44D'
export const COLOR_BUTTON = '#162639'
export const COLOR_BUTTON_ACTIVE = '#F8C44D'
export const COLOR_BUTTON_BORDER = '#E2F7FF'
export const COLOR_BUTTON_TEXT = '#FFFFFF'
export const COLOR_BUTTON_TEXT_ACTIVE = '#162639'
export const COLOR_OVERLAY_BG = '#162639'
export const COLOR_OVERLAY_BORDER = '#F8C44D'
