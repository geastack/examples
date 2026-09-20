import { Store, Clock, Battery, Notify } from '@geastack/core'

// Drives the digital watch face. Prefers the REAL wall clock once the host has
// synced it, and falls back to a boot frame clock so the display still advances
// out of the box (before any sync, or on a target with no RTC).
//
// `Clock.epochMs()` reads gettimeofday, which reflects a host-set time (GEADEV
// SETTIME → settimeofday; the gea Companion issues it on launch). This is why
// we don't use `Date.now()`: its generated runtime reads std::chrono::
// system_clock, which is monotonic on this ESP32 build and never reflects
// settimeofday. The host sends local wall-clock encoded as a UTC epoch
// (calendar.timegm(localtime)), so plain modular arithmetic on the epoch yields
// local time with no timezone DB on the device.
//
// When the clock is real, a weekday+day+month date line is computed with Howard
// Hinnant's civil-from-days algorithm (pure integer math; same as watch-date).
// Before sync the date is blank so the face just shows the advancing frame clock.
export class WatchStore extends Store {
  hh = '10'
  mm = '09'
  ss = '00'
  date = ''
  battery = ''
  notification = ''
  lastSec = -1
  lastBatteryMs = 0
  lastNotifSeq = -1
  notifUntilMs = 0

  // 10:09:00 starting point for the frame-clock fallback.
  baseSec = 10 * 3600 + 9 * 60

  init() {
    this.lastSec = -1
    this.lastBatteryMs = 0
    // Anchor to the current notification seq so only NEW posts (after this face
    // mounts) show, not a stale pre-mount one. Notify.seq() is a RAM read (safe).
    this.lastNotifSeq = Notify.seq()
    this.notification = ''
    this.update(0)
  }

  tick(timestampMs: number) {
    this.update(timestampMs)
    // Refresh the battery complication ~every 10s (it changes slowly). Read on
    // the frame task only (gea_init/init() can be PSRAM-stacked); batteryPercent
    // is an I2C PMU read so it is safe here.
    if (this.lastBatteryMs === 0 || timestampMs - this.lastBatteryMs >= 10000) {
      this.lastBatteryMs = timestampMs
      this.battery = '' + Battery.level() + '%'
    }
    // Notification toast: when the companion posts (GEADEV NOTIFY), Notify.seq()
    // changes; show the message for ~30s, then clear. Notify is a RAM channel.
    const nseq = Notify.seq()
    if (nseq !== this.lastNotifSeq) {
      this.lastNotifSeq = nseq
      this.notification = Notify.text()
      this.notifUntilMs = timestampMs + 30000
    }
    if (this.notification !== '' && timestampMs > this.notifUntilMs) {
      this.notification = ''
    }
  }

  update(timestampMs: number) {
    // > ~1.6e12 ms (2020-09) means the RTC has been set to a real time; below
    // that the clock was never synced this power cycle, so use the frame clock.
    const epochMs = Clock.epochMs()
    const synced = epochMs > 1600000000000
    const total = synced
      ? Math.floor(epochMs / 1000)
      : this.baseSec + Math.floor(timestampMs / 1000)
    const s = total % 60
    if (s === this.lastSec) return // only re-render when the second changes
    this.lastSec = s
    const h = Math.floor(total / 3600) % 24
    const m = Math.floor(total / 60) % 60
    this.hh = this.pad(h)
    this.mm = this.pad(m)
    this.ss = this.pad(s)
    if (synced) {
      // Civil date from days-since-1970 (Hinnant). Positive-only fast path.
      const days = Math.floor(total / 86400)
      const wd = (days + 4) % 7
      const z = days + 719468
      const era = Math.floor(z / 146097)
      const doe = z - era * 146097
      const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365)
      const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100))
      const mp = Math.floor((5 * doy + 2) / 153)
      const d = doy - Math.floor((153 * mp + 2) / 5) + 1
      const month = mp < 10 ? mp + 3 : mp - 9
      this.date = this.weekdayName(wd) + ' ' + ('' + d) + ' ' + this.monthName(month)
    } else {
      this.date = ''
    }
  }

  weekdayName(wd: number): string {
    if (wd === 0) return 'SUN'
    if (wd === 1) return 'MON'
    if (wd === 2) return 'TUE'
    if (wd === 3) return 'WED'
    if (wd === 4) return 'THU'
    if (wd === 5) return 'FRI'
    return 'SAT'
  }

  monthName(m: number): string {
    if (m === 1) return 'JAN'
    if (m === 2) return 'FEB'
    if (m === 3) return 'MAR'
    if (m === 4) return 'APR'
    if (m === 5) return 'MAY'
    if (m === 6) return 'JUN'
    if (m === 7) return 'JUL'
    if (m === 8) return 'AUG'
    if (m === 9) return 'SEP'
    if (m === 10) return 'OCT'
    if (m === 11) return 'NOV'
    return 'DEC'
  }

  pad(n: number): string {
    return n < 10 ? '0' + n : '' + n
  }
}

export const watch = new WatchStore()
