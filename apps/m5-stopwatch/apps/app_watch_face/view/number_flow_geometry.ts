// DigitFlow::update() passes the Float32 subtraction to setPos(int32_t).
// A whole-number rail needs per-row corrections to preserve that truncation.
export function factoryDigitFlowCorrectionMask(offset: number): number {
  const value = Math.fround(offset)
  const integer = Math.trunc(value)

  if (value === integer) {
    return 0
  }

  let mask = 0

  for (let row = 0; row < 12; row++) {
    const rowY = row * 60
    const factoryY = Math.trunc(Math.fround(Math.fround(rowY) - value))
    const correction = factoryY - (rowY - integer)

    if (correction < 0) {
      mask |= 1 << row
    } else if (correction > 0) {
      mask |= 1 << (row + 12)
    }
  }

  return mask
}
