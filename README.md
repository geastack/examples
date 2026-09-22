# GeaStack Examples

Example applications and tools for GeaStack.

This repo is the app gallery used by the simulator, embedded targets, GeaOS,
Apple targets, the VS Code/Cursor extension, and marketing demos. Each example
is a small package with a `gea` manifest in `package.json`.

## What Is Here

| Path | Purpose |
| --- | --- |
| `apps/*` | Gea apps. Most are TSX apps targeting web, ESP32, and/or GeaOS. |
| `apps/*/package.json` | App manifest, target compatibility, scripts, and launcher metadata. |
| `tools/dialer-browser` | Small browser-side helper tool for dialer workflows. |
| `package.json` | Workspace marker for the examples collection. |
| `docs` | Catalog and contribution guidance. |

## Quick Start

Run checks for an individual example:

```sh
cd apps/watch
npm install
npm run check
npm run build
```

Some examples have tests, mostly for a layout or a device setup. Run them with
`npm test` in the app folder.

The web loop is driven from the simulator, which is a separate repository:
[geastack/simulator](https://github.com/geastack/simulator). Its scripts read
apps out of an app project root, which they take from `GEA_APPS_ROOT` -- this
repo, or your own. There is no default, so set it or pass `--app-dir`. The two
checkouts do not need to be next to each other.

```sh
cd /path/to/simulator
GEA_APPS_ROOT=/path/to/examples ./targets/web/dev-web.mjs watch   # development loop
GEA_APPS_ROOT=/path/to/examples ./targets/web/build-web.sh watch  # build for web

./targets/web/dev-web.mjs --app-dir /path/to/examples/apps/watch   # or name one app
```

Flash a compatible board through the Gea CLI:

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

The manifest is consumed by the simulator, embedded board scripts, GeaOS,
Apple targets, and the IDE extension. Keep it accurate.

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
