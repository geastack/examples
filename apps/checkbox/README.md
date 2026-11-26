# Checkbox

A small GeaStack app demonstrating the `Checkbox` component from
`@geastack/elements`.

The app shows three states:

- **Controlled:** email notifications are toggled through the store.
- **Indeterminate:** product updates starts indeterminate; activating it
  requests the checked state and clears the indeterminate flag.
- **Disabled:** the final checkbox is checked and cannot be activated.

## Target status

- **Web:** declared in the app manifest; build and runtime behavior have not
  yet been validated for this contribution.
- **ESP32 / GeaOS:** disabled in the manifest; not supported or verified here.

## Commands

Run from this directory after installing dependencies at the repository root:

```sh
npm run check
npm run build
```

The example depends on a published `@geastack/elements` version that includes
Checkbox (the implementation is being contributed in
[geastack/core#55](https://github.com/geastack/core/pull/55)). Until that
package version is available, the commands above cannot validate the new
component integration.
