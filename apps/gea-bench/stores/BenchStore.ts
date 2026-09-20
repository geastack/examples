import { Profiler, Store } from '@geastack/core'

// On-device benchmark: the gea C++ runtime (geatsc-compiled TypeScript) vs
// hand-written native C++ (native/native_bench.cpp, JSON via yyjson), run on
// the same board with the same high-resolution clock. Each row
// is one workload from the canonical comparison suite in
// packages/geatsc/bench/comparison/fixtures — same algorithm, but with sizes
// scaled down for the ESP32 (the host fixtures run 100M iterations and allocate
// tens of MB, which the device can't do). The native baselines mirror
// generated-output/native-cpp/src/<name>.cpp. A module rAF loop (index.tsx)
// runs one workload per frame so the scroll view fills progressively and no
// single workload trips the task watchdog.

declare const nativeBench: {
  loopOverhead(n: int): number
  arrayRead(n: number): number
  arrayWrite(n: number): number
  closure(n: number): number
  methodCalls(n: number): number
  mathIntensive(n: number): number
  modulo(n: number): number
  factorial(n: number): number
  fibonacci(n: number): number
  nestedLoops(n: number): number
  matrixMultiply(n: number): number
  mandelbrot(n: number): number
  binaryTrees(n: number): number
  primeSieve(n: number): number
  stringConcat(n: number): number
  objectCreate(n: number): number
  jsonStringify(count: number, reps: number): number
  jsonParse(count: number, reps: number): number
  ttfColdGlyph(sizePx: number, reps: number): number
  ttfColdRun(sizePx: number, reps: number): number
  ttfCachedRun(sizePx: number, reps: number): number
}

type Item = { id: number; name: string; score: number }

export interface Row {
  name: string
  gea: number
  native: number
}

// ---- gea fixtures (mirrors of bench/comparison/fixtures/*.ts) --------------

function loopOverhead(n: int): number {
  let total: int = 0 as int
  for (let i: int = 0 as int; i < n; i++) total = (total + 1) as int
  return total
}

function arrayRead(n: int): number {
  const data: int[] = []
  for (let i = 0; i < n; i++) data.push(i as int)
  let total: int = 0 as int
  for (let i = 0; i < n; i++) total = (total + data[i]) as int
  return total % 1000000000
}

function arrayWrite(n: int): number {
  const data: int[] = []
  // Plain for-init counter: `(i*2+1) % 1000000` lowers to the i64 modulo because
  // the emitter proves `i*2+1 >= 0` (loop counter from 0, only ++), and the
  // for-init form keeps the array-push auto-reserve. (The second loop's counter
  // is `k`, not `i`, so the non-negativity proof sees a single `i` declaration.)
  for (let i = 0; i < n; i++) data.push(((i * 2 + 1) % 1000000) as int)
  let checksum: int = 0 as int
  for (let k = 0; k < n; k += 1024) checksum = (checksum + data[k]) as int
  return checksum % 1000000000
}

function makeAdder(base: int): (x: int) => int {
  return (x: int) => (base + x) as int
}
function closure(n: number): number {
  let total: int = 0 as int
  for (let i: int = 0 as int; i < n; i++) {
    const add = makeAdder(i)
    total = (total + add(i)) as int
  }
  return total % 1000000000
}

class Counter {
  value: int = 0 as int
  tick(n: int): int {
    this.value = ((this.value + n) % 1000000000) as int
    return this.value
  }
}
function methodCalls(n: number): number {
  const c = new Counter()
  let total: int = 0 as int
  for (let i = 0; i < n; i++) total = ((total + c.tick(i as int)) % 1000000000) as int
  return total
}

function mathIntensive(n: number): number {
  let total = 0
  for (let i = 1; i <= n; i++) total += 1 / i
  return Math.floor(Math.abs(total) * 1000000) % 1000000000
}

function modulo(n: number): number {
  let h = 0
  for (let i = 0; i < n; i++) h = (h + i * 3 + 1) % 1000000007
  return h
}

function factorial(n: int): int {
  const MOD: int = 1000000007 as int
  let acc: int = 1 as int
  for (let i: int = 1 as int; i <= n; i++) acc = ((acc * i) % MOD) as int
  return acc
}

