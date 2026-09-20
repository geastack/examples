#pragma once
#include <string>

// App-owned device-info facade. Registered in geatsc-plugin-gea as
// `deviceInfo` -> `gea::host::device_info`. One translation unit with
// per-platform backends selected at compile time: ESP-IDF today, a portable
// host/web fallback for the simulator, and (later) Pico SDK / geaos-Linux.
namespace gea::host::device_info {
std::string deviceId();
std::string platform();
std::string chipModel();
std::string chipArch();
double chipRevision();
double cores();
double cpuMhz();
double flashSizeBytes();
double ramSizeBytes();
std::string uniqueId();
std::string osVersion();
std::string resetReason();
double uptimeMs();
double dieTemperatureC();
}  // namespace gea::host::device_info
