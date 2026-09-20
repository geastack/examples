# Example Catalog

The examples repo contains Gea apps used for demos, target bring-up, regression
tests, and marketing proof.

## Main Categories

| Category | Examples | What they prove |
| --- | --- | --- |
| Watch and wearable UI | `watch`, `watch-analog`, `watch-date`, `watch-face` | Compact layouts, clock/date rendering, small-screen app surfaces. |
| Basic JSX apps | `counter-jsx`, `todo-jsx`, `static-card`, `stopwatch-jsx` | Component rendering, state updates, text/input, timers. |
| Canvas and animation | `bouncing-balls`, `bouncing-balls-jsx`, `canvas-3d`, `canvas-3d-cube`, `css-3d-cube`, `css-animation-showcase` | Canvas drawing, CSS animation, frame loop, transform behavior. |
| UI components | `settings`, `dialer`, `virtual-list`, `typography`, `bubble-grid`, `bubble-grid-jsx` | Higher-level controls, scroll behavior, text layout, launchable apps. |
| Games | `sky-hop`, `sky-hop-jsx`, `tic-tac-toe`, `tilt-breakout`, `button-tetris` | Interaction, simple game loops, collision/physics, deterministic logic. |
| Device features | `camera-showcase`, `camera-studio`, `voice-notes`, `hid-clicker`, `weather`, `maps` | Target capabilities such as camera, audio, HID, network, and map assets. |
| Apple/native experiments | `notes-jsx`, `notes-native`, `ios-device-showcase`, `ios-metal-*`, `ios-native-showcase` | Apple target and native renderer experiments. |
| Windows/native experiments | `notes-jsx`, `notes-windows` | Windows target: the JSX notes app through the Win32 renderer, and the same app written against `@geastack/windows/Controls`. |
| Reactive experiments | `reactive-counter`, `reactive-child-probe`, `reactive-nested-probe`, `reactive-tic-tac-toe` | Store/reactivity experiments, often hidden from launchers. |

## Target Compatibility

Compatibility is declared in each app's `package.json` under `gea.targets`.

Common targets:

- `web`: can run through the web simulator.
- `esp32`: can build for embedded ESP32 boards.
- `geaos`: can run in the GeaOS environment.
- `macos`: can run through the Apple macOS target.
- `ios`: can run through the Apple iOS target.
- `windows`: can run through the Windows (Win32) target.

Do not infer compatibility from whether an app happens to compile. The manifest
is the source of truth used by tools.

## Launcher Metadata

Apps can include `gea.launcher` metadata:

```json
{
  "launcher": {
    "description": "watch face",
    "order": 1,
    "accent": "#38bdf8",
    "hidden": false
  }
}
```

Use `hidden: true` for probes, internal tests, or experiments that should not
appear in normal launchers.

## Special Cases

- `app-launcher` contains a `launcherCatalog` list and can be used to exercise
  app switching.
- `notes-windows` uses `runtime: windows-native`: its UI is built from
  `@geastack/windows/Controls` classes and it depends on `@geastack/windows`.
- `notes-native` uses `runtime: apple-native` rather than the default Gea
  runtime.
- Some Canvas examples have both imperative and JSX variants. Keep both when
  they prove different compiler/runtime surfaces.
