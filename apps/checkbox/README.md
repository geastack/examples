# Checkbox

A small GeaStack app demonstrating the `Checkbox` component from
`@geastack/elements`.

The app shows three states:

- **Controlled:** email notifications are toggled through the store.
- **Indeterminate:** product updates starts indeterminate; activating it
  requests the checked state and clears the indeterminate flag.
- **Disabled:** the final checkbox is checked and cannot be activated.

## Commands

Run from this directory after installing dependencies at the repository root:

```sh
npm run check
npm run build
```

The app currently declares web support only. Embedded targets remain disabled
until the component backend is validated on those targets.
