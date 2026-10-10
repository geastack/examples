import { Profiler, ReactiveComponent, type PointerEvent } from '@geastack/core'
import { system } from '../../../stores/SystemStore'
import { FactoryPointerHistory, FactoryScrollDynamics } from '../../../lib/scroll'
import { wrap } from '../../../lib/model'
import { launcher } from '../store'
import { icons } from '../../../assets'
import { ArcTopClock } from '../../../common/arc_top_clock/ArcTopClock'
import leftIndicator from '../../../assets/icon_indicator_left.png'
import rightIndicator from '../../../assets/icon_indicator_right.png'
import './view.css'

export class Launcher extends ReactiveComponent {
  scroll = new FactoryScrollDynamics(466, 466, 0, new FactoryPointerHistory(true), true)
  menuX = 0
  iconPage = 16
  menuTitleAlpha = 1
  touchX = 0
  touchY = 0
  held = false
  suppressClick = false
  running = false
  requestRevision = -1

  get menuSelectedIndex(): number {
    return wrap(this.iconIndex + Math.round(-this.menuX / 466), 8)
  }

  get iconIndex(): number {
    return wrap(this.iconPage, 8)
  }

  syncScroll() {
    const position = this.scroll.visualPosition()
    const page = Math.floor((position + 233) / 466)

    launcher.select(page)
    // Preserve the three physical icon identities throughout a gesture/snap.
    // Midpoint selection changes the title/dot, not the moving image sources.
    if (!this.scroll.held && !this.scroll.animating) {
      this.iconPage = page
    }

    this.menuX = this.iconPage * 466 - position
    this.menuTitleAlpha = this.scroll.titleOpacity()
  }

  onAfterRender() {
    if (this.running) {
      return
    }

    this.running = true
    this.requestRevision = launcher.requestRevision
    this.iconPage = 16 + launcher.menuIndex
    this.scroll.teleport(this.iconPage * 466)
    this.syncScroll()
    requestAnimationFrame((timestamp) => this.frame(timestamp))
  }

  dispose() {
    this.running = false
    this.held = false
  }

  frame(timestamp: number) {
    if (!this.running || system.screen !== 'menu') {
      this.running = false
      this.held = false

      return
    }

    this.scroll.update(timestamp)
    if (this.requestRevision !== launcher.requestRevision) {
      this.requestRevision = launcher.requestRevision
      const page = Math.floor((this.scroll.position + 233) / 466)

      this.iconPage = page
      this.scroll.animateTo((page + launcher.requestDirection) * 466, timestamp)
    }

    this.syncScroll()
    if (!this.scroll.held && !this.scroll.animating) {
      this.scroll.teleport((16 + launcher.menuIndex) * 466)
    }

    requestAnimationFrame((nextTimestamp) => this.frame(nextTimestamp))
  }

  pointerDown(event: PointerEvent) {
    event.stopPropagation()
    if (system.navigationBlocked) {
      return
    }

    this.touchX = event.clientX
    this.touchY = event.clientY
    this.held = true
    this.suppressClick = false
    this.scroll.begin(event.clientX, Profiler.nowUs() / 1000)
    this.iconPage = Math.floor((this.scroll.position + 233) / 466)
    this.syncScroll()
  }

  pointerMove(event: PointerEvent) {
    event.stopPropagation()
    if (!this.held) {
      return
    }

    const dx = event.clientX - this.touchX
    const dy = event.clientY - this.touchY

    this.scroll.move(event.clientX, Profiler.nowUs() / 1000, Math.abs(dx) > Math.abs(dy))
    this.syncScroll()
  }

  pointerUp(event: PointerEvent) {
    event.stopPropagation()
    if (!this.held) {
      return
    }

    this.held = false
    const dragged = this.scroll.dragging
    const dx = event.clientX - this.touchX
    const dy = event.clientY - this.touchY

    this.scroll.release(Profiler.nowUs() / 1000)
    this.syncScroll()
    this.suppressClick = dragged
    if (this.touchY <= 20 && dy > 50 && dy > Math.abs(dx)) {
      system.showBattery(6000)
      this.suppressClick = true
    }
  }

  consumeClick(): boolean {
    if (this.suppressClick) {
      this.suppressClick = false

      return false
    }

    return !system.navigationBlocked
  }

  arrow(direction: number) {
    if (this.consumeClick()) {
      launcher.go(direction)
    }
  }

  open(offset = 0) {
    if (this.consumeClick()) {
      const base = this.scroll.held || this.scroll.animating ? this.iconIndex : launcher.menuIndex

      launcher.open(base - launcher.menuIndex + offset)
    }
  }

  template() {
    return (
      <div
        class="menu"
        onPointerDown={(event) => this.pointerDown(event)}
        onPointerMove={(event) => this.pointerMove(event)}
        onPointerUp={(event) => this.pointerUp(event)}
        onClick={(event) => event.stopPropagation()}
      >
        <ArcTopClock />
        <button class="previous" onClick={() => this.arrow(-1)}>
          <img src={leftIndicator} />
        </button>
        <button class="menu-icon" style={{ left: 133 + this.menuX }} onClick={() => this.open()}>
          <img src={icons[this.iconIndex]} />
        </button>
        <button
          class="menu-icon"
          style={{ left: 133 - 466 + this.menuX }}
          onClick={() => this.open(-1)}
        >
          <img src={icons[wrap(this.iconIndex - 1, 8)]} />
        </button>
        <button
          class="menu-icon"
          style={{ left: 133 + 466 + this.menuX }}
          onClick={() => this.open(1)}
        >
          <img src={icons[wrap(this.iconIndex + 1, 8)]} />
        </button>
        <button class="next" onClick={() => this.arrow(1)}>
          <img src={rightIndicator} />
        </button>
        <span class="menu-title" style={{ opacity: this.menuTitleAlpha }}>
          {launcher.names[this.menuSelectedIndex]}
        </span>
        <div class="dots">
          {launcher.names.map((name, index) => (
            <div
              key={name}
              class={this.menuSelectedIndex === index ? 'dot selected' : 'dot'}
              style={{ left: 24 + index * 16 + (this.menuSelectedIndex === index ? -3 : 0) }}
            />
          ))}
        </div>
      </div>
    )
  }
}
