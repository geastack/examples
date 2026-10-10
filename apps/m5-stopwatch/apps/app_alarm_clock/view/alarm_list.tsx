import { Component } from '@geastack/core'
import type { PointerEvent } from '@geastack/core'
import { system } from '../../../stores/SystemStore'
import { TouchGesture } from '../../../common/gesture/TouchGesture'
import { alarmClock } from '../store'
import '../../../common/adjust/Adjust.css'
import './alarm_list.css'

export class AlarmList extends Component {
  private gesture = new TouchGesture()
  private holdTimer = 0
  private holdId = -1

  beginHold(event: PointerEvent, id: number) {
    event.stopPropagation()
    this.endHold()
    if (system.navigationBlocked) {
      return
    }

    this.gesture.begin(event.clientX, event.clientY)
    this.holdId = id
    this.holdTimer = setTimeout(() => {
      if (
        this.gesture.active &&
        !this.gesture.moved &&
        system.screen === 'alarms' &&
        !system.navigationBlocked
      ) {
        alarmClock.askDelete(this.holdId)
        this.endHold()
      }
    }, 400)
  }

  moveHold(event: PointerEvent) {
    event.stopPropagation()
    this.gesture.move(event.clientX, event.clientY)
    if (this.gesture.moved) {
      this.endHold()
    }
  }

  endHold() {
    clearTimeout(this.holdTimer)
    this.gesture.end()
    this.holdId = -1
  }

  pointerUp(event: PointerEvent) {
    event.stopPropagation()
    this.endHold()
  }

  dispose() {
    this.endHold()
  }

  template() {
    return (
      <div class="list">
        <span class="section-title">Alarms</span>
        {alarmClock.alarms.map((alarm) => (
          <div
            key={alarm.id}
            class="alarm-row"
            onPointerDown={(event) => this.beginHold(event, alarm.id)}
            onPointerMove={(event) => this.moveHold(event)}
            onPointerUp={(event) => this.pointerUp(event)}
          >
            <span>
              {alarm.hour < 10 ? '0' : ''}
              {alarm.hour}:{alarm.minute < 10 ? '0' : ''}
              {alarm.minute}
            </span>
            <button
              class={alarm.enabled ? 'switch on' : 'switch'}
              onClick={() => alarmClock.toggleAlarm(alarm.id)}
            >
              <div />
            </button>
          </div>
        ))}
        <button class="list-button" onClick={() => alarmClock.addAlarm()}>
          Add
        </button>
      </div>
    )
  }
}
