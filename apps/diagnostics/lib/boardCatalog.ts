import type { CapabilityState } from './capabilities'
import { SUBSYSTEMS } from './capabilities'

// Arrays of typed records (not Record<string, …> maps): a keyed map lowers to a
// boxed gea_cpp_value in geatsc, whereas an array of a fixed record type lowers
// to a native std::vector<record>. Lookups iterate — the sets are tiny.
export interface CellEntry {
  sub: string
  state: CapabilityState
  detail: string
}

export interface DeviceProfile {
  id: string
  name: string
  cells: CellEntry[]
}

interface DeviceRaw {
  id: string
  name: string
  cells: CellEntry[]
}

function L(sub: string, detail: string): CellEntry {
  return { sub, state: 'live', detail }
}
function D(sub: string, detail: string): CellEntry {
  return { sub, state: 'detected', detail }
}

// Lokmat APPLLP Max is a config-clone of the 2 MAX — share the cell set.
const lokmatCells: CellEntry[] = [
  L('display', '480x480 BGRA (MIPI-DSI)'),
  L('touch', 'FT6336G (1-centroid)'),
  L('imu', 'MTK factory (accel+gyro)'),
  L('speaker', 'MT6357 + AW87391'),
  D('microphone', 'codec ADC (unexplored)'),
  D('camera', 'SP5508 / GC030A (blocked)'),
  L('wifi', 'connsys (helper)'),
  L('ble', '/dev/stpbt HOGP'),
  D('battery', 'sysfs (facade)'),
  D('temperature', 'thermal_zone (facade)'),
  D('buttons', 'power/side (unmapped)'),
  D('cellular', '4G (unexercised)'),
  D('gps', '(unverified)'),
  D('vibration', '(unprobed)'),
  D('rtc', 'PMIC RTC (unprobed)')
]

