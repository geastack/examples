import { Store } from '@geastack/core'
import {
  devId,
  devChip,
  devCores,
  devCpuMhz,
  devFlash,
  devRam,
  devUniqueId,
  devOsVersion,
  devResetReason,
  devUptimeSeconds,
  devDieTempC,
  devHasDieTemp
} from '../lib/deviceInfo'
import {
  capabilities,
  readTouch,
  storageSelfTest,
  sdSelfTest,
  imuStart,
  imuStop,
  readImu,
  wifiIsEnabled,
  wifiSetEnabled,
  wifiStartScan,
  wifiIsScanning,
  readWifiRows,
  readWifiStatus,
  bleMac,
  bleName,
  bleConnected,
  bleStartAdvertising,
  bleStopAdvertising,
  playTone,
  clockMs,
  readGps,
  readDisplay,
  displayFullRefresh,
  viewportWidth,
  viewportHeight,
  boardLabel,
  type WifiRow
} from '../lib/probes'
import type { Capability } from '../lib/capabilities'

function round2(v: number): string {
  return String(Math.round(v * 100) / 100)
}

// One consistent rule drives the whole non-touch UI: KEY2 moves a highlight
// through the on-screen controls (wrapping), and KEY1 presses the highlighted
// one. Every detail screen's controls are ['‹ Back', ...actions]; Back is index 0
// and is highlighted the instant a screen opens, so it never changes position and
// one KEY1 always leaves. A class (not an interface/record literal) so the control
// list lowers to a native struct instead of being boxed to a dynamic value.
class Control {
  id: string // action id: 'back', 'display.refresh', 'speaker.440', …
  label: string // chip text shown in the control strip
  arg: number // action argument (e.g. tone frequency); 0 when unused
  constructor(id: string, label: string, arg: number) {
    this.id = id
    this.label = label
    this.arg = arg
  }
}


function keyName(code: number): string {
  if (code == 37) return 'LEFT'
  if (code == 39) return 'RIGHT'
  if (code == 38) return 'UP'
  if (code == 40) return 'DOWN'
  if (code == 13) return 'ENTER'
  if (code == 27) return 'ESC'
  if (code == 8) return 'BACK'
  if (code >= 65 && code <= 90) return String.fromCharCode(code)
  return String(code)
}

export class DiagnosticsStore extends Store {
  screen = '' // '' = home menu

  rows: Capability[] = []

  // active-screen precomputed fields (templates read fields only — the native
  // renderer rejects slots that call methods/host objects, so everything a
  // template shows is precomputed here).
  curTitle = ''
  curState = ''
  curDetail = ''
  curBadge = ''
  curMsg = ''

  // display screen
  dispRes = ''
  dispFmt = ''
  dispDpr = 0
  dispOrient = ''

  // precomputed display strings
  lastKeyText = ''
  accelText = ''
  gyroText = ''
  tiltText = ''
  rtcSeconds = 0
  dieTempText = ''

  // overview / system fields
  deviceName = ''
  chip = ''
  cores = 0
  cpuMhz = 0
  flash = ''
  ram = ''
  uniqueId = ''
  osVersion = ''
  resetReason = ''
  uptime = 0
  dieTemp = 0
  hasDieTemp = 0

  // touch
  touchX = 0
  touchY = 0
  touching = 0

  // buttons
  lastKey = 0
  lastKeyName = ''

  // button-driven navigation (non-touch boards). ArrowDown cycles the highlight
  // through the focusable controls of the current context; ArrowUp activates the
  // highlighted control. On the home menu the controls are the subsystem rows;
  // on a subscreen they are ['back', ...screen actions] (BACK is always first).
  focusIndex = 0 // highlighted control within the current context
  menuFocusIndex = 0 // remembered home-menu position while inside a subscreen
  focusId = '' // highlighted subsystem id on the home menu ('' elsewhere)
  focusAction = '' // highlighted action id on a subscreen (touch boards / back highlight)
  curActions: string[] = [] // ordered focusable actions on the current subscreen (touch)

