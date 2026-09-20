import type {} from '@geastack/core'

declare module '@geastack/core' {
  interface GeaIntrinsicElements {
    vibrancy: any
    // Native macOS shell structural tags (mapped to AppKit by the macOS target)
    'glass-split': any
    'glass-pane': any
    toolbar: any
    'toolbar-item': any
    'toolbar-search': any
    'toolbar-space': any
    symbol: any
  }
}
