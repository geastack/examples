# GeaStack Examples

Example applications and tools for GeaStack.

This repo is the app gallery used by the simulator, embedded targets, GeaOS,
and Apple targets. Each example is a small package with a `gea` manifest in
`package.json`.

## What Is Here

| Path | Purpose |
| --- | --- |
| `apps/*` | Gea apps. Most are TSX apps targeting web, ESP32, and/or GeaOS. |
| `apps/*/package.json` | App manifest, target compatibility, scripts, and launcher metadata. |
| `tools/dialer-browser` | Small browser-side helper tool for dialer workflows. |
| `shared` | Components shared by several apps (`Dialer`, `Settings`). |
| `assets` | Shared fonts. |
| `scripts` | Repository-level checks (the bouncing-balls FPS gate). |
| `benchmarks` | Native hello-window memory comparison (AppKit, Qt, Tauri, ...). |
| `.gea/boards.json` | Project board aliases (empty; aliases are machine-local). |
| `package.json` | npm workspace root for `apps/*` and `tools/*`, with the GeaStack CLI and compiler as dev dependencies. |
| `docs` | Catalog and contribution guidance. |

## Quick Start

Install once at the repository root; the apps are npm workspaces and share
that installation, including `@geastack/cli`:

```sh
npm install
```

Type-check an individual example:

```sh
cd apps/watch
npm run check
```

Some examples have tests, mostly for a layout or a device setup. Run them with
`npm test` in the app folder.

Run an app on the web from its folder with the Gea CLI:

```sh
cd apps/watch
npx gea dev                      # real DOM + CSS dev server with HMR
npx gea simulate                 # the same DOM app inside an adjustable device viewport
npx gea simulate --renderer wasm # embedded C++ renderer in the browser; needs Emscripten
npx gea build --target web       # static site in .gea/build/web/site
```

Flash a compatible board through the Gea CLI, after registering it once with
`npx gea setup` (which names its alias):

```sh
npx gea flash watch --board <alias>
npx gea flash watch --board <alias> --monitor
```

## Documentation

- [docs/EXAMPLE-CATALOG.md](docs/EXAMPLE-CATALOG.md): example categories,
  target compatibility, and how manifests are used.
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md): how to add, test, and maintain an
  example app.

## App Manifest Basics

Every buildable app should have a `package.json` with a `gea` field:

```json
{
  "gea": {
    "id": "watch",
    "name": "Watch",
    "entry": "index.tsx",
    "runtime": "gea",
    "targets": {
      "web": true,
      "esp32": true,
      "geaos": true
    }
  }
}
```

The manifest is consumed by the `gea` CLI, the simulator, embedded board
builds, GeaOS, and Apple targets. Keep it accurate.

## Maintenance Notes

- Keep examples small and focused. A good example proves one behavior clearly.
- Prefer shared framework APIs over target-specific hacks inside examples.
- Add tests for examples with non-trivial logic, physics, or parsing.
- Update the catalog docs when adding, renaming, hiding, or changing target
  compatibility for an app.

## License

MIT (see `LICENSE`). You can ship closed-source products built on it. The only GeaStack code under a different license is the
embedded board support (`targets` and `@geastack/chips`, GPL-3.0-only):
shipping closed-source firmware through those needs a commercial license.
Contact [contact@geastack.com](mailto:contact@geastack.com) for commercial terms, support and hosted builds.
