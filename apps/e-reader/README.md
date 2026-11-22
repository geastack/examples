# Folio Reader

An e-paper-oriented EPUB reader designed for a 540×960 display at DPR 1. In the
browser it runs through the GeaStack WASM simulator and uses the same
`/sdcard/books` paths intended for removable storage on hardware.

## Local book fixtures

The `books/` directory is intentionally ignored by Git. Copy EPUBs into it and
generate the SD index:

```sh
mkdir -p books
cp /path/to/books/*.epub books/
npm run index:books
```

`books/library.json` contains lightweight listing metadata. The app reads and
parses each EPUB itself when opened: ZIP/DEFLATE, `container.xml`, OPF metadata,
manifest, spine order, and XHTML content. The simulator build preloads the whole
directory at `/sdcard/books` through `gea.webPreload`.

## Run at the target size

EPUB parsing is native C++ (`native/epub_archive.cpp`, the `epubArchive` global),
so the browser needs the WASM renderer; the DOM-only `gea dev` and default
`gea simulate` do not have it. From this folder, with the Emscripten SDK on
`PATH`:

```sh
npx gea simulate --renderer wasm --width 540 --height 960 --dpr 1 --zoom 0.75
```

The CLI builds the WASM module, starts the simulator and opens it at that
viewport.

## Controls

- Library: Up/Down selects, Enter or Right opens, `R` rescans the SD index.
- Reader: Left/Up and Right/Down turn pages; Space advances.
- `B` toggles a bookmark, `T` opens contents, `M` opens typography settings.
- Escape/Back closes a panel or returns to the library.

Reading position, bookmarks, and typography preferences persist in
`localStorage`. The settings panel also exposes a full e-paper refresh action.

The manifest enables `web` and `esp32`, with `native/epub_archive.cpp` compiled
into native builds through `nativeSources`.
