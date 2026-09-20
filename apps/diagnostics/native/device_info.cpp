#include "device_info.h"

#include <cmath>
#include <cstdint>
#include <cstdio>

// ---------------------------------------------------------------------------
// Backend selection. The ESP-IDF backend compiles wherever the IDF headers are
// on the include path (all ESP32/S3/P4 targets). Everything else — including the
// emscripten/wasm simulator build — uses the portable host fallback, which is
// also the seam where the Pico SDK and geaos-Linux backends will slot in.
// ---------------------------------------------------------------------------
#if __has_include(<esp_chip_info.h>)
#define GEA_DEVINFO_ESP_IDF 1
#endif

#ifndef GEA_EMBEDDED_CPP_BOARD
#define GEA_EMBEDDED_CPP_BOARD "unknown"
#endif

#ifdef GEA_DEVINFO_ESP_IDF
// ============================ ESP-IDF backend ==============================
#include "esp_chip_info.h"
#include "esp_idf_version.h"
#include "esp_mac.h"
#include "esp_system.h"
#include "esp_timer.h"
#include "sdkconfig.h"
#if __has_include(<esp_flash.h>)
#include "esp_flash.h"
#define GEA_DEVINFO_HAS_FLASH_API 1
#endif
#if __has_include(<esp_psram.h>)
#include "esp_psram.h"
#endif
#if __has_include(<soc/soc_caps.h>)
#include "soc/soc_caps.h"
#endif
#if __has_include(<driver/temperature_sensor.h>) && defined(SOC_TEMP_SENSOR_SUPPORTED) && SOC_TEMP_SENSOR_SUPPORTED
#include "driver/temperature_sensor.h"
#define GEA_DEVINFO_HAS_TSENS 1
#endif

namespace gea::host::device_info {
namespace {
esp_chip_info_t chip() {
  esp_chip_info_t info{};
  esp_chip_info(&info);
  return info;
}
}  // namespace

std::string deviceId() { return GEA_EMBEDDED_CPP_BOARD; }
std::string platform() { return "esp-idf"; }

std::string chipModel() {
  switch (chip().model) {
    case CHIP_ESP32: return "ESP32";
    case CHIP_ESP32S2: return "ESP32-S2";
    case CHIP_ESP32S3: return "ESP32-S3";
    case CHIP_ESP32C3: return "ESP32-C3";
    case CHIP_ESP32P4: return "ESP32-P4";
    default: return "ESP32-family";
  }
}

std::string chipArch() {
  switch (chip().model) {
    case CHIP_ESP32:
    case CHIP_ESP32S2:
    case CHIP_ESP32S3: return "Xtensa";
    default: return "RISC-V";
  }
}

double chipRevision() { return chip().revision; }
double cores() { return chip().cores; }

double cpuMhz() {
#if defined(CONFIG_ESP_DEFAULT_CPU_FREQ_MHZ)
  return CONFIG_ESP_DEFAULT_CPU_FREQ_MHZ;
#else
  return 0;
#endif
}

double flashSizeBytes() {
#ifdef GEA_DEVINFO_HAS_FLASH_API
  uint32_t size = 0;
  if (esp_flash_get_size(nullptr, &size) != ESP_OK) return 0;
  return size;
#else
  return 0;
#endif
}

double ramSizeBytes() {
#if __has_include(<esp_psram.h>)
  if (esp_psram_is_initialized()) return esp_psram_get_size();
#endif
  return 0;
}

std::string uniqueId() {
  uint8_t mac[6] = {0};
  esp_efuse_mac_get_default(mac);
  char buf[18];
  std::snprintf(buf, sizeof(buf), "%02X:%02X:%02X:%02X:%02X:%02X", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  return buf;
}

std::string osVersion() { return esp_get_idf_version(); }

std::string resetReason() {
  switch (esp_reset_reason()) {
    case ESP_RST_POWERON: return "power-on";
    case ESP_RST_EXT: return "external";
    case ESP_RST_SW: return "software";
    case ESP_RST_PANIC: return "panic";
    case ESP_RST_INT_WDT: return "int-wdt";
    case ESP_RST_TASK_WDT: return "task-wdt";
    case ESP_RST_WDT: return "other-wdt";
    case ESP_RST_BROWNOUT: return "brownout";
    case ESP_RST_DEEPSLEEP: return "deep-sleep";
    case ESP_RST_SDIO: return "sdio";
    default: return "unknown";
  }
}

double uptimeMs() { return esp_timer_get_time() / 1000.0; }

double dieTemperatureC() {
#ifdef GEA_DEVINFO_HAS_TSENS
  static temperature_sensor_handle_t handle = nullptr;
  if (handle == nullptr) {
    temperature_sensor_config_t config = TEMPERATURE_SENSOR_CONFIG_DEFAULT(-10, 80);
    if (temperature_sensor_install(&config, &handle) != ESP_OK) return NAN;
    temperature_sensor_enable(handle);
  }
  float value = NAN;
  if (temperature_sensor_get_celsius(handle, &value) != ESP_OK) return NAN;
  return value;
#else
  return NAN;
#endif
}
}  // namespace gea::host::device_info

#else
// ======================= Portable host / web fallback ======================
// Compiled for the emscripten/wasm simulator (and any non-embedded host). The
// simulator has no real hardware facts, so this reports M5Paper as the device
// id — that makes the UI exercise a real catalog profile (a mix of live /
// detected / absent) in the browser; on-device backends report the true id.
#include <chrono>
#include <thread>

namespace gea::host::device_info {
namespace {
std::chrono::steady_clock::time_point programStart = std::chrono::steady_clock::now();
}  // namespace

std::string deviceId() { return "esp32-m5stack-m5paper"; }
std::string platform() { return "web"; }
std::string chipModel() { return "Simulator"; }
std::string chipArch() { return "wasm"; }
double chipRevision() { return 0; }
double cores() {
  unsigned n = std::thread::hardware_concurrency();
  return n > 0 ? static_cast<double>(n) : 1;
}
double cpuMhz() { return 0; }
double flashSizeBytes() { return 0; }
double ramSizeBytes() { return 0; }
std::string uniqueId() { return "00:00:00:00:00:00"; }
std::string osVersion() { return "simulator"; }
std::string resetReason() { return "n/a"; }
double uptimeMs() {
  auto now = std::chrono::steady_clock::now();
  return std::chrono::duration<double, std::milli>(now - programStart).count();
}
double dieTemperatureC() { return NAN; }
}  // namespace gea::host::device_info

#endif
