export class TouchGesture {
  active = false
  moved = false
  private startX = 0
  private startY = 0
  private lastX = 0
  private lastY = 0

  get dx(): number {
    return this.lastX - this.startX
  }

  get dy(): number {
    return this.lastY - this.startY
  }

  get swipe(): number {
    return Math.abs(this.dx) >= 60 && Math.abs(this.dx) > Math.abs(this.dy)
      ? this.dx < 0
        ? 1
        : -1
      : 0
  }

  begin(x: number, y: number) {
    this.startX = this.lastX = x
    this.startY = this.lastY = y
    this.active = true
    this.moved = false
  }

  move(x: number, y: number) {
    if (!this.active) {
      return
    }

    this.lastX = x
    this.lastY = y
    this.moved ||= Math.abs(this.dx) > 10 || Math.abs(this.dy) > 10
  }

  end() {
    this.active = false
  }
}