function fib(n: int): int {
  if (n < 2) return n
  return (fib((n - 1) as int) + fib((n - 2) as int)) as int
}
function fibonacci(depth: int): int {
  return (fib(depth) % 1000000000) as int
}

// nested_loops / matrix_multiply use FLAT number[] (i*N+j) rather than the
// fixtures' number[][]: a nested array boxes to gea_cpp_value on this path
// (each `grid[i][j]` goes through gea_cpp_value::operator[], ~100x slower —
// it tripped the task watchdog). A single-level typed vector stays native.
function nestedLoops(N: int): number {
  const grid: int[] = []
  for (let i: int = 0 as int; i < N; i++) {
    for (let j: int = 0 as int; j < N; j++) grid.push(((i * 17 + j * 31) & 0xff) as int)
  }
  let total: int = 0 as int
  for (let i: int = 0 as int; i < N; i++) {
    for (let j: int = 0 as int; j < N; j++) total = (total + grid[i * N + j]) as int
  }
  return total % 1000000000
}

function matrixMultiply(N: int): number {
  const a: number[] = []
  const b: number[] = []
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      a.push(((i * 1103515245 + j * 12345) & 0x7fffffff) / 2147483647)
      b.push(((i * 134775813 + j * 1) & 0x7fffffff) / 2147483647)
    }
  }
  const c: number[] = []
  for (let i = 0; i < N * N; i++) c.push(0)
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < N; k++) {
      const aik = a[i * N + k]
      for (let j = 0; j < N; j++) c[i * N + j] += aik * b[k * N + j]
    }
  }
  let checksum = 0
  for (let i = 0; i < N; i++) checksum += c[i * N + i]
  return Math.floor(Math.abs(checksum) * 1000) % 1000000000
}

function mandelbrot(DIM: number): number {
  const MAX_ITER = 100
  let escapeSum = 0
  for (let py = 0; py < DIM; py++) {
    for (let px = 0; px < DIM; px++) {
      const y0 = (py / DIM) * 2 - 1
      const x0 = (px / DIM) * 3 - 2
      let x = 0
      let y = 0
      let it = 0
      while (x * x + y * y <= 4 && it < MAX_ITER) {
        const xt = x * x - y * y + x0
        y = 2 * x * y + y0
        x = xt
        it++
      }
      escapeSum += it
    }
  }
  return Math.floor(Math.abs(escapeSum) % 1000000000)
}

// NOTE: binary_trees is omitted on-device — its sumTree(node: TreeNode | null)
// recursion currently boxes the nullable refcounted TreeNode to gea_cpp_value,
// which won't bind to the emitted `const TreeNode&` param (a separate gea
// nullable-refcount-class lowering bug to fix). Every other fixture is here.

function primeSieve(limit: int): number {
  const sieve: int[] = []
  for (let i = 0; i <= limit; i++) sieve.push(1 as int)
  sieve[0] = 0 as int
  sieve[1] = 0 as int
  for (let i = 2; i * i <= limit; i++) {
    if (sieve[i] !== 0) {
      for (let j = i * i; j <= limit; j += i) sieve[j] = 0 as int
    }
  }
  let count = 0
  for (let i = 2; i <= limit; i++) if (sieve[i] !== 0) count++
  return count % 1000000000
}

function stringConcat(n: int): number {
  let s = ''
  for (let i = 0; i < n; i++) s += 'a'
  return s.length
}

type Point = { x: int; y: int; z: int }
// `n: int` (not number) so the per-iteration `i < n` loop test is an integer
// compare. With `n: number` it was a soft-double compare (no double FPU on S3 →
// ~50cyc/iter wasted), mirroring native's `const long long ni = (long long)n`.
function objectCreate(n: int): number {
  const ring: Point[] = []
  for (let k = 0; k < 256; k++) ring.push({ x: 0 as int, y: 0 as int, z: 0 as int })
  let total: int = 0 as int
  // `i` is a statement-level `let i: int` (not the for-init) so the restored
  // `/** @type {int} */` is honored by TS → `i % ring.length` lowers to the i64
  // modulo (ring.length is now an integer leaf) while keeping the fast native
  // store. A for-init `let i: int` would NOT be honored (stays soft-double).
  let i: int = 0 as int
  for (; i < n; i++) {
    ring[i % ring.length] = { x: ((i + total) % 100000) as int, y: (i * 2) as int, z: (i * 3) as int }
    const o = ring[(i * 31 + 7) % ring.length]
    total = ((total + o.x + o.y + o.z) % 1000000000) as int
  }
  return total
}

