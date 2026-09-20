# Sky Hop

Sky Hop is an original platformer example using a Gea TSX `<canvas>` app.

Controls:

- Simulator: keyboard arrows/WASD, Space/W to jump, R/Enter to restart. Pointer/touch also works through the on-screen left/right/jump buttons.
- ESP32 device: use the on-screen left/right/jump buttons. Drag from left/right onto jump to keep that direction while hopping.

Assets in `public/assets` are a small subset of Kenney's Pixel Platformer pack:

- Source: https://kenney.nl/assets/pixel-platformer
- License: Creative Commons CC0 1.0 Universal

The game is Mario-inspired in the broad platformer sense, but it does not use Nintendo-owned characters, names, sprites, music, or level layouts.

The PNG bytes are embedded in `src/assetBytes.ts` so the ESP32 build can decode the sprites without fetching a local web-server URL.