const RAW: DeviceRaw[] = [
  { id: 'esp32-m5stack-m5paper', name: 'M5Paper', cells: [
    L('display', 'IT8951 e-paper 540x960'),
    L('touch', 'GT911 (2-pt)'),
    L('buttons', '3 rocker + BOOT'),
    L('sdcard', 'microSD (SPI)'),
    L('storage', 'NVS'),
    L('wifi', 'native'),
    L('ble', 'NimBLE'),
    L('battery', 'ADC %'),
    D('temperature', 'SHT30 ext (unwired)'),
    D('rtc', 'BM8563 (unwired)')
  ] },
  { id: 'esp32-s3-touch-amoled-2.06', name: 'AMOLED 2.06', cells: [
    L('display', 'CO5300 AMOLED 410x502'),
    L('touch', 'FT3168'),
    L('buttons', 'BOOT'),
    L('imu', 'QMI8658'),
    L('speaker', 'ES8311'),
    L('microphone', 'ES8311 ADC'),
    L('sdcard', 'SD_MMC 1-bit'),
    L('storage', 'NVS'),
    L('wifi', 'native'),
    L('ble', 'NimBLE'),
    L('battery', 'AXP2101 gauge'),
    L('temperature', 'S3 die sensor')
  ] },
  { id: 'esp32-s3-touch-amoled-1.8', name: 'AMOLED 1.8', cells: [
    L('display', 'SH8601 AMOLED 368x448'),
    L('touch', 'FT3168'),
    L('buttons', 'BOOT'),
    L('imu', 'QMI8658'),
    L('speaker', 'ES8311'),
    L('microphone', 'ES8311 ADC'),
    L('storage', 'NVS'),
    L('wifi', 'native'),
    L('ble', 'NimBLE'),
    L('battery', 'AXP2101 gauge'),
    L('temperature', 'S3 die sensor')
  ] },
  { id: 'esp32-s3-touch-amoled-1.75', name: 'AMOLED 1.75 (GPS)', cells: [
    L('display', 'CO5300 AMOLED 466x466'),
    L('touch', 'CST9217'),
    L('buttons', 'BOOT'),
    L('imu', 'QMI8658'),
    L('speaker', 'ES8311'),
    L('microphone', 'ES8311 ADC'),
    L('storage', 'NVS'),
    L('wifi', 'native'),
    L('ble', 'NimBLE'),
    L('battery', 'AXP2101 gauge'),
    L('gps', 'LC76G (UART)'),
    L('temperature', 'S3 die sensor')
  ] },
  { id: 'esp32-s3-epaper-1.54', name: 'E-Paper 1.54', cells: [
    L('display', 'SSD1681 e-paper 200x200'),
    L('touch', 'FT6336'),
    L('buttons', 'BOOT + PWR'),
    L('speaker', 'ES8311'),
    L('microphone', 'ES8311 ADC'),
    L('sdcard', 'SD_MMC 1-bit'),
    L('storage', 'NVS'),
    L('wifi', 'native'),
    L('ble', 'NimBLE'),
    L('temperature', 'S3 die + SHTC3 ext'),
    D('rtc', 'PCF85063 (unwired)')
  ] },
  { id: 'esp32-s3-m5stack-sticks3', name: 'StickS3', cells: [
    L('display', 'ST7789V2 135x240'),
    L('buttons', 'KEY1/KEY2 + BOOT'),
    L('imu', 'BMI270'),
    D('speaker', 'ES8311+AW8737 (not impl)'),
    L('storage', 'NVS'),
    L('wifi', 'native'),
    L('ble', 'NimBLE'),
    D('battery', 'M5PM1 PMIC (batt unwired)'),
    L('temperature', 'S3 die sensor')
  ] },
  { id: 'esp32-s3-elecrow-rotary-2.1', name: 'Elecrow Rotary 2.1', cells: [
    L('display', 'ST7701S RGB 480x480'),
    L('touch', 'CST816'),
    L('buttons', 'rotary push + BOOT'),
    L('rotary', 'quadrature A/B + push'),
    L('storage', 'NVS'),
    L('wifi', 'native'),
    L('ble', 'NimBLE'),
    L('temperature', 'S3 die sensor')
  ] },
  { id: 'esp32-p4-m5stack-tab5', name: 'M5Stack Tab5', cells: [
    L('display', 'MIPI-DSI 720x1280'),
    L('touch', 'GT911 / ST7123'),
    L('buttons', 'BOOT'),
    L('imu', 'BMI270'),
    L('speaker', 'ES8388 + NS4150B'),
    D('microphone', 'ES7210 (unwired)'),
    L('camera', 'SC202CS MIPI-CSI'),
    L('sdcard', 'SDMMC 4-bit'),
    L('storage', 'NVS'),
    L('wifi', 'ESP32-C6 (hosted)'),
    L('battery', 'INA226 + IP2326'),
    L('temperature', 'P4 die sensor'),
    D('rtc', 'RX8130CE (unwired)')
  ] },
  { id: 'esp32-p4-waveshare-touch-lcd-7', name: 'Waveshare P4 7"', cells: [
    L('display', 'ILI9881C MIPI 720x1280'),
    L('touch', 'GT911'),
    L('buttons', 'BOOT'),
    L('speaker', 'ES8311'),
    L('microphone', 'ES8311 ADC'),
    L('camera', 'OV5647 MIPI-CSI'),
    L('sdcard', 'SDMMC 4-bit'),
    L('storage', 'NVS'),
    L('wifi', 'ESP32-C6 (hosted)'),
    L('temperature', 'P4 die sensor')
  ] },
  { id: 'esp32-p4-waveshare-touch-lcd-3.5', name: 'Waveshare P4 3.5"', cells: [
    L('display', 'ST7796 SPI 320x480'),
    L('touch', 'FT6336U'),
    L('buttons', 'BOOT'),
    L('speaker', 'ES8311'),
    L('microphone', 'ES8311 ADC'),
    L('camera', 'OV5647 MIPI-CSI'),
    L('sdcard', 'SDMMC 4-bit'),
    L('storage', 'NVS'),
    L('temperature', 'P4 die sensor')
  ] },
  { id: 'rp2350-tufty-2350', name: 'Pimoroni Tufty 2350', cells: [
    L('display', 'ST7789 parallel 320x240'),
    L('buttons', 'A/B/C/Up/Down/Home'),
    L('storage', 'NVS'),
    D('wifi', 'CYW43 (unwired)'),
    D('ble', 'CYW43 (unwired)'),
    L('battery', 'RP2350 ADC'),
    L('temperature', 'RP2350 ADC ch4'),
    L('rtc', 'PCF85063')
  ] },
  { id: 'rp2350-waveshare-touch-amoled-2.41', name: 'Waveshare RP2350 2.41', cells: [
    L('display', 'RM690B0 AMOLED 450x600'),
    L('touch', 'FT6336'),
    D('imu', 'QMI8658 (bring-up only)'),
    L('storage', 'NVS'),
    L('battery', 'ETA6098 + ADC'),
    L('temperature', 'RP2350 ADC ch4'),
    L('rtc', 'PCF85063')
  ] },
  { id: 'lokmat-applp2max', name: 'Lokmat APPLLP 2 MAX', cells: lokmatCells },
  { id: 'lokmat-applpmax', name: 'Lokmat APPLLP Max', cells: lokmatCells },
  { id: 'cactus-redmi6a', name: 'Xiaomi Redmi 6A', cells: [
    L('display', '720x1440 BGRA (MIPI-DSI)'),
    L('touch', 'auto-detect'),
    L('imu', 'MTK factory (axes unverified)'),
    D('speaker', 'MT6357-class'),
    D('microphone', '(unexplored)'),
    D('camera', 'hi556 / s5k3l8 (blocked)'),
    D('sdcard', 'microSD (unconfirmed)'),
    D('wifi', 'connsys (unexercised)'),
    D('battery', 'sysfs (facade)'),
    D('temperature', 'thermal_zone (facade)'),
    D('buttons', 'power/vol (unmapped)'),
    D('cellular', '(unexercised)'),
    D('gps', '(unverified)'),
    D('vibration', '(unprobed)'),
    D('rtc', 'PMIC RTC (unprobed)')
  ] }
]

function findRaw(id: string): DeviceRaw | null {
  for (let i = 0; i < RAW.length; i++) if (RAW[i].id == id) return RAW[i]
  return null
}

// Returns a cell for every subsystem (SUBSYSTEMS order), filling 'absent' where
// the device raw has no entry, or 'detected'/unknown when the device is not in
// the catalog at all.
export function profileFor(id: string): DeviceProfile {
  const raw = findRaw(id)
  const cells: CellEntry[] = []
  for (let i = 0; i < SUBSYSTEMS.length; i++) {
    const sid = SUBSYSTEMS[i].id
    let found: CellEntry | null = null
    if (raw != null) {
      for (let j = 0; j < raw.cells.length; j++) {
        if (raw.cells[j].sub == sid) {
          found = raw.cells[j]
          break
        }
      }
    }
    if (found != null) cells.push(found)
    else cells.push({ sub: sid, state: raw != null ? 'absent' : 'detected', detail: raw != null ? '' : 'unknown device' })
  }
  return { id, name: raw != null ? raw.name : id, cells }
}
