import { system } from '../stores/SystemStore'
import { alarmClock } from './app_alarm_clock/store'
import { battery } from '../common/status_bar/store'
import { Component, Profiler } from '@geastack/core'
import type { PointerEvent } from '@geastack/core'
import { stopwatch } from './app_stopwatch/store'
import { TouchGesture } from '../common/gesture/TouchGesture'
import { GuidePage } from './app_launcher/view/guide_page'
import { Launcher } from './app_launcher/view/view'
import { WatchFaceManager } from './app_watch_face/view/watch_face_manager'
import { StopWatch } from './app_stopwatch/view/view'
import { AlarmList } from './app_alarm_clock/view/alarm_list'
import { AddAlarm } from './app_alarm_clock/view/add_alarm'
import { TriggerAlarm } from './app_alarm_clock/view/trigger_alarm'
import { Badge } from './app_badge/view/badge'
import { BadgeEditor } from './app_badge/view/badge_editor'
import { IMUView } from './app_imu/view/view'
import { FFTView } from './app_fft/view/view'
import { LuckyWheel } from './app_lucky_wheel/view/wheel'
import { SettingsView } from './app_setup/view/view'
import { BrightnessView } from './app_setup/workers/brightness'
import { VolumeView } from './app_setup/workers/volume'
import { ButtonView } from './app_setup/workers/button'
import { SetTimeView } from './app_setup/workers/set_time'
import { SetDateView } from './app_setup/workers/set_date'
import { AboutView } from './app_setup/workers/about'
import { StatusBar } from '../common/status_bar/status_bar'
import { Dialog } from '../common/dialog/Dialog'
import { ErrorMessage } from '../common/error/ErrorMessage'
import { BootLogo } from '../common/loading_page/boot_logo'
import './apps.css'

export class App extends Component {
  keyAAt = -1
  keyBAt = -1
  ignoredKeyUps = 0
  private batteryPull = new TouchGesture()

  keyDown(code: number): void {
    if (code === 27) {
      this.ignoredKeyUps = (this.keyAAt >= 0 ? 1 : 0) | (this.keyBAt >= 0 ? 2 : 0)
      if (!system.navigationBlocked) {
        system.home()
      }

      return
    }

    if (code !== 37 && code !== 39) {
      return
    }

    if ((code === 37 ? this.keyAAt : this.keyBAt) >= 0) {
      return
    }

    const timestamp = Profiler.nowUs() / 1000

    if (code === 37) {
      this.keyAAt = timestamp
    } else {
      this.keyBAt = timestamp
    }

    system.feedback(code === 37 ? 1864.66 : 2093)
    if (system.navigationBlocked) {
      return
    }

    if (system.screen === 'stopwatch') {
      stopwatch.press(code, true, system.now)
    }
  }

  keyUp(code: number): void {
    if (code !== 37 && code !== 39) {
      return
    }

    if (system.screen === 'stopwatch') {
      stopwatch.press(code, false, system.now)
    }

    const bit = code === 37 ? 1 : 2
    const pressedAt = code === 37 ? this.keyAAt : this.keyBAt

    if (code === 37) {
      this.keyAAt = -1
    } else {
      this.keyBAt = -1
    }

    if ((this.ignoredKeyUps & bit) !== 0) {
      this.ignoredKeyUps &= ~bit

      return
    }

    if (pressedAt < 0 || system.navigationBlocked || system.screen === 'stopwatch') {
      return
    }

    if (Profiler.nowUs() / 1000 - pressedAt < 500) {
      system.go(code === 37 ? -1 : 1)
    }
  }

  handleKey(code: number): void {
    this.keyDown(code)
    this.keyUp(code)
  }

  pointerDown(event: PointerEvent) {
    if (!system.navigationBlocked && event.clientY <= 20) {
      this.batteryPull.begin(event.clientX, event.clientY)
    }
  }

  pointerMove(event: PointerEvent) {
    this.batteryPull.move(event.clientX, event.clientY)
  }

  pointerUp(_event: PointerEvent) {
    if (
      this.batteryPull.active &&
      this.batteryPull.dy > 50 &&
      this.batteryPull.dy > Math.abs(this.batteryPull.dx)
    ) {
      system.showBattery(6000)
    }

    this.batteryPull.end()
  }

  template() {
    return (
      <div
        class="factory"
        onKeyDown={(event) => this.keyDown(event.keyCode)}
        onKeyUp={(event) => this.keyUp(event.keyCode)}
        onPointerDown={(e) => this.pointerDown(e)}
        onPointerMove={(e) => this.pointerMove(e)}
        onPointerUp={(e) => this.pointerUp(e)}
      >
        {system.screen === 'boot' && <BootLogo />}
        {system.screen === 'guide' && <GuidePage />}
        {system.screen === 'menu' && <Launcher />}
        {system.screen === 'watch' && <WatchFaceManager />}
        {system.screen === 'stopwatch' && <StopWatch />}
        {system.screen === 'alarms' && <AlarmList />}
        {system.screen === 'alarm-add' && <AddAlarm />}
        {system.screen === 'badge' && <Badge />}
        {system.screen === 'badge-edit' && <BadgeEditor />}
        {system.screen === 'imu' && <IMUView />}
        {system.screen === 'fft' && <FFTView />}
        {system.screen === 'wheel' && <LuckyWheel />}
        {system.screen === 'settings' && <SettingsView />}
        {system.screen === 'brightness' && <BrightnessView />}
        {system.screen === 'volume' && <VolumeView />}
        {system.screen === 'button' && <ButtonView />}
        {system.screen === 'set-time' && <SetTimeView />}
        {system.screen === 'set-date' && <SetDateView />}
        {system.screen === 'about' && <AboutView />}
        {!system.navigationBlocked && !battery.batteryVisible && system.screen !== 'boot' && (
          <div class="battery-pull-target" />
        )}
        {battery.batteryVisible && <StatusBar />}
        {system.dialog !== '' && <Dialog />}
        {alarmClock.ringing && <TriggerAlarm />}
        {system.error !== '' && <ErrorMessage />}
      </div>
    )
  }
}
