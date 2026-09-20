import type { PointerEvent } from '@geastack/core'
import { DISPLAY_HEIGHT, DISPLAY_WIDTH, gameViewHeightFor, usesTallControlsLayoutFor } from './runtime'

export class InputState {
  left = false
  right = false
  jump = false
  restart = false

  clear() {
    this.left = false
    this.right = false
    this.jump = false
    this.restart = false
  }

  // Event-driven only — exactly like the web: no device polling.
  // left/right/jump/restart are recomputed whenever a pointer event fires.
  poll() {
    this.left = pointer.left
    this.right = pointer.right
    this.jump = pointer.jump
    this.restart = pointer.restart
  }
}

export type ControlButtonId = 'left' | 'right' | 'jump' | 'restart'

export type ControlButton = {
  id: ControlButtonId
  x: number
  y: number
  w: number
  h: number
}

// This app has NO keyboard input, because the engine cannot express one.
// `eventTypeIndex` (engine/ui/tree_events.cpp) resolves `keydown` and nothing
// else: there is no `keyup` slot on any gea target, the web simulator included
// (it runs this same compiled code against this same engine). `left`/`right`
// are HELD inputs and `jump` is edge-detected off a release, so a keydown with
// no matching keyup sticks the direction on forever after one press. There is
// no honest keyboard here to bind.
//
// What was here instead was `document as unknown as { addEventListener?: (type:
// string, handler: (event: never) => void) => void }` -- the engine's document
// cast to a bag of optional web members, with `(event: never)` making handlers
// of any concrete event type assignable. That is not a description of anything
// that exists: no gea target supplies those members, so the branch never ran,
// and its handler carrier (`(never) -> void`) has no conversion to the concrete
// `(PointerEvent) -> void` the registration actually passes, so emission
// refused the call and the whole app with it.
//
// The on-screen control panel below is the input every gea target really uses,
// and the game draws it on every frame.
const pointer = new InputState()

type PointerContact = {
  pointerId: number
  control: ControlButtonId
  latchedMove: 0 | -1 | 1
}

let pointerContacts: PointerContact[] = []

export function getControlButtons(width = DISPLAY_WIDTH, height = DISPLAY_HEIGHT): ControlButton[] {
  const margin = 10
  const gap = 8
  const buttonH = 66
  const buttonY = usesTallControlsLayoutFor(width, height) ? gameViewHeightFor(width, height) + 12 : height - buttonH - 12
  const moveW = 66
  const jumpW = 112
  const resetW = 80
  const resetH = 30

  return [
    { id: 'left', x: margin, y: buttonY, w: moveW, h: buttonH },
    { id: 'right', x: margin + moveW + gap, y: buttonY, w: moveW, h: buttonH },
    { id: 'jump', x: width - margin - jumpW, y: buttonY, w: jumpW, h: buttonH },
    { id: 'restart', x: width - margin - resetW, y: 44, w: resetW, h: resetH }
  ]
}

function hitControl(x: number, y: number) {
  const controls = getControlButtons()
  for (let i = 0; i < controls.length; i++) {
    const control = controls[i]
    if (x >= control.x && x < control.x + control.w && y >= control.y && y < control.y + control.h) {
      return control.id
    }
  }
  return undefined
}

function applyControl(input: InputState, control: ControlButtonId) {
  if (control === 'left') input.left = true
  else if (control === 'right') input.right = true
  else if (control === 'jump') input.jump = true
  else if (control === 'restart') input.restart = true
}

function syncPointerControls() {
  pointer.clear()
  let jumpMoveLatch = 0
  for (let i = 0; i < pointerContacts.length; i++) {
    const contact = pointerContacts[i]
    applyControl(pointer, contact.control)
    if (contact.control === 'jump' && contact.latchedMove !== 0) jumpMoveLatch = contact.latchedMove
  }
  if (pointer.jump && !pointer.left && !pointer.right && jumpMoveLatch !== 0) {
    if (jumpMoveLatch < 0) pointer.left = true
    if (jumpMoveLatch > 0) pointer.right = true
  }
}

function findPointerContact(pointerId: number) {
  for (let i = 0; i < pointerContacts.length; i++) {
    if (pointerContacts[i].pointerId === pointerId) return i
  }
  return -1
}

function removePointerContactAt(removeIndex: number) {
  const nextContacts: PointerContact[] = []
  for (let i = 0; i < pointerContacts.length; i++) {
    if (i !== removeIndex) nextContacts.push(pointerContacts[i])
  }
  pointerContacts = nextContacts
}

function setPointerContact(pointerId: number, control: ControlButtonId | '') {
  const index = findPointerContact(pointerId)
  if (control === '') {
    if (index >= 0) removePointerContactAt(index)
    syncPointerControls()
    return
  }
  const latchedMove = control === 'left' ? -1 : control === 'right' ? 1 : 0
  if (index >= 0) {
    pointerContacts[index].control = control
    if (latchedMove !== 0) pointerContacts[index].latchedMove = latchedMove
  } else {
    pointerContacts.push({ pointerId, control, latchedMove })
  }
  syncPointerControls()
}

function pointerIdForEvent(event: PointerEvent) {
  return Math.floor(event.pointerId)
}

function updatePointer(event: PointerEvent, down: boolean) {
  // Coordinates are used as they arrive, with no bounding-rect scaling. On gea
  // there is nothing to scale by: pointer coordinates are already in display
  // space. The rect probe this used to carry only means something for a canvas
  // in a real DOM, and it was read off a structural stand-in for an element
  // that no gea target ever supplies -- `event.target` cannot serve instead,
  // because it is a native handle (a node id in the engine's tree), not a bag
  // of fields, and there is no conversion between the two.
  if (!down) {
    setPointerContact(pointerIdForEvent(event), '')
    return
  }

  const x = Math.floor(event.clientX)
  const y = Math.floor(event.clientY)
  setPointerContact(pointerIdForEvent(event), hitControl(x, y) || '')
  event.preventDefault()
}

type PointerHandlers = {
  down: (event: PointerEvent) => void
  move: (event: PointerEvent) => void
  up: (event: PointerEvent) => void
}

function pointerHandlers(input: InputState): PointerHandlers {
  return {
    down: (event: PointerEvent) => {
      updatePointer(event, true)
      input.poll()
    },
    move: (event: PointerEvent) => {
      if (findPointerContact(pointerIdForEvent(event)) < 0) return
      updatePointer(event, true)
      input.poll()
    },
    up: (event: PointerEvent) => {
      updatePointer(event, false)
      input.poll()
    }
  }
}

/**
 * Binds the pointer trio to `document.body`.
 *
 * These are real engine events: `pointerdown`/`pointermove`/`pointerup` share
 * the slots of their `touch*` siblings (`eventTypeIndex`,
 * engine/ui/tree_events.cpp), so one handler serves a browser's pointer event
 * in the web simulator and the device controller's synthesized touch alike.
 *
 * There is no `webSource` parameter and no DOM branch. See the note above
 * `pointer`: the alternative source was a cast of the engine's own document to
 * a record of optional web members that no target supplies, so it bound
 * nothing, and its `(event: never) => void` handler type had no conversion to
 * the concrete handlers it was handed -- which is what refused this app.
 */
export function bindInput(): InputState {
  const input = new InputState()
  const handlers = pointerHandlers(input)

  const body = document.body
  body.addEventListener('pointerdown', handlers.down)
  body.addEventListener('pointermove', handlers.move)
  body.addEventListener('pointerup', handlers.up)

  return input
}
