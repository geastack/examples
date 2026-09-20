# Example Development Guide

Use this guide when adding or changing example apps.

## Create A New Example

1. Create `apps/<id>`.
2. Add `package.json` with a valid `gea` manifest.
3. Add `index.tsx` or `index.ts`.
4. Add `tsconfig.json` and `vite.config.ts` following nearby examples.
5. Add icons when the app should appear in a launcher.
6. Add tests if the app has non-trivial logic.

Use a stable lowercase `gea.id`. Avoid renaming an id after tools or docs refer
to it.

## Standard Commands

From an example folder:

```sh
npm install
npm run check
npm run build
```

Some examples also expose:

```sh
npm test
npm run flash
npm run flash:monitor
```

Do not add target-specific scripts unless they are useful from inside the app
folder. Prefer the shared target tools for normal workflows.

## Manifest Checklist

Every app manifest should answer:

- What is the stable app id?
- What display name should launchers show?
- What file is the entry point?
- Which runtime does it need?
- Which targets are known to work?
- Should the app appear in launchers?

Target compatibility should be explicit. If an app is untested on a target, set
that target to `false` or omit it until verified.

## Test Guidance

Add tests for:

- game state transitions;
- physics;
- parsers and formatters;
- target-specific fallback logic;
- app manifests or generated catalogs when launcher behavior changes.

Use the simulator or core pipeline tests for rendering and runtime regressions.

## Asset Guidance

Keep assets close to the example that owns them. Shared assets should only be
introduced when at least two examples use them and a shared location already
exists.

Large generated assets should not be committed unless they are required for a
test, demo, or target build.

## Updating The Catalog

Update [EXAMPLE-CATALOG.md](EXAMPLE-CATALOG.md) when:

- adding an app;
- renaming an app id;
- changing target compatibility;
- changing launcher visibility;
- adding a new category of examples.
