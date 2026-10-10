import { Clock, Store } from '@geastack/core'
import { pad, wrap } from '../../lib/model'
import { DigitFlowState, factoryRound, FactorySpring, unwrapAngle } from './view/animation'
import { factoryDigitFlowCorrectionMask } from './view/number_flow_geometry'

const backgrounds = [
  '#000000',
  '#eeeeee',
  '#c2efeb',
  '#eee0cb',
  '#b1cc74',
  '#8a89c0',
  '#f26419',
  '#f2d7ee',
  '#048a81',
  '#9db4c0',
]
const panels = [
  '#1a1919',
  '#e4e3e3',
  '#b1e1dd',
  '#d9cab2',
  '#a4bd6b',
  '#8180b4',
  '#f6722c',
  '#e9c9e5',
  '#05968c',
  '#92a8b3',
]
const texts = [
  '#ffffff',
  '#484848',
  '#566e6c',
  '#6a5e4d',
  '#4b5e20',
  '#dfdeff',
  '#ffefe6',
  '#83627e',
  '#b1fffa',
  '#ecf8ff',
]
const dates = [
  '#a0a0a0',
  '#525252',
  '#6a938f',
  '#948063',
  '#668323',
  '#cbcbff',
  '#ffd3bc',
  '#a4789d',
  '#70cfc9',
  '#dcf3ff',
]

const numberFlowStates = Array.from({ length: 6 }, () => new DigitFlowState())
const simpleOrbit = new FactorySpring(0.3, 0.4)

export class WatchFaceStore extends Store {
  time = '00:00:00'
  hour = '00'
  minute = '00'
  second = '00'
  oldHour = '00'
  oldMinute = '00'
  oldSecond = '00'
  hourAt = -1000
  minuteAt = -1000
  secondAt = -1000
  hourY = 0
  minuteY = 0
  secondY = 0
  date = ''
  weekday = ''
  day = '00'
  lastSlowTick = -1000

  faceHour = '00'
  faceMinute = '00'
  faceWeekday = ''
  faceDay = '00'
  faceDate = ''
  hourRotation = 'rotate(-90deg)'
  minuteRotation = 'rotate(-90deg)'
  secondRotation = 'rotate(-90deg)'
  secondsAngle = 0
  seconds = 0
  minutes = 0
  hours = 0
  watchTickAt = 0
  simpleAngleInitialized = false
  simpleAngleUnwrapped = 0
  numberFlowValues = [0, 0, 0]
  numberFlowDigits = [
    { id: 0, x: 0, y: 0, opacity: 0 },
    { id: 1, x: 0, y: 0, opacity: 0 },
    { id: 2, x: 0, y: 0, opacity: 0 },
    { id: 3, x: 0, y: 0, opacity: 0 },
    { id: 4, x: 0, y: 0, opacity: 0 },
    { id: 5, x: 0, y: 0, opacity: 0 },
  ]
  numberFlowCorrections = [0, 0, 0, 0, 0, 0]
  face = 0
  theme = 0
  classicMode = 0
  secondDot = true
  simpleHintUntil = 0
  themeBg = '#000000'
  themePanel = '#1a1919'
  themeText = '#ffffff'
  themeDate = '#a0a0a0'

  resetWatchFace(timestamp: number) {
    this.theme = 0
    this.classicMode = 0
    this.secondDot = true
    this.simpleHintUntil = timestamp + 3000
    this.simpleAngleInitialized = false
    this.simpleAngleUnwrapped = 0
    simpleOrbit.teleport(0, timestamp)
    this.numberFlowValues.fill(0)
    for (let digit = 0; digit < 6; digit++) {
      numberFlowStates[digit].reset(digit % 2, timestamp)
    }

    this.updateTheme()
    this.updateWatchFace(timestamp)
    this.animateWatchFace(timestamp)
  }