  // Control-cursor detail navigation (non-touch boards). A subsystem opens with a
  // control strip ['‹ Back', ...actions]; ctrlIndex highlights one, ctrlId is its
  // id. KEY2 advances ctrlIndex (wrapping), KEY1 runs ctrlId.
  controls: Control[] = []
  ctrlIndex = 0
  ctrlId = '' // id of the highlighted control (drives the strip's highlight)
  hintLeft = 'KEY2 NEXT' // left hint-bar label (KEY2)
  hintRight = 'KEY1 SELECT' // right hint-bar label (KEY1), reflects the highlighted control
  // Flat control-strip slots (max 4: Back + up to 3 actions). The template reads
  // these fixed fields directly — no .map / child component, which sidesteps the
  // geatsc mounted-renderer/include quirk. Empty label = slot hidden.
  cLabel0 = ''
  cLabel1 = ''
  cLabel2 = ''
  cLabel3 = ''
  cOn0 = 0
  cOn1 = 0
  cOn2 = 0
  cOn3 = 0

  // Narrow non-touch panels (e.g. the StickS3: ~67x120 CSS canvas) can't show the
  // full menu at once, and this engine's flex layout doesn't reliably clip
  // overflow — so instead of scrolling a clipped column we render only the window
  // of rows that fit, sliding it to keep the highlight visible. On roomy boards
  // visibleCount exceeds the row count, so the whole list renders as before.
  compact = 0
  visibleCount = 999
  winStart = 0
  visibleRows: Capability[] = []
  sysSummary = '' // compact one-line system summary shown when the grid is hidden

  // self-tests
  sdResult = -1
  storageResult = -1

  // wifi
  wifiEnabled = 0
  wifiScanning = 0
  wifiRows: WifiRow[] = []
  wifiSsid = ''
  wifiIp = ''
  wifiRssi = 0
  wifiMac = ''

  // ble
  bleMacAddr = ''
  bleDeviceName = ''
  bleAdvertising = 0
  bleConnectedFlag = 0

  // imu
  ax = 0
  ay = 0
  az = 0
  gx = 0
  gy = 0
  gz = 0
  tiltX = 0
  tiltY = 0
  imuActive = 0

  // rtc / gps
  rtcTime = 0
  gpsFix = 0
  gpsLat = 0
  gpsLon = 0

  // rotary encoder
  rotaryValue = 0

  initialize() {
    this.rows = capabilities(devId())
    this.deviceName = boardLabel(devId())
    this.chip = devChip()
    this.cores = devCores()
    this.cpuMhz = devCpuMhz()
    this.flash = devFlash()
    this.ram = devRam()
    this.uniqueId = devUniqueId()
    this.osVersion = devOsVersion()
    this.resetReason = devResetReason()
    this.hasDieTemp = devHasDieTemp() ? 1 : 0
    // Narrow panels get the compact home (dense grid hidden, menu windowed).
    // Threshold cleanly separates the StickS3 (135 / 67 CSS) from every larger
    // board (>=273), regardless of whether the width comes back physical or CSS.
    this.compact = viewportWidth() < 200 ? 1 : 0
    // Fill the canvas with as many menu rows as fit. Display width/height come
    // back in physical px, so convert to the CSS canvas via the DPR before
    // dividing by the CSS row height (~16) minus the header+hint reserve (~44).
    const dpr = readDisplay().dpr
    const cssH = dpr > 0 ? viewportHeight() / dpr : viewportHeight()
    const fits = Math.floor((cssH - 44) / 16)
    this.visibleCount = this.compact == 1 ? (fits < 3 ? 3 : fits) : 999
    this.sysSummary = String(this.cores) + 'C  ' + String(this.cpuMhz) + 'MHz  ' + this.flash
    this.focusIndex = 0
    this.menuFocusIndex = 0
    this.curActions = []
    this.syncFocus()
  }

