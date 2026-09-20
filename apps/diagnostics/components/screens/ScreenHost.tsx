import { Component } from '@geastack/core'
import { diag } from '../../stores/DiagnosticsStore'
import './screens-common.css'
import './NotPresent.css'
import { DisplayScreen } from './DisplayScreen'
import { TouchScreen } from './TouchScreen'
import { ButtonsScreen } from './ButtonsScreen'
import { RotaryScreen } from './RotaryScreen'
import { ImuScreen } from './ImuScreen'
import { SdCardScreen } from './SdCardScreen'
import { StorageScreen } from './StorageScreen'
import { WifiScreen } from './WifiScreen'
import { BleScreen } from './BleScreen'
import { SpeakerScreen } from './SpeakerScreen'
import { MicrophoneScreen } from './MicrophoneScreen'
import { CameraScreen } from './CameraScreen'
import { GpsScreen } from './GpsScreen'
import { RtcScreen } from './RtcScreen'
import { TemperatureScreen } from './TemperatureScreen'
import { CellularScreen } from './CellularScreen'
import { VibrationScreen } from './VibrationScreen'

export class ScreenHost extends Component {
  template() {
    const id = diag.screen
    return (
      <div class="screen">
        <div class="screen-scroll" id="diag-body">
        <div class="screen-scroll-inner">
        {diag.curState != 'live' ? (
          <div class="screen-body">
            <div class="not-present">
              <span class={`state-badge badge-${diag.curState}`}>{diag.curBadge}</span>
              <span class="not-present-msg">{diag.curMsg}</span>
              <span class="not-present-detail">{diag.curDetail}</span>
            </div>
          </div>
        ) :
         id == 'display' ? <DisplayScreen /> :
         id == 'touch' ? <TouchScreen /> :
         id == 'buttons' ? <ButtonsScreen /> :
         id == 'rotary' ? <RotaryScreen /> :
         id == 'imu' ? <ImuScreen /> :
         id == 'sdcard' ? <SdCardScreen /> :
         id == 'storage' ? <StorageScreen /> :
         id == 'wifi' ? <WifiScreen /> :
         id == 'ble' ? <BleScreen /> :
         id == 'speaker' ? <SpeakerScreen /> :
         id == 'microphone' ? <MicrophoneScreen /> :
         id == 'camera' ? <CameraScreen /> :
         id == 'gps' ? <GpsScreen /> :
         id == 'rtc' ? <RtcScreen /> :
         id == 'temperature' ? <TemperatureScreen /> :
         id == 'cellular' ? <CellularScreen /> :
         id == 'vibration' ? <VibrationScreen /> :
         <div class="screen-body"></div>}
        </div>
        </div>
        <div class="screen-head">
          {diag.compact == 0 ? (
            <div id="back" class="screen-back" onClick={() => diag.back()}>{'< BACK'}</div>
          ) : null}
          <span class="screen-title">{diag.curTitle}</span>
        </div>
        {diag.compact == 1 ? (
          <div class="ctrl-bar">
            {diag.cLabel0 != '' ? <span class={`ctrl-chip ${diag.cOn0 == 1 ? 'is-on' : ''}`}>{diag.cLabel0}</span> : null}
            {diag.cLabel1 != '' ? <span class={`ctrl-chip ${diag.cOn1 == 1 ? 'is-on' : ''}`}>{diag.cLabel1}</span> : null}
            {diag.cLabel2 != '' ? <span class={`ctrl-chip ${diag.cOn2 == 1 ? 'is-on' : ''}`}>{diag.cLabel2}</span> : null}
            {diag.cLabel3 != '' ? <span class={`ctrl-chip ${diag.cOn3 == 1 ? 'is-on' : ''}`}>{diag.cLabel3}</span> : null}
          </div>
        ) : null}
      </div>
    )
  }
}