  updateWatchFace(timestamp: number) {
    const date = new Date(Clock.epochMs())

    this.watchTickAt = timestamp
    this.hours = date.getHours()
    this.minutes = date.getMinutes()
    this.seconds = date.getSeconds()
    this.faceHour = pad(this.hours)
    this.faceMinute = pad(this.minutes)

    this.faceWeekday = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][date.getDay()]
    this.faceDay = pad(date.getDate())
    this.faceDate =
      date.getFullYear() +
      '/' +
      (date.getMonth() + 1) +
      '/' +
      date.getDate() +
      ' ' +
      this.faceWeekday
    this.secondRotation = 'rotate(' + (this.seconds * 6 - 90) + 'deg)'
    this.minuteRotation =
      'rotate(' + factoryRound((this.minutes * 6 + this.seconds / 10 - 90) * 10) / 10 + 'deg)'
    this.hourRotation =
      'rotate(' +
      factoryRound(((this.hours % 12) * 30 + this.minutes / 2 + this.seconds / 120 - 90) * 10) /
        10 +
      'deg)'
    if (this.face === 1) {
      const values = [this.hours, this.minutes, this.seconds]

      for (let panel = 0; panel < 3; panel++) {
        const previous = this.numberFlowValues[panel]
        const next = values[panel]

        numberFlowStates[panel * 2].setDigit(Math.floor(next / 10), next > previous, timestamp)
        numberFlowStates[panel * 2 + 1].setDigit(next % 10, next > previous, timestamp)
        this.numberFlowValues[panel] = next
      }
    } else if (this.face === 3) {
      const angle = Math.fround(this.seconds * 6)

      this.simpleAngleUnwrapped = this.simpleAngleInitialized
        ? unwrapAngle(this.simpleAngleUnwrapped, angle)
        : angle
      this.simpleAngleInitialized = true
      simpleOrbit.move(this.simpleAngleUnwrapped, timestamp)
    }
  }

  animateWatchFace(timestamp: number) {
    if (timestamp - this.watchTickAt > 1000) {
      this.updateWatchFace(timestamp)
    }

    if (this.face === 1) {
      for (let digit = 0; digit < 6; digit++) {
        const state = numberFlowStates[digit]
        const visual = this.numberFlowDigits[digit]

        const x = Math.trunc(state.position.update(timestamp))
        const offset = Math.fround(state.offset.update(timestamp))
        const y = Math.trunc(offset)
        const opacity =
          Math.max(0, Math.min(255, Math.trunc(state.opacity.update(timestamp)))) / 255
        const corrections = factoryDigitFlowCorrectionMask(offset)

        if (visual.x !== x) {
          visual.x = x
        }

        if (visual.y !== y) {
          visual.y = y
        }

        if (visual.opacity !== opacity) {
          visual.opacity = opacity
        }

        if (this.numberFlowCorrections[digit] !== corrections) {
          this.numberFlowCorrections[digit] = corrections
        }
      }
    } else if (this.face === 3) {
      this.secondsAngle = simpleOrbit.update(timestamp)
    }
  }

  updateTheme() {
    this.themeBg = backgrounds[this.theme]
    this.themePanel = panels[this.theme]
    this.themeText = texts[this.theme]
    this.themeDate = dates[this.theme]
  }

  pollClock(timestamp: number): boolean {
    if (timestamp - this.lastSlowTick < 250) {
      return false
    }

    this.lastSlowTick = timestamp
    const date = new Date(Clock.epochMs())

    this.hours = date.getHours()
    this.minutes = date.getMinutes()
    this.seconds = date.getSeconds()
    if (this.hour !== pad(this.hours)) {
      this.oldHour = this.hour
      this.hourAt = timestamp
    }

    if (this.minute !== pad(this.minutes)) {
      this.oldMinute = this.minute
      this.minuteAt = timestamp
    }

    if (this.second !== pad(this.seconds)) {
      this.oldSecond = this.second
      this.secondAt = timestamp
    }

    this.hour = pad(this.hours)
    this.minute = pad(this.minutes)
    this.second = pad(this.seconds)
    this.time = this.hour + ':' + this.minute + ':' + this.second
    this.weekday = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][date.getDay()]
    this.day = pad(date.getDate())
    this.date =
      date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate() + ' ' + this.weekday

    return true
  }

  enter(timestamp: number) {
    this.face = 0
    this.resetWatchFace(timestamp)
  }

  go(direction: number, timestamp: number) {
    this.face = wrap(this.face + direction, 4)
    this.resetWatchFace(timestamp)
  }

  tapScreen() {
    if (this.face === 0) {
      this.classicMode = wrap(this.classicMode + 1, 3)
    } else {
      this.theme = wrap(this.theme + 1, this.face === 2 ? 4 : 10)
    }
  }

  longPress(): boolean {
    if (this.face !== 3) {
      return false
    }

    this.secondDot = !this.secondDot

    return true
  }

  tick(timestamp: number) {
    this.updateTheme()
    this.animateWatchFace(timestamp)
  }
}

export const watchFace = new WatchFaceStore()