  // Rebuild the rendered slice of menu rows, sliding the window so the highlight
  // is always inside it. On roomy boards visibleCount >= rows.length, so the
  // window is the whole list.
  rebuildWindow() {
    const n = this.rows.length
    const vc = this.visibleCount
    let start = this.winStart
    // Keep one row of lead below the highlight so it never sits on the (possibly
    // clipped) bottom row of the window.
    if (this.focusIndex < start) start = this.focusIndex
    if (this.focusIndex >= start + vc - 1) start = this.focusIndex - vc + 2
    const maxStart = n - vc > 0 ? n - vc : 0
    if (start > maxStart) start = maxStart
    if (start < 0) start = 0
    this.winStart = start
    const end = start + vc < n ? start + vc : n
    const out: Capability[] = []
    for (let i = start; i < end; i++) out.push(this.rows[i])
    this.visibleRows = out
  }

  // Ordered focusable actions on a subscreen. Index 0 is always 'back' so the
  // highlight lands on BACK the moment a screen opens (one ArrowUp exits it).
  actionsFor(id: string): string[] {
    if (id == 'display') return ['back', 'display.refresh']
    if (id == 'storage') return ['back', 'storage.test']
    if (id == 'sdcard') return ['back', 'sdcard.test']
    if (id == 'wifi') return this.curState == 'live' ? ['back', 'wifi.toggle', 'wifi.scan'] : ['back']
    if (id == 'ble') return this.curState == 'live' ? ['back', 'ble.toggle'] : ['back']
    if (id == 'speaker') return this.curState == 'live' ? ['back', 'speaker.440', 'speaker.880', 'speaker.1320'] : ['back']
    return ['back']
  }

  // Recompute the highlighted menu row + window from focusIndex (home only).
  syncFocus() {
    // Home menu only — detail screens are driven by the control cursor (applyCtrl).
    this.hintLeft = 'KEY2 MOVE'
    this.hintRight = 'KEY1 OPEN'
    const n = this.rows.length
    if (n == 0) {
      this.focusId = ''
      this.visibleRows = []
      return
    }
    if (this.focusIndex >= n) this.focusIndex = 0
    if (this.focusIndex < 0) this.focusIndex = n - 1
    this.focusId = this.rows[this.focusIndex].id
    this.focusAction = ''
    this.rebuildWindow()
  }

  // The control strip for a subsystem: always '‹ Back' first, then its actions.
  // Absent/detected subsystems (and info-only ones) get just Back.
  controlsFor(id: string, state: string): Control[] {
    const back = new Control('back', '‹ BACK', 0)
    if (state != 'live') return [back]
    if (id == 'display') return [back, new Control('display.refresh', 'REFRESH', 0)]
    if (id == 'storage') return [back, new Control('storage.test', 'RUN TEST', 0)]
    if (id == 'sdcard') return [back, new Control('sdcard.test', 'RUN TEST', 0)]
    if (id == 'ble') return [back, new Control('ble.toggle', 'ADVERTISE', 0)]
    if (id == 'wifi') return [back, new Control('wifi.toggle', 'ON/OFF', 0), new Control('wifi.scan', 'SCAN', 0)]
    if (id == 'speaker')
      return [
        back,
        new Control('speaker.440', '440', 440),
        new Control('speaker.880', '880', 880),
        new Control('speaker.1320', '1320', 1320)
      ]
    return [back]
  }

  // Publish the highlighted control's id and the hint-bar labels. KEY2 always
  // means "move"; KEY1 always means "press this control", so its label mirrors the
  // highlighted chip (BACK, REFRESH, …).
  applyCtrl() {
    const c = this.controls[this.ctrlIndex]
    this.ctrlId = c.id
    this.hintLeft = 'KEY2 MOVE'
    this.hintRight = 'KEY1 ' + (c.id == 'back' ? 'BACK' : c.label)
    this.cOn0 = this.ctrlIndex == 0 ? 1 : 0
    this.cOn1 = this.ctrlIndex == 1 ? 1 : 0
    this.cOn2 = this.ctrlIndex == 2 ? 1 : 0
    this.cOn3 = this.ctrlIndex == 3 ? 1 : 0
  }

