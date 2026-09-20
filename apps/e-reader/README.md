# Folio Reader

An e-paper-oriented EPUB reader designed for a 540×960 display at DPR 1. The
web target runs through the GeaStack WASM simulator and uses the same
`/sdcard/books` paths intended for removable storage on hardware.

## Local book fixtures

The `books/` directory is intentionally ignored by Git. Copy EPUBs into it and
generate the SD index:

```sh
cp /path/to/books/*.epub books/
npm run index:books
```

`books/library.json` contains lightweight listing metadata. The app reads and
parses each EPUB itself when opened: ZIP/DEFLATE, `container.xml`, OPF metadata,
manifest, spine order, and XHTML content. The simulator build preloads the whole
directory at `/sdcard/books` through `gea.webPreload`.

## Run at the target size

Built from a checkout of [geastack/simulator](https://github.com/geastack/simulator),
which reads this app out of the examples repo:

```sh
cd /path/to/simulator
GEA_WEB_DEVICE_PIXEL_RATIO=1 ./targets/web/build-web.sh e-reader
npm run dev
```

Then open:

```text
http://localhost:5173/?app=e-reader&width=540&height=960&dpr=1&zoom=0.75
```

## Controls

- Library: Up/Down selects, Enter or Right opens, `R` rescans the SD index.
- Reader: Left/Up and Right/Down turn pages; Space advances.
- `B` toggles a bookmark, `T` opens contents, `M` opens typography settings.
- Escape/Back closes a panel or returns to the library.

Reading position, bookmarks, and typography preferences persist in
`localStorage`. The settings panel also exposes a full e-paper refresh action.

The manifest intentionally enables only `web` for now. The UI and storage paths
are hardware-shaped, but the EPUB memory profile still needs qualification on
the eventual board before enabling its native target.
