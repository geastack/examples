import { Store, Clock, Battery, Notify } from '@geastack/core'

// A date + time watch face driven by the REAL wall clock (gea::host::Clock —
// gettimeofday, reflects a host-set time via GEADEV SETTIME / the companion).
// Shows weekday, day-of-month, month name, and HH:MM.
//
// The date is computed from days-since-epoch with Howard Hinnant's
// civil-from-days algorithm — pure integer math (every value is positive for
// modern dates, so Math.floor is exact integer truncation). The host sends
// local wall-clock encoded as a UTC epoch, so plain modular arithmetic yields
// local date+time with no timezone DB on the device. Before the clock is ever
// synced this power cycle, falls back to the boot frame clock with a neutral
// date placeholder. Re-renders only when the displayed minute or day changes.
export class DateWatchStore extends Store {
  wd = 'SAT'
  day = '30'
  mon = 'MAY'
  time = '10:09'
  battery = ''
  notification = ''

  lastMin = -1
  lastDay = -1
  lastBatteryMs = 0
  lastNotifSeq = -1
  notifUntilMs = 0

  // Frame-clock fallback base (10:09).
  baseSec = 10 * 3600 + 9 * 60

  init() {
    this.lastMin = -1
    this.lastDay = -1
    this.lastBatteryMs = 0
    // Anchor to the current notification seq so only NEW posts show (RAM read).
    this.lastNotifSeq = Notify.seq()
    this.notification = ''
    this.update(0)
  }

  tick(timestampMs: number) {
    this.update(timestampMs)
    // Battery complication, refreshed ~every 10s from the frame task (Battery is
    // an I2C PMU read — safe; mirrors the digital watch face).
    if (this.lastBatteryMs === 0 || timestampMs - this.lastBatteryMs >= 10000) {
      this.lastBatteryMs = timestampMs
      this.battery = '' + Battery.level() + '%'
    }
    // Notification toast (mirrors the digital watch): on a new post, show for ~30s.
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
    const epochMs = Clock.epochMs()
    if (epochMs > 1600000000000) {
      const total = Math.floor(epochMs / 1000)
      const days = Math.floor(total / 86400)
      const sod = total - days * 86400
      const h = Math.floor(sod / 3600)
      const m = Math.floor(sod / 60) % 60
      if (m === this.lastMin && days === this.lastDay) return
      this.lastMin = m
      this.lastDay = days
      this.time = this.pad(h) + ':' + this.pad(m)
      // Civil date from days-since-1970 (Hinnant). Positive-only fast path.
      const z = days + 719468
      const era = Math.floor(z / 146097)
      const doe = z - era * 146097
      const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365)
      const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100))
      const mp = Math.floor((5 * doy + 2) / 153)
      const d = doy - Math.floor((153 * mp + 2) / 5) + 1
      const month = mp < 10 ? mp + 3 : mp - 9
      const wd = (days + 4) % 7
      this.wd = this.weekdayName(wd)
      this.mon = this.monthName(month)
      this.day = '' + d
    } else {
      // Clock not synced yet — boot frame clock, neutral date placeholder.
      const total = this.baseSec + Math.floor(timestampMs / 1000)
      const m = Math.floor(total / 60) % 60
      const h = Math.floor(total / 3600) % 24
      if (m === this.lastMin) return
      this.lastMin = m
      this.time = this.pad(h) + ':' + this.pad(m)
      this.wd = 'GEA'
      this.mon = 'SYNC'
      this.day = '--'
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

export const dateWatch = new DateWatchStore()