  // Copy up to four control labels into the flat slot fields the template reads.
  syncCtrlLabels() {
    const n = this.controls.length
    this.cLabel0 = n > 0 ? this.controls[0].label : ''
    this.cLabel1 = n > 1 ? this.controls[1].label : ''
    this.cLabel2 = n > 2 ? this.controls[2].label : ''
    this.cLabel3 = n > 3 ? this.controls[3].label : ''
  }

  // KEY2 on a detail screen: move the highlight to the next control (wraps).
  ctrlNext() {
    const n = this.controls.length
    if (n <= 0) return
    this.ctrlIndex = (this.ctrlIndex + 1) % n
    this.applyCtrl()
  }

  // KEY1 on a detail screen: press the highlighted control.
  ctrlAct() {
    const a = this.ctrlId
    if (a == 'back') {
      this.back()
      return
    }
    if (a == 'display.refresh') this.fullRefresh()
    else if (a == 'storage.test') this.runStorageTest()
    else if (a == 'sdcard.test') this.runSdTest()
    else if (a == 'wifi.toggle') this.toggleWifi()
    else if (a == 'wifi.scan') this.scanWifi()
    else if (a == 'ble.toggle') this.toggleAdvertising()
    else if (a == 'speaker.440') this.tone(440)
    else if (a == 'speaker.880') this.tone(880)
    else if (a == 'speaker.1320') this.tone(1320)
  }

  // ArrowDown on the home menu: cycle the highlight to the next subsystem (wraps).
  next() {
    const n = this.rows.length
    if (n <= 0) return
    this.focusIndex = (this.focusIndex + 1) % n
    this.syncFocus()
  }

  // KEY1 on the home menu: open the highlighted subsystem.
  activate() {
    if (this.rows.length == 0) return
    this.open(this.rows[this.focusIndex].id)
  }

  stateOf(id: string): string {
    for (let i = 0; i < this.rows.length; i++) if (this.rows[i].id == id) return this.rows[i].state
    return 'absent'
  }

  detailOf(id: string): string {
    for (let i = 0; i < this.rows.length; i++) if (this.rows[i].id == id) return this.rows[i].detail
    return ''
  }

  titleOf(id: string): string {
    for (let i = 0; i < this.rows.length; i++) if (this.rows[i].id == id) return this.rows[i].title
    return id
  }

  open(id: string) {
    const state = this.stateOf(id)
    // Absent/detected subsystems still open — the screen shows a clear "not
    // present" message (see ScreenHost) rather than doing nothing on SELECT.
    this.menuFocusIndex = this.focusIndex // remember where to land on BACK
    this.screen = id
    this.curTitle = this.titleOf(id)
    this.curState = state
    this.curDetail = this.detailOf(id)
    this.curBadge = state == 'detected' ? 'DETECTED' : 'N/A'
    this.curMsg = state == 'detected' ? 'DETECTED - NOT EXERCISED BY THIS FIRMWARE' : 'NOT PRESENT ON THIS DEVICE'
    if (id == 'display') {
      const d = readDisplay()
      this.dispRes = d.res
      this.dispFmt = d.fmt
      this.dispDpr = d.dpr
      this.dispOrient = d.orient
    }
    if (id == 'imu' && state == 'live') {
      imuStart()
      this.imuActive = 1
    }
    if (id == 'ble' && state == 'live') {
      this.bleMacAddr = bleMac()
      this.bleDeviceName = bleName()
    }
    this.focusId = ''
    this.focusAction = 'back'
    // Build the control strip and highlight '‹ Back' (index 0) on entry. Touch
    // boards use inline buttons instead, so their strip stays empty.
    this.ctrlIndex = 0
    if (this.compact == 1) {
      this.controls = this.controlsFor(id, state)
      this.syncCtrlLabels()
      this.applyCtrl()
    } else {
      this.controls = []
      this.syncCtrlLabels()
    }
  }

  fullRefresh() {
    displayFullRefresh()
  }

