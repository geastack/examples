import {
  touch,
  writeCacheFile,
  readCacheFile,
  WiFi,
  BLE,
  Accelerometer,
  audioContext,
  Clock,
  Geolocation,
  Display,
  type TouchSample
} from '@geastack/core'
import { SUBSYSTEMS, badgeLabel, type Capability } from '../capabilities'
import { profileFor } from '../boardCatalog'

// All host-object access lives here, in plain module functions. The gea plugin's
// store-method mini-lowerer only recognizes a fixed set of host-object member
// *paths*; arbitrary host method calls (Accelerometer.start(), WiFi.*, BLE.*)
// emit an undeclared bare identifier there. The main geatsc emit path used for
// these plain functions resolves them correctly, so the store calls these and
// keeps only plain data.

export interface WifiRow {
  ssid: string
  rssi: number
  secured: number
}

export interface ImuSample {
  ax: number
  ay: number
  az: number
  gx: number
  gy: number
  gz: number
  tiltX: number
  tiltY: number
}

export interface WifiStatus {
  ssid: string
  ip: string
  rssi: number
  mac: string
}

export interface GpsSample {
  fix: number
  lat: number
  lon: number
}

// Build the ordered menu rows for a device: state + detail from the catalog.
// profileFor returns cells in SUBSYSTEMS order, so they align by index.
export function capabilities(deviceId: string): Capability[] {
  const profile = profileFor(deviceId)
  const rows: Capability[] = []
  for (let i = 0; i < SUBSYSTEMS.length; i++) {
    const s = SUBSYSTEMS[i]
    const cell = profile.cells[i]
    rows.push({ id: s.id, title: s.title, state: cell.state, detail: cell.detail, badge: badgeLabel(cell.state) })
  }
  return rows
}

export interface DisplayInfo {
  res: string
  fmt: string
  dpr: number
  orient: string
}

export function readDisplay(): DisplayInfo {
  return {
    res: Display.width + ' x ' + Display.height,
    fmt: Display.pixelFormat,
    dpr: Display.getDevicePixelRatio(),
    orient: Display.orientation
  }
}

export function displayFullRefresh(): void {
  Display.epaperFullRefresh()
}

// Mark the next present as a full-screen change so the whole panel re-flushes.
// The detail-screen paged scroll translates content with a CSS transform; the
// dirty-rect present otherwise leaves the newly-revealed region stale (blank)
// when content pans back on-screen. Calling this on each scroll step forces the
// revealed area to paint.
export function displayInvalidate(): void {
  Display.invalidate()
}

// Logical (CSS) viewport size, used to pick the compact layout and how many
// menu rows fit.
export function viewportWidth(): number {
  return Display.width
}

export function viewportHeight(): number {
  return Display.height
}

// Friendly board name (e.g. 'StickS3') for the header, from the catalog.
export function boardLabel(id: string): string {
  return profileFor(id).name
}

// --- touch ------------------------------------------------------------------
export function readTouch(): TouchSample {
  return touch.read()
}

// --- storage / sd -----------------------------------------------------------
export function storageSelfTest(): boolean {
  const key = '__diag_probe'
  const value = 'ok-' + String(Math.floor(Date.now() % 100000))
  localStorage.setItem(key, value)
  const got = localStorage.getItem(key)
  localStorage.removeItem(key)
  return got === value
}

export function sdSelfTest(): number {
  const ok = writeCacheFile('/sdcard/.diag_probe', new Uint8Array([68, 73, 65, 71]))
  if (!ok) return 0
  const back = readCacheFile('/sdcard/.diag_probe')
  if (back.length === 4 && back[0] === 68 && back[3] === 71) return 1
  return 0
}

// --- imu ---------------------------------------------------------------------
export function imuStart(): void {
  Accelerometer.start()
}

export function imuStop(): void {
  Accelerometer.close()
}

export function readImu(): ImuSample {
  return {
    ax: Accelerometer.accelerationX,
    ay: Accelerometer.accelerationY,
    az: Accelerometer.accelerationZ,
    gx: Accelerometer.gyroscopeX,
    gy: Accelerometer.gyroscopeY,
    gz: Accelerometer.gyroscopeZ,
    tiltX: Accelerometer.tiltX,
    tiltY: Accelerometer.tiltY
  }
}

// --- wifi --------------------------------------------------------------------
export function wifiIsEnabled(): boolean {
  return WiFi.enabled()
}

export function wifiSetEnabled(on: boolean): void {
  WiFi.setEnabled(on)
}

export function wifiStartScan(): void {
  WiFi.startScan()
}

export function wifiIsScanning(): boolean {
  return WiFi.scanning()
}

export function readWifiRows(): WifiRow[] {
  const count = WiFi.scanCount()
  const rows: WifiRow[] = []
  for (let i = 0; i < count; i++) {
    rows.push({ ssid: WiFi.scanSsidAt(i), rssi: WiFi.scanRssiAt(i), secured: WiFi.scanSecuredAt(i) ? 1 : 0 })
  }
  return rows
}

export function readWifiStatus(): WifiStatus {
  return { ssid: WiFi.ssid(), ip: WiFi.ip(), rssi: WiFi.rssi(), mac: WiFi.mac() }
}

// --- ble ---------------------------------------------------------------------
export function bleMac(): string {
  return BLE.mac()
}

export function bleName(): string {
  return BLE.deviceName()
}

export function bleConnected(): boolean {
  return BLE.connected()
}

export function bleStartAdvertising(): void {
  BLE.startAdvertising()
}

export function bleStopAdvertising(): void {
  BLE.stopAdvertising()
}

// --- speaker -----------------------------------------------------------------
export function playTone(hz: number): void {
  const osc = audioContext.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = hz
  osc.connect(audioContext.destination)
  osc.start(audioContext.currentTime)
  osc.stop(audioContext.currentTime + 0.25)
}

// --- rtc / gps ---------------------------------------------------------------
export function clockMs(): number {
  return Clock.epochMs()
}

export function readGps(): GpsSample {
  return { fix: Geolocation.hasFix() ? 1 : 0, lat: Geolocation.latitude(), lon: Geolocation.longitude() }
}