function buildItems(count: number): Item[] {
  const items: Item[] = []
  for (let i = 0; i < count; i++) items.push({ id: i, name: `item-${i}`, score: (i * 7919) % 1000 })
  return items
}
function benchStringify(items: Item[], reps: number): number {
  let total = 0
  for (let r = 0; r < reps; r++) {
    const text = JSON.stringify(items)
    total = (total + text.length) % 1000000000
  }
  return total
}
function benchParse(text: string, reps: number): number {
  let total = 0
  for (let r = 0; r < reps; r++) {
    const parsed = JSON.parse(text) as Item[]
    total = (total + parsed.length + parsed[r % parsed.length].score) % 1000000000
  }
  return total
}

// Smoke-sized on-device suite: keep every fixture represented, but make each
// row short enough that the RP2350 visibly advances through the whole table.
const SIZES = {
  loop: 250000,
  arrayRead: 5000,
  arrayWrite: 5000,
  closure: 5000,
  method: 10000,
  math: 10000,
  modulo: 5000,
  factorial: 10000,
  fib: 20,
  nested: 32,
  matrix: 16,
  mandel: 32,
  trees: 10,
  sieve: 1000,
  strcat: 500,
  object: 2000
}
const ITEM_COUNT = 20
const JSON_REPS = 1
const ROW_COUNT = 24

class BenchStore extends Store {
  rows: Row[] = []
  status = 'starting…'
  ready = false
  idx: int = 0 as int
  items: Item[] = []
  itemsText = ''
  sink = 0

  // Workload runtime in ms, via the microsecond timer. Each result is folded
  // into `this.sink` so the optimizer can't dead-strip the call.
  time(run: () => number): number {
    let bestUs = -1
    let acc = 0
    for (let r = 0; r < 1; r++) {
      const t0 = Profiler.nowUs()
      const v = run()
      const dt = Profiler.nowUs() - t0
      acc = acc + v
      if (bestUs < 0 || dt < bestUs) bestUs = dt
    }
    this.sink = (this.sink + acc) % 1000000000
    return bestUs / 1000
  }