  back() {
    if (this.imuActive == 1) {
      imuStop()
      this.imuActive = 0
    }
    this.screen = ''
    this.curActions = []
    this.focusIndex = this.menuFocusIndex // return to the row we came from
    this.syncFocus()
  }

  runStorageTest() {
    this.storageResult = storageSelfTest() ? 1 : 0
  }

  runSdTest() {
    this.sdResult = this.stateOf('sdcard') == 'live' ? sdSelfTest() : 0
  }

  toggleWifi() {
    const next = !wifiIsEnabled()
    wifiSetEnabled(next)
    this.wifiEnabled = next ? 1 : 0
  }

  scanWifi() {
    wifiStartScan()
    this.wifiScanning = 1
  }

  toggleAdvertising() {
    if (this.bleAdvertising == 1) {
      bleStopAdvertising()
      this.bleAdvertising = 0
    } else {
      bleStartAdvertising()
      this.bleAdvertising = 1
    }
  }

  tone(hz: number) {
    playTone(hz)
  }

  keydown(code: number) {
    this.lastKey = code
    this.lastKeyName = keyName(code)
    this.lastKeyText = code == 0 ? '' : 'keyCode ' + code
    if (code == 40) {
      // KEY2 — always "move": home cycles the menu highlight, detail moves the
      // control-strip highlight.
      if (this.screen == '') this.next()
      else this.ctrlNext()
      return
    }
    if (code == 38) {
      // KEY1 — always "press": home opens the highlighted subsystem, detail runs
      // the highlighted control.
      if (this.screen == '') this.activate()
      else this.ctrlAct()
      return
    }
    if (this.screen != '' && (code == 27 || code == 8)) this.back()
  }

  rotary(delta: number) {
    this.rotaryValue = this.rotaryValue + delta
  }

  tick() {
    this.uptime = devUptimeSeconds()
    if (this.hasDieTemp == 1) {
      this.dieTemp = devDieTempC()
      this.dieTempText = String(Math.round(this.dieTemp * 10) / 10) + ' C'
    } else {
      this.dieTempText = 'N/A'
    }

    if (this.screen == 'touch') {
      const t = readTouch()
      this.touching = t.touching ? 1 : 0
      this.touchX = t.x
      this.touchY = t.y
    } else if (this.screen == 'wifi' && this.stateOf('wifi') == 'live') {
      this.wifiEnabled = wifiIsEnabled() ? 1 : 0
      if (this.wifiScanning == 1 && !wifiIsScanning()) {
        this.wifiScanning = 0
        this.wifiRows = readWifiRows()
      }
      const status = readWifiStatus()
      this.wifiSsid = status.ssid
      this.wifiIp = status.ip
      this.wifiRssi = status.rssi
      this.wifiMac = status.mac
    } else if (this.screen == 'ble' && this.stateOf('ble') == 'live') {
      this.bleConnectedFlag = bleConnected() ? 1 : 0
    } else if (this.screen == 'imu' && this.imuActive == 1) {
      const s = readImu()
      this.ax = s.ax
      this.ay = s.ay
      this.az = s.az
      this.gx = s.gx
      this.gy = s.gy
      this.gz = s.gz
      this.tiltX = s.tiltX
      this.tiltY = s.tiltY
      this.accelText = round2(s.ax) + '  ' + round2(s.ay) + '  ' + round2(s.az)
      this.gyroText = round2(s.gx) + '  ' + round2(s.gy) + '  ' + round2(s.gz)
      this.tiltText = round2(s.tiltX) + '  ' + round2(s.tiltY)
    } else if (this.screen == 'rtc') {
      this.rtcTime = clockMs()
      this.rtcSeconds = Math.floor(this.rtcTime / 1000)
    } else if (this.screen == 'gps' && this.stateOf('gps') == 'live') {
      const g = readGps()
      this.gpsFix = g.fix
      this.gpsLat = g.lat
      this.gpsLon = g.lon
    }
  }
}

export const diag = new DiagnosticsStore()
