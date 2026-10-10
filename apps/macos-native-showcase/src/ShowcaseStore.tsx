import { Store } from '@geastack/core'

class ShowcaseStore extends Store {
  enabled = true
  displayName = 'Alex Morgan'
  email = 'alex@example.com'
  notes = 'Try typing here, then inspect the live value in DevTools.'
  palette = 'indigo'
  size = 'medium'
  remember = true
  quantity = 3
  progress = 64
  radius = 16
  loading = true
  expanded = false
  animationsRunning = true
  alertVisible = false
  actionCount = 0

  updateName(value: string) { this.displayName = value }
  updateEmail(value: string) { this.email = value }
  updateNotes(value: string) { this.notes = value }
  selectPalette(value: string) { this.palette = value }
  selectSize(value: string) { this.size = value }
  setQuantity(value: string) { this.quantity = Math.max(1, Math.min(12, Number(value))) }
  setProgress(value: string) { this.progress = Math.max(0, Math.min(100, Number(value))) }
  setRadius(value: string) { this.radius = Math.max(0, Math.min(32, Number(value))) }
  toggleEnabled() { this.enabled = !this.enabled }
  toggleRemember() { this.remember = !this.remember }
  toggleLoading() { this.loading = !this.loading }
  toggleMotion() { this.animationsRunning = !this.animationsRunning }
  toggleExpanded() { this.expanded = !this.expanded }
  countAction() { this.actionCount++ }

  advanceProgress() {
    this.progress = this.progress >= 100 ? 0 : Math.min(100, this.progress + 11)
  }

  showAlert() {
    this.actionCount++
    this.alertVisible = true
  }

  dismissAlert() { this.alertVisible = false }

  reset() {
    this.enabled = true
    this.displayName = 'Alex Morgan'
    this.email = 'alex@example.com'
    this.notes = 'Try typing here, then inspect the live value in DevTools.'
    this.palette = 'indigo'
    this.size = 'medium'
    this.remember = true
    this.quantity = 3
    this.progress = 64
    this.radius = 16
    this.loading = true
    this.expanded = false
    this.animationsRunning = true
    this.alertVisible = false
    this.actionCount = 0
  }
}

export const showcase = new ShowcaseStore()