  runOne(i: int): Row {
    if (i === 0)
      return {
        name: 'loop_overhead',
        gea: this.time(() => loopOverhead(SIZES.loop as int)),
        native: this.time(() => nativeBench.loopOverhead(SIZES.loop as int))
      }
    if (i === 1)
      return {
        name: 'array_read',
        gea: this.time(() => arrayRead(SIZES.arrayRead as int)),
        native: this.time(() => nativeBench.arrayRead(SIZES.arrayRead as int))
      }
    if (i === 2)
      return {
        name: 'array_write',
        gea: this.time(() => arrayWrite(SIZES.arrayWrite as int)),
        native: this.time(() => nativeBench.arrayWrite(SIZES.arrayWrite as int))
      }
    if (i === 3)
      return {
        name: 'closure',
        gea: this.time(() => closure(SIZES.closure)),
        native: this.time(() => nativeBench.closure(SIZES.closure))
      }
    if (i === 4)
      return {
        name: 'method_calls',
        gea: this.time(() => methodCalls(SIZES.method)),
        native: this.time(() => nativeBench.methodCalls(SIZES.method))
      }
    if (i === 5)
      return {
        name: 'math_intensive',
        gea: this.time(() => mathIntensive(SIZES.math)),
        native: this.time(() => nativeBench.mathIntensive(SIZES.math))
      }
    if (i === 6)
      return {
        name: 'modulo',
        gea: this.time(() => modulo(SIZES.modulo)),
        native: this.time(() => nativeBench.modulo(SIZES.modulo))
      }
    if (i === 7)
      return {
        name: 'factorial',
        gea: this.time(() => factorial(SIZES.factorial as int)),
        native: this.time(() => nativeBench.factorial(SIZES.factorial))
      }
    if (i === 8)
      return {
        name: 'fibonacci(20)',
        gea: this.time(() => fibonacci(SIZES.fib as int)),
        native: this.time(() => nativeBench.fibonacci(SIZES.fib))
      }
    if (i === 9)
      return {
        name: 'nested_loops 32^2',
        gea: this.time(() => nestedLoops(SIZES.nested as int)),
        native: this.time(() => nativeBench.nestedLoops(SIZES.nested))
      }
    if (i === 10)
      return {
        name: 'matrix_mul 16^3',
        gea: this.time(() => matrixMultiply(SIZES.matrix as int)),
        native: this.time(() => nativeBench.matrixMultiply(SIZES.matrix))
      }
    if (i === 11)
      return {
        name: 'mandelbrot 32^2',
        gea: this.time(() => mandelbrot(SIZES.mandel)),
        native: this.time(() => nativeBench.mandelbrot(SIZES.mandel))
      }
    if (i === 12)
      return {
        name: 'prime_sieve 1k',
        gea: this.time(() => primeSieve(SIZES.sieve as int)),
        native: this.time(() => nativeBench.primeSieve(SIZES.sieve as int))
      }
    if (i === 13)
      return {
        name: 'string_concat 500',
        gea: this.time(() => stringConcat(SIZES.strcat as int)),
        native: this.time(() => nativeBench.stringConcat(SIZES.strcat as int))
      }
    if (i === 14)
      return {
        name: 'object_create 2k',
        gea: this.time(() => objectCreate(SIZES.object as int)),
        native: this.time(() => nativeBench.objectCreate(SIZES.object))
      }
    if (i === 15)
      return {
        name: 'json_stringify 20x1',
        gea: this.time(() => benchStringify(this.items, JSON_REPS)),
        native: this.time(() => nativeBench.jsonStringify(ITEM_COUNT, JSON_REPS))
      }
    if (i === 16)
      return {
      name: 'json_parse 20x1',
      gea: this.time(() => benchParse(this.itemsText, JSON_REPS)),
      native: this.time(() => nativeBench.jsonParse(ITEM_COUNT, JSON_REPS))
    }
    if (i === 17)
      return {
        name: 'ttf glyph 27px x8',
        gea: -1,
        native: this.time(() => nativeBench.ttfColdGlyph(27, 8))
      }
    if (i === 18)
      return {
        name: 'ttf glyph 48px x4',
        gea: -1,
        native: this.time(() => nativeBench.ttfColdGlyph(48, 4))
      }
    if (i === 19)
      return {
        name: 'ttf glyph 81px x2',
        gea: -1,
        native: this.time(() => nativeBench.ttfColdGlyph(81, 2))
      }
    if (i === 20)
      return {
        name: 'ttf run cold 48px',
        gea: -1,
        native: this.time(() => nativeBench.ttfColdRun(48, 1))
      }
    if (i === 21)
      return {
        name: 'ttf run cold 81px',
        gea: -1,
        native: this.time(() => nativeBench.ttfColdRun(81, 1))
      }
    if (i === 22)
      return {
        name: 'ttf run cached 48px x50',
        gea: -1,
        native: this.time(() => nativeBench.ttfCachedRun(48, 50))
      }
    return {
      name: 'ttf run cached 81px x20',
      gea: -1,
      native: this.time(() => nativeBench.ttfCachedRun(81, 20))
    }
  }

  runNext() {
    if (this.idx >= ROW_COUNT) {
      this.status = 'done'
      return
    }
    if (!this.ready) {
      this.items = buildItems(ITEM_COUNT)
      this.itemsText = JSON.stringify(this.items)
      this.ready = true
      this.status = `running ${this.idx}/${ROW_COUNT}`
      return
    }
    const row = this.runOne(this.idx)
    console.log(`bench ${row.name} gea=${row.gea} native=${row.native}`)
    this.rows.push(row)
    this.rows = this.rows
    this.idx = (this.idx + 1) as int
    this.status = this.idx >= ROW_COUNT ? 'done' : `running ${this.idx}/${ROW_COUNT}`
  }
}

export const bench = new BenchStore()
