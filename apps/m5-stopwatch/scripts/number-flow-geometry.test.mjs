import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const source = fs.readFileSync(
  new URL('../apps/app_watch_face/view/number_flow_geometry.ts', import.meta.url),
  'utf8',
)
const context = vm.createContext({ exports: {}, Math })

vm.runInContext(
  ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
  context,
)
const correctionMask = context.exports.factoryDigitFlowCorrectionMask
const float = new Float32Array(1)
const f32 = (value) => {
  float[0] = value

  return float[0]
}

const sourcePosition = (row, offset) => Math.trunc(f32(f32(row * 60) - f32(offset))) || 0
const railPosition = (row, offset, mask) =>
  row * 60 - Math.trunc(f32(offset)) - ((mask >>> row) & 1) + ((mask >>> (row + 12)) & 1)

test('rail reproduces factory Float32 subtraction then integer truncation at every row/cell/fraction boundary', () => {
  const fractions = [
    0, 1e-8, 1e-6, 1e-5, 0.25, 0.49999997, 0.5, 0.50000006, 0.75, 0.99999994, 0.99999999,
  ]
  let checked = 0

  for (let integer = -720; integer <= 1440; integer++) {
    for (const fraction of fractions) {
      for (const offset of [integer + fraction, integer - fraction]) {
        const mask = correctionMask(offset)

        for (let row = 0; row < 12; row++) {
          const sourceY = sourcePosition(row, offset)
          const actual = railPosition(row, offset, mask)

          assert.equal(actual, sourceY, `${row};${f32(offset)}`)
          assert.deepEqual(
            [Math.max(0, actual), Math.min(60, actual + 60)],
            [Math.max(0, sourceY), Math.min(60, sourceY + 60)],
          )
          checked++
        }
      }
    }
  }

  assert.equal(checked, 570504)
})

test('fractional offset fixes the prior one-pixel error and retains Float32 rounding at tiny negative offsets', () => {
  const mask = correctionMask(333.5)

  assert.equal(railPosition(6, 333.5, mask), 26)
  assert.equal(6 * 60 - Math.trunc(333.5), 27)
  assert.equal(railPosition(5, 333.5, mask), -33)
  assert.equal(correctionMask(300), 0)
  assert.equal(railPosition(1, 1e-8, correctionMask(1e-8)), 60)
  assert.equal(railPosition(1, -0.99999994, correctionMask(-0.99999994)), 61)
})

test('actual NumberFlow JSX rail, correction classes and clipped row geometry match the source', () => {
  const offsets = [333.5, -0.99999994, 59.75, 659.99994, 0, 600]
  const watch = {
    numberFlowDigits: offsets.map((offset, index) => ({
      x: (index % 2) * 42,
      y: Math.trunc(f32(offset)),
      opacity: 128 / 255,
    })),
    numberFlowCorrections: offsets.map(correctionMask),
    themeBg: '#000000',
    themePanel: '#222222',
    themeText: '#ffffff',
    themeDate: '#eeeeee',
    faceDate: '2026-10-06',
  }
  const jsx = fs.readFileSync(
    new URL('../apps/app_watch_face/view/number_flow.tsx', import.meta.url),
    'utf8',
  )
  const css = fs.readFileSync(
    new URL('../apps/app_watch_face/view/number_flow.css', import.meta.url),
    'utf8',
  )
  const margins = Object.fromEntries(
    ['flow-minus', 'flow-plus'].map((name) => [
      name,
      Number(css.match(new RegExp(`\\.${name}\\s*\\{[^}]*margin-top:\\s*(-?\\d+)px`))[1]),
    ]),
  )
  const output = {}
  const h = (tag, props, ...children) => {
    if (typeof tag === 'function') {
      const component = new tag()

      component.props = props

      return component.template(props)
    }

    return { tag, props, children: children.flat(Infinity) }
  }

  vm.runInNewContext(
    ts.transpileModule(jsx, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.React,
        jsxFactory: 'h',
      },
    }).outputText,
    {
      exports: output,
      h,
      require: (name) =>
        name === '@geastack/core'
          ? { Component: class {} }
          : name.endsWith('/store')
            ? { watchFace: watch }
            : {},
    },
  )
  const tree = new output.NumberFlow().template()
  const columns = []
  const walk = (node) => {
    if (node?.props?.class === 'flow-column') {
      columns.push(node)
    }

    for (const child of node?.children || []) {
      walk(child)
    }
  }

  walk(tree)
  assert.equal(columns.length, 6)
  for (let digit = 0; digit < 6; digit++) {
    const column = columns[digit]
    const rail = column.children[0]

    assert.equal(rail.props.class, 'flow-rail')
    assert.equal(column.props.style.opacity, 128 / 255)
    assert.equal(rail.children.length, 12)
    for (let row = 0; row < 12; row++) {
      const label = rail.children[row]
      const marginClass = label.props.class.split(' ')[1]
      const y = rail.props.style.top + label.props.style.top + (margins[marginClass] || 0)

      assert.equal(y, sourcePosition(row, offsets[digit]))
    }
  }
})
