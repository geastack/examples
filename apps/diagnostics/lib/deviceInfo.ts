declare const deviceInfo: {
  deviceId(): string
  platform(): string
  chipModel(): string
  chipArch(): string
  chipRevision(): number
  cores(): number
  cpuMhz(): number
  flashSizeBytes(): number
  ramSizeBytes(): number
  uniqueId(): string
  osVersion(): string
  resetReason(): string
  uptimeMs(): number
  dieTemperatureC(): number
}

// Plain exported functions (not an object with methods): a const-object referenced
// from a Store method boxes to gea_cpp_value in the gea store-method lowerer, so
// `device.chip()` fails. Plain functions emit via the main path and resolve the
// deviceInfo host facade correctly.

function mib(bytes: number): string {
  if (bytes <= 0) return '-'
  return String(Math.round(bytes / (1024 * 1024))) + ' MB'
}

export function devId(): string {
  return deviceInfo.deviceId()
}

export function devPlatform(): string {
  return deviceInfo.platform()
}

export function devChip(): string {
  return deviceInfo.chipModel() + ' (' + deviceInfo.chipArch() + ')'
}

export function devCores(): number {
  return deviceInfo.cores()
}

export function devCpuMhz(): number {
  return deviceInfo.cpuMhz()
}

export function devFlash(): string {
  return mib(deviceInfo.flashSizeBytes())
}

export function devRam(): string {
  return mib(deviceInfo.ramSizeBytes())
}

export function devUniqueId(): string {
  return deviceInfo.uniqueId()
}

export function devOsVersion(): string {
  return deviceInfo.osVersion()
}

export function devResetReason(): string {
  return deviceInfo.resetReason()
}

export function devUptimeSeconds(): number {
  return Math.floor(deviceInfo.uptimeMs() / 1000)
}

export function devDieTempC(): number {
  return deviceInfo.dieTemperatureC()
}

// dieTemperatureC() returns NaN where the SoC has no internal sensor (original
// ESP32). NaN is the only value not equal to itself.
export function devHasDieTemp(): boolean {
  const t = deviceInfo.dieTemperatureC()
  return t === t
}
