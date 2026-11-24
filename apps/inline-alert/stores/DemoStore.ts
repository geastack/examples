import { Store } from '@geastack/core'
import type { InlineAlertVariant } from '@geastack/elements'

// The app owns which alerts are shown. InlineAlert only reports onDismiss,
// so dismissing one here removes it until Reset.
class DemoStore extends Store {
  infoOpen = true
  successOpen = true
  warningOpen = true
  errorOpen = true
  turkish = false
  retries = 0

  dismiss(variant: InlineAlertVariant): void {
    if (variant === 'info') this.infoOpen = false
    if (variant === 'success') this.successOpen = false
    if (variant === 'warning') this.warningOpen = false
    if (variant === 'error') this.errorOpen = false
  }

  retry(): void {
    this.retries = this.retries + 1
  }

  toggleLanguage(): void {
    this.turkish = !this.turkish
  }

  reset(): void {
    this.infoOpen = true
    this.successOpen = true
    this.warningOpen = true
    this.errorOpen = true
    this.retries = 0
  }
}

export const demo = new DemoStore()
