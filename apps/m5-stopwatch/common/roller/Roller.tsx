import { Profiler, ReactiveComponent } from '@geastack/core'
import type { GeaElement, PointerEvent } from '@geastack/core'
import { setup } from '../../apps/app_setup/store'
import { system } from '../../stores/SystemStore'
import { daysInMonth, wrap } from '../../lib/model'
import { RollerDynamics } from './dynamics'
import { FactoryPointerHistory } from '../../lib/scroll'
import './Roller.css'

// Keep the native mount independent of selection changes: number props would
// replace the gesture instance at release and cancel its in-flight animation.
interface RollerProps {
  field: string
}

const rows = [
  { id: 0, offset: -3 },
  { id: 1, offset: -2 },
  { id: 2, offset: -1 },
  { id: 3, offset: 0 },
  { id: 4, offset: 1 },
  { id: 5, offset: 2 },
  { id: 6, offset: 3 },
]

export class Roller extends ReactiveComponent<GeaElement, RollerProps> {
  declare props: RollerProps
  anchor = 0
  offset = 0
  pointerY = 0
  private initialized = false
  private disposed = false
  private running = false
  private mountedScreen = ''
  private count = 0
  private selectedValue = 0
  private dynamics = new RollerDynamics(
    {
      count: 24,
      fontHeight: 30,
      optionsFontHeight: 16,
      lineSpace: 16,
      letterSpace: 0,
      height: 164,
      padding: 24,
      animationMs: 200,
      infinite: true,
    },
    0,
  )

  created(props: RollerProps) {
    this.props = props
    if (this.initialized) {
      return
    }

    this.initialized = true
    this.mountedScreen = system.screen
    this.count = this.rangeCount()
    this.selectedValue = system.valueFor(props.field)
    this.dynamics = new RollerDynamics(
      {
        count: this.count,
        fontHeight: 30,
        optionsFontHeight: props.field === 'day' ? 30 : 16,
        lineSpace: 16,
        letterSpace: 0,
        height: 164,
        padding: 24,
        animationMs: 200,
        infinite: props.field !== 'options',
        glide: true,
      },
      system.valueFor(props.field) - this.minimum(),
      new FactoryPointerHistory(true),
    )
    this.sync()
  }

  onAfterRender() {
    this.created(this.props)
    this.syncSelection(Math.trunc(Profiler.nowUs() / 1000))
  }

  dispose() {
    this.disposed = true
    this.running = false
  }

  private startFrame() {
    if (!this.running && !this.disposed) {
      this.running = true
      requestAnimationFrame((timestamp) => this.frame(timestamp))
    }
  }

  private minimum(): number {
    if (this.props.field === 'year') {
      return 2000
    }

    if (this.props.field === 'month' || this.props.field === 'day') {
      return 1
    }

    return this.props.field === 'options' ? 2 : 0
  }

  private rangeCount(): number {
    const field = this.props.field

    if (field === 'hour') {
      return 24
    }

    if (field === 'minute' || field === 'second') {
      return 60
    }

    if (field === 'year') {
      return 100
    }

    if (field === 'month') {
      return 12
    }

    if (field === 'day') {
      return daysInMonth(setup.adjustYear, setup.adjustMonth)
    }

    return 17
  }

  private sync() {
    this.anchor = this.dynamics.anchor + this.minimum()
    this.offset = this.dynamics.residual
  }

  private syncSelection(timestamp: number) {
    const count = this.rangeCount()
    const value = system.valueFor(this.props.field)

    if (count !== this.count || value !== this.selectedValue) {
      this.count = count
      this.selectedValue = value
      this.dynamics.reset(count, value - this.minimum(), timestamp)
      this.sync()
    }
  }

  frame(timestamp: number) {
    if (this.disposed || this.mountedScreen !== system.screen) {
      this.running = false

      return
    }

    timestamp = Math.trunc(timestamp)
    this.syncSelection(timestamp)
    if (this.dynamics.pressed) {
      this.dynamics.move(this.pointerY, timestamp)
      this.sync()
    }

    if (this.dynamics.update(timestamp)) {
      this.sync()
    }

    if (this.dynamics.pressed || this.dynamics.animating) {
      requestAnimationFrame((next) => this.frame(next))
    } else {
      this.running = false
    }
  }

  pointerDown(event: PointerEvent) {
    event.stopPropagation()
    if (system.navigationBlocked) {
      return
    }

    const timestamp = Math.trunc(Profiler.nowUs() / 1000)

    this.syncSelection(timestamp)
    this.pointerY = event.clientY
    this.dynamics.press(this.pointerY, timestamp)
    this.sync()
    this.startFrame()
  }

  pointerMove(event: PointerEvent) {
    event.stopPropagation()
    if (!this.dynamics.pressed) {
      return
    }

    this.pointerY = event.clientY
    this.dynamics.preview(this.pointerY)
    const timestamp = Math.trunc(Profiler.nowUs() / 1000)

    this.dynamics.move(this.pointerY, timestamp)
    this.sync()
  }

  pointerUp(event: PointerEvent) {
    event.stopPropagation()
    if (!this.dynamics.pressed) {
      return
    }

    const top = system.screen === 'set-date' ? 143 : 138

    this.dynamics.preview(event.clientY)
    this.dynamics.release(event.clientY - top, Profiler.nowUs() / 1000)
    const selected = this.dynamics.selected + this.minimum()

    this.selectedValue = selected
    system.changeValue(this.props.field, selected - system.valueFor(this.props.field))
    this.sync()
    this.startFrame()
  }

  label(offset: number): string {
    if (!this.dynamics.hasRow(offset)) {
      return ''
    }

    const field = this.props.field
    let number = this.anchor + offset

    if (field === 'options') {
      return number < 2 || number > 18 ? '' : String(number)
    }

    number = this.minimum() + wrap(number - this.minimum(), this.count)

    return number < 10 ? '0' + number : String(number)
  }

  template(props?: RollerProps) {
    if (props) {
      this.created(props)
      this.syncSelection(Math.trunc(Profiler.nowUs() / 1000))
    }

    return (
      <div
        class="roller"
        touch-action="none"
        onPointerDown={(event) => this.pointerDown(event)}
        onPointerMove={(event) => this.pointerMove(event)}
        onPointerUp={(event) => this.pointerUp(event)}
        onClick={(event) => event.stopPropagation()}
      >
        <div class="roller-track">
          {rows.map((row) => (
            <span key={row.id} class="roller-row" style={{ top: row.offset * 46 + this.offset }}>
              {this.label(row.offset)}
            </span>
          ))}
        </div>
        <div class="roller-value">
          <div class="roller-track roller-selected-track">
            {rows.map((row) => (
              <span key={row.id} class="roller-row" style={{ top: row.offset * 46 + this.offset }}>
                {this.label(row.offset)}
              </span>
            ))}
          </div>
        </div>
      </div>
    )
  }
}
