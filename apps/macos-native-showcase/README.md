# Mac native showcase

A compiled Gea app with AppKit controls: text fields, a text area, a pop-up menu,
checkboxes, radio buttons, switches, sliders, a stepper, buttons, a progress bar
and an activity spinner. Change their values and use **Show a message** to see
the current store state. **Enable inputs** toggles their native disabled states.

The motion card uses CSS on native views. Click **Click to morph** to transition
a button's width, corners, color and transform. The breathing button and moving
tile use `@keyframes`; the card's switch pauses and resumes their timelines.
The palette menu also transitions the corner sample's color.

Resize the window to switch between two columns and stacked cards. Small windows
stack the form fields too; scroll to reach the remaining controls.

From this folder, with the debug-capable Gea CLI and Apple toolchain installed:

```sh
gea run --debug --target macos
```

Use Elements to inspect `#transition-button`, `#layer-sample` or `#native-progress`. Inline
style and existing class-rule edits change the actual Mac window. In the Console:

```js
document.querySelector('#count-button').style.backgroundColor = '#007aff'
document.querySelector('#progress-button').click()
document.querySelector('#transition-button').click()
```

In Sources, open `src/ShowcaseStore.tsx` and put a breakpoint on
`this.actionCount++` inside `showAlert()`. Click **Show a message** in the Mac window, then use Step Over,
Step Into, Step Out or Resume. The debugger pauses the compiled app through
LLDB; scopes show native C++ values and paused expressions use C++ syntax.

The app has no network or device dependencies. Runtime edits do not save to
source. Use `--no-debug-sources` for tree/style inspection without LLDB.
