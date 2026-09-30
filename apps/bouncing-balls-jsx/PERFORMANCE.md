# Bouncing Balls JSX: 60 FPS regression gate

The benchmark is the existing app: 64 balls, Inter FPS badge, original CSS,
120 FPS requested, vsync off, text raster cache on, 64-row/depth-2 transfers.
The default gate uses inline styles. Source fingerprints prevent quietly simplifying
the workload to pass. Changes to the app require explicit baseline review.

From the examples repository:

```sh
npm run test:balls:gate
npm run test:balls:device
# Experimental shared-style comparison, with the same workload and limits:
npm run test:balls:device -- --shared-styles
```

The first command tests the gate and workload integrity without hardware. It
runs automatically on relevant pushes and pull requests. It is not an FPS result.

The second builds through `gea`, flashes and measures **only** the locally
registered USB AMOLED 2.06 alias `amoled`, serial `80:B5:4E:DA:73:88`. It requires
`GEA_CLI_BIN` pointing at the Geastack CLI `bin/gea.mjs`, `GEA_COMPILER_DIR` pointing
at the current Geastack compiler (its single `dist` build), and the usual CLI
package overrides for any local framework/target experiment. Missing hardware,
build errors, timeouts and missing measurements fail; none becomes a skip/pass.
The app manifest is restored after building. There is no registry publish step.
The experimental flag changes only native style storage. Its memory census
reports node/tree sizes, live style-record payload and heap capacity, and free
PSRAM/internal heap. Compare both variants; a smaller node alone is not a total
allocation saving. Heap capacity excludes allocator metadata, so also compare
free-heap deltas. Set `GEA_UI_LAYOUT_CHECKER` to the UI ELF layout checker and
`GEA_UI_LAYOUT_PYTHON` to a Python with pyelftools to reject inconsistent record
layouts before flashing.

The hardware gate requires:

- 300 warm-up frames, then exactly 3,600 completed frames, including display DMA.
- **At least 60.000 FPS**, calculated from the exact sum of completion intervals.
  A 59.9999 result fails; the gate does not round it up or retry until it passes.
- p99 completion interval ≤19 ms and maximum ≤35 ms. These limits protect the
  restored baseline (18.5 ms p99, 31.865 ms maximum) against renewed cache stalls.
- No watchdog, panic, assertion, heap corruption or brownout reports.

This protects sustained 60 FPS throughput and bounded observed tail latency.
It does **not** claim every frame finishes within 16.67 ms: the restored baseline
itself does not meet that stronger condition. A longer soak remains useful for
rare stalls; one 3,600-frame window cannot prove their permanent absence.

Results, firmware hash and device logs are stored beside the app's firmware in
`.gea/build/esp32-s3-touch-amoled-2.06/app-builds/bouncing-balls-jsx/`:
`fps-regression-result.json` and `fps-regression-device.log`. The result includes
normalized fingerprints of emitted native sources/runtime headers for matching
A/B inputs. A failed attempt cannot leave an older passing report in place. To validate an
existing log (not a new device measurement):

```sh
node scripts/check-bouncing-balls-fps.mjs --log /absolute/path/to/device.log
```

The engine behavior tests live in the core repository at
`packages/core/test/BOUNCING_BALLS_REGRESSIONS.md`. They check retained layout,
integer CSS parsing, bounded leaf translation work, correct clipped DMA replay,
text-cache collisions/pixel parity and renderer feature selection. Targets tests
execute the actual scheduler/DMA code with fake time and semaphore completion.
Those host tests run in their repositories' push/PR workflows. A hosted runner
has no access to this USB board: run the device gate before accepting performance
changes. Remote mandatory hardware CI needs an attached runner; it is not
silently simulated by these workflows.

### Current work: unused variable storage and allocation census (v18)

This batch is **not yet qualified on hardware**. The AMOLED 2.06 and its shared
target dependency directory are reserved by the concurrent Knight task.
No pedal board was touched and no package was published.

The unchanged Bouncing Balls app has no CSS custom properties. Analysis v18
automatically removes their two per-rare-node vectors, dependency records and
lookup cache. Authored definitions, `var()`, unknown names/styles and opaque
native code retain support; older analyzers cannot authorize removal.

An S3 build completed before the reservation was extended. Its twelve emitted
app/runtime files match the saved ownership-baseline build exactly, and the only
feature-definition change is `GEA_CSS_CUSTOM_PROPERTIES=0`.

| Linked measurement          | Ownership baseline | First v18 build |
| --------------------------- | -----------------: | --------------: |
| Node                        |               52 B |            52 B |
| ComputedStyle               |               44 B |            44 B |
| NodeRareData                |               64 B |            40 B |
| Override allocation header  |               12 B |             8 B |
| Variable dependency globals |            7,364 B |           512 B |
| Firmware                    |        1,945,840 B |     1,931,648 B |

This is **6,852 B less fixed dependency storage**, **24 B less per allocated
rare record**, **4 B less per override allocation payload**, and **14,192 B
less firmware**. Allocator rounding and live record counts still require the
device census; these are not fabricated total-heap or FPS measurements.
The baseline includes the newly added allocation diagnostics, so its firmware
size differs from the earlier 1,944,880-byte v17 performance checkpoint.

The subsequent source revision reuses an existing Node alignment byte for the
remaining class-tracking flag in shared mode, removing the separate 512-byte
array. Reads remain direct. Compile-time offsets and node-slot reuse are tested.
The inline control keeps its one-byte-per-node array. Unused custom-property
methods are inline no-ops, avoiding new calls from their empty containers.
**This padding revision has host coverage but has not yet been linked for S3.**

The linked-memory audit also found two unused transformed-gradient SIMD buffers,
2,048 B each. They now follow the existing renderer feature proof; the scalar
fallback remains. A direct native-command comparison covers eight opaque,
translucent, varying-alpha and three-stop gradients: all pixel hashes match
with/without caches and pruned cache symbols are absent. This change also awaits
an S3 build and device qualification. The older broad comparison initially
failed because it expected disabled gradient CSS fields to accept authored
gradients. That contract is now corrected: authored gradients are verified in
the enabled build, and full/bounded/pruned builds compare identical native
commands, shapes, transformed text and geometry. All comparisons pass. The
original failure is retained in `balls-unused-gradient-scratch-regressions.log`;
the corrected checks are in `balls-bounded-circle-regressions.log` and
`renderer-features-css-enabled.log`. Gradient coverage was not removed.

The new read-only, post-frame census covers tree ownership, text pool/pages and
character buffers, rare records/attributes, override blocks and CSS-pixel unit
metadata, and dependency globals. It includes spare capacity and flags opaque
shared/callback owners instead of hiding them. Hardware qualification requires
all five groups and no untracked owners. This expands the previous accounting
scope; old 40,956-byte totals must not be directly subtracted from the new census.

Validation so far: 616 analyzer tests, 31 CLI feature tests and 43 gate tests
pass. Focused native shared-pruned, inline-pruned and enabled-variable cases
pass, including growth through every Property, copy/move/erase, variable
inheritance/mutation/removal/fallback, ordinary class changes, and node reuse.
The Bouncing Balls native pixel hash remains `18157712955437833091`.
These are behavior checks, not new 60 FPS results.

The earlier ownership-baseline device capture timed out in ROM download mode
without a RESULT/OWNED frame sample. Its binary and logs are retained; it has no
valid FPS result. Hardware qualification remains pending, including the full
allocation comparison. Last qualified performance remains the v17 matched pair
below, and the board currently belongs to Knight rather than that restored image.

Artifacts: `balls-206-style-shared52-node-owned-baseline*`,
`balls-206-style-shared52-v18*`, `balls-v18-linked-auxiliary-storage.json`.
First v18 SHA-256:
`411f9afbeb2c3af1a7bebb305813d2dd58ac52054352438db6222fc63c74dc92`.

The circle-cache optimization is now implemented and host-verified. The current
original app source proves radius 8. Its build derives maximum radius 8, even
circle span 16, square-box span 19, and four box-cache slots automatically.
The square bound includes the renderer's `floor(side / 2) - 1` tolerance;
sizes 16 through 19 all retain cache capacity. No application switch is added.
DPR is included, and imperative canvas calls, native drawing, unknown styles,
transforms, effects and unsupported proof versions retain full caches.

| Circle cache layout      |   Before | Candidate |            Saved |
| ------------------------ | -------: | --------: | ---------------: |
| Host `CanvasMath` object | 21,480 B |     768 B | 20,712 B (96.4%) |

The existing v18 S3 ELF also confirms a 21,480-byte baseline object. The new
768-byte value is a compiler-measured **host layout**, not a new S3 RAM/FPS
result. All lookup tables remain static; this saves storage rather than moving
it to heap. Native tests compare identical pixels with full, bounded and absent
caches, including cache-edge sizes, larger fallback shapes, alpha and clipping.
The post-link device gate now rejects a CanvasMath layout larger than 768 B.

Circle-cache checkpoint: 634 analyzer-source tests, 34 CLI feature tests, 44 device-
gate tests, and full/bounded/uncached native renderer comparisons pass. Analyzer
source tests use Node's type stripping without rebuilding shared plugin output
while Knight is active. Normal plugin build and S3 qualification remain pending.
A virtual-file fixture initially missed the CLI's `accessSync` check; its failed
log is retained and the corrected native-source test passes. Pedal lint/frontend
checks pass; the initial formatting failure is retained separately.

Artifacts: `balls-circle-cache-host-layouts.json`,
`balls-circle-cache-original-app-source-proof.json`,
`balls-circle-cache-source-analyzer-tests.log`, `balls-circle-cache-cli-tests.log`,
`balls-circle-cache-gate-tests.log`, `balls-bounded-circle-regressions.log`.

Triangle-occlusion scratch is now independently specialized with a positive
`renderer-occlusion-v1` proof. The original app produces
`GEA_EMBEDDED_RENDERER_TRIANGLE_OCCLUSION=0`. Its saved S3 binary contains exactly
**3,072 B** in `s_occlBits`; that symbol is absent from the new disabled host
build. Source-visible triangle methods, aliases, computed dispatch, opaque
imports/evaluation and all custom native producers retain the accelerator.
Old or unsupported analyzers retain it as well; app flags cannot bypass proof.

The existing painter fallback remains available. Eight native pixel comparisons
cover overlap, clipped edges, degenerate triangles, and both sides of the
48-row/256-column scratch limits. Accelerated and fallback pixels are identical;
the full/bounded/pruned renderer comparison passes. The pre-flash gate requires
a linked symbol census and zero triangle scratch for this app. The original
app's computed flags differ from the first v18 link only in the four circle
bounds and the new triangle-scratch flag.

Latest host validation: **652 analyzer-source tests, 36 CLI feature tests,
45 device-gate tests**, plugin type checking and renderer pixel comparisons pass.
These checks neither build shared plugin output nor flash the reserved board.
The circle and triangle changes remove **23,784 B of host static storage** in
total. The new S3 link, usable-heap census, firmware size and 60 FPS run remain
pending; no new hardware-performance result is claimed.

Image-slot audit: linked S3 `ImageSlot` is 72 B and `ImageStore` is 7,012 B.
Regrouping its existing scalar, pointer and boolean fields is calculated to
make each slot 64 B and the store 6,244 B: **768 B less for 96 slots**, with
all named fields still inline. `image-slot-padding-proposal.diff` is prepared
but **unapplied**, because it changes a shared native ABI while Knight is
building/flashing. It needs linked-layout and image-lifetime/decode validation
after the reservation ends. These calculated bytes are not counted as savings.

Latest artifacts: `balls-triangle-scratch-{source-analyzer,cli,gate}-tests.log`,
`balls-triangle-scratch-plugin-typecheck.log`,
`balls-triangle-scratch-original-app-source-proof.json`,
`balls-triangle-scratch-regressions.log`,
`balls-206-style-shared52-v18-with-render-storage.json`,
`balls-image-slot-padding-audit.json`.

### Latest result: 44-byte styles with automatic default-field pruning

The v17 source analysis removes another ten unused families from the unchanged
Bouncing Balls app: numeric margins, padding, flex factors, gap, border widths,
border colors, font weight, text alignment, white space and text overflow.
Their exact initial values become compile-time constants. This removes **24 B of
fields**, and regrouping the remaining byte fields removes **4 B of padding**:
ComputedStyle is **72 → 44 B (-38.9%)**. No application opt-in or extra field-load
indirection is introduced by this batch. Authored, unknown and native styles
retain the families conservatively.

The final guarded inline/shared pair uses identical twelve emitted app/runtime
fingerprints and identical native feature defines except for the storage switch.
Both pass the unchanged 300-warmup + 3,600-completed-frame gate on USB AMOLED 2.06,
including DMA, with no device faults.

| Metric                                | Pruned inline control | Pruned shared candidate |
| ------------------------------------- | --------------------: | ----------------------: |
| Node                                  |                 104 B |                    52 B |
| ComputedStyle                         |                  44 B |                    44 B |
| Counted persistent tree/style storage |              62,532 B |                40,956 B |
| Counted layout scratch peak           |              63,224 B |                41,648 B |
| Completed FPS                         |  **60.946940 — pass** |    **61.053440 — pass** |
| p99 completion bound                  |              18.25 ms |                18.25 ms |
| Maximum completion interval           |             32.795 ms |               32.737 ms |
| Intervals over 16.667 ms              |           224 / 3,600 |             187 / 3,600 |
| Firmware                              |           1,945,600 B |             1,944,880 B |
| Free PSRAM                            |           7,254,436 B |             7,276,804 B |
| Free internal heap                    |              66,728 B |                66,664 B |

Shared storage saves **21,576 B (34.5%)** against the matched inline control.
Observed throughput is 0.175% higher in this pair; that is no observed loss,
not proof of a statistically stable speedup or a guarantee that every frame
finishes within 16.67 ms. Shared firmware is 720 B smaller.

Compared with the previous v16 shared checkpoint, counted persistent storage
falls **42,868 → 40,956 B (-1,912 B, -4.46%)** and firmware falls
**1,951,584 → 1,944,880 B (-6,704 B)**. The base Node remains **52 B**.
The 68 allocated style records now request 3,808 B and occupy 3,828 usable heap
bytes, plus allocation headers; static style bookkeeping/default storage is
64 B. Removing 28 B from 68 records plus the default saves 1,932 payload/static
bytes, offset by 20 B of measured allocator slack. The inline Node shrinks
132 → 104 B, saving 14,336 B across its 512 slots.

The counted budget retains the previous scope: TreeState, style blocks and
their usable heap/header sizes, cold-layout pages/tables, layout scratch and
bookkeeping. It **does not include unchanged text/rare-data allocations**, the
common tree allocation header, or runtime/render allocations. It is not the
complete UI heap. All 68 live styles remain unique in a 512-slot tree; spare-slot
savings dominate, and dense unique-style trees can cost more. Shared mode stays
experimental/default-off.

Validation: 604 analyzer tests, 30 CLI feature tests and 42 benchmark-gate tests
pass. Focused native tests cover enabled fields/inheritance, pruned storage,
wide and narrowed representations, ownership and retained rendering. The pixel
hash remains `18157712955437833091`. Pruned shared/profiling-off CI now includes
the single-byte-radius layout. Warning checks remain enabled.

A rejected build is retained as
`balls-206-style-shared52-pruned-defaults-current-runtime*`: **59.933806 FPS**,
56-byte Node, 100-byte ComputedStyle and 50,952 counted persistent bytes.
Its configure command lost the v16/v17 field definitions, range bounds and
class/image/input pruning; it is not the 44-byte-style candidate and was not
rounded up or retried unchanged. The corrected configure flags are archived.
The exact reason that analysis output changed during those builds is not
established. A new pre-flash check of the linked layout rejects style, node or
tree sizes above this app's measured ceilings, even when all translation units
agree. Smaller future layouts remain eligible. The regression test includes
the actual rejected 100/56-byte case. This check runs with the linked-layout
validator used for these qualifications.

Earlier build failures (constant-array comparisons, fixed in the engine; and a
compiler runtime string-view mismatch, corrected in the shared runtime without
a compiler edit from this experiment) are also retained. Initial passing runs
used different runtime headers and are not presented as the matched A/B.
The final pair's raw fingerprints and feature defines agree. Cross-checkpoint
FPS changes still cannot be attributed solely to pruning because compiler
inputs differ from v16.

Artifacts are `balls-206-style-{shared52,inline}-pruned-defaults-guarded*`.
Shared SHA-256:
`46843980fe69c3c65199bf6d347d70757cbc320a93adf8396be2fd7f88bb8f3c`.
Inline SHA-256:
`54fbe05fe24a8b46899299181924e1487b48edeb72c3d01d08663e35a689f936`.
The shared image is restored; USB summary reports 68 nodes at 410×502, and
`balls-206-style-shared52-pruned-defaults-guarded-restored.png` shows the original
balls with FPS: 60. Restoration checks are not another qualification sample.
No package publication, push or pedal-board flash was performed.

Work continues beyond the 50-byte milestone. The next audit must include text,
rare-data and override allocations. Remaining candidates include proving unused
percentage representations absent and removing empty rare-data containers.
Narrower text/tag handles could reduce the base node without adding field
indirection, but their range and lifetime bounds are not yet proven or implemented.

### Previous checkpoint: v16 unused common style fields

The v16 whole-source analysis removes nine unused common-style families from
the unchanged Bouncing Balls app: flex direction, justify-content, align-items,
box sizing, auto margins, unitless line height, min height, max width and active
background. Deferred width remains enabled because the app uses `100vw`.
Opaque/native styles retain the fields conservatively. There is no app opt-in,
runtime feature branch, or added field-load indirection from this pruning.

Both fresh USB AMOLED 2.06 builds passed the unchanged 300-warmup +
3,600-completed-frame gate, including DMA. All twelve emitted fingerprints
match between these two builds.

| Metric                                | Pruned inline control | Pruned shared candidate |
| ------------------------------------- | --------------------: | ----------------------: |
| Node                                  |                 132 B |                    52 B |
| ComputedStyle                         |                  72 B |                    72 B |
| Counted persistent tree/style storage |              76,868 B |                42,868 B |
| Counted layout scratch peak           |              77,560 B |                43,560 B |
| Completed FPS                         |  **61.401557 — pass** |    **60.610815 — pass** |
| p99 completion bound                  |              18.25 ms |                18.25 ms |
| Maximum completion interval           |             32.650 ms |               33.814 ms |
| Firmware                              |           1,951,104 B |             1,951,584 B |
| Free PSRAM                            |           7,238,388 B |             7,272,680 B |
| Free internal heap                    |              66,728 B |                66,632 B |

Shared storage saves **34,000 B (44.2%)** against this matched inline control.
Its observed throughput is **1.288% lower** in this pair. Both exceed sustained
60 FPS and satisfy the existing tail limits; neither establishes that every
frame meets 16.67 ms or proves a statistically stable speed difference.

Against the previous shared checkpoint below, ComputedStyle shrinks 88 to 72 B,
counted persistent storage shrinks **43,972 to 42,868 B (-1,104 B)**, and firmware
shrinks **1,954,976 to 1,951,584 B (-3,392 B)**. The storage saving is exactly
16 B across each of 68 live records plus the static default record. The base
Node remains 52 B; external storage savings must not be advertised as a smaller
base node. The inline node shrinks 144 to 132 B, saving 6,144 B in its 512-slot
tree. The latest inline control passes; the older failure below remains recorded.

The shared compiler emitted different type numbering and an added host-audio
runtime helper compared with the preceding checkpoint. Their raw diffs are
saved; no compiler or generated-source edits were made for this batch. The
new inline/shared pair uses matching current output. Before/after FPS changes
across checkpoints are observations, not isolated attribution to CSS pruning.

The budget counts TreeState, style allocations and usable sizes, four-byte
allocation headers, cold-layout pages/tables, and style/layout bookkeeping.
It excludes other unchanged node text/rare-data allocations, common tree
allocation metadata, and runtime/render allocations; free heap is reported
alongside it. It is not the complete application's UI heap. The app still has
68 live nodes in 512 reserved slots and all 68 final styles are unique. Shared
storage remains experimental/default-off because dense unique-style trees can
cost more.

Validation: 568 analyzer tests, 29 CLI feature tests, enabled-field native
behavior, pruned shared/profiling-off behavior, and pruned inline behavior pass.
The retained pixel hash remains `18157712955437833091`. Focused CI now includes
v16 proof cases and both pruned representations. A stale native audio test stub
was adapted to the existing shared-state header without changing production
audio behavior. Linked UI record layouts are consistent in both firmware builds.

Artifacts are `balls-206-style-{shared52,inline}-pruned-base*` in the audit
directory. Shared SHA-256:
`72447bad4b2ea195655e89fc04b20fa712293add5342dac4ae7d300420a774a8`.
Inline SHA-256:
`52eb84f0124177e31a91c3d43a85b21ef118d62865291f5e17d17cb379eb0525`.
The smaller qualified shared image is restored. USB summary confirms 68 nodes
at 410×502, and the saved screenshot shows the original balls and FPS: 60.
See `restore-shared52-pruned-base.log`, its summary log, and
`balls-206-style-shared52-pruned-base-restored.png`. This is restoration
verification, not a second qualification sample. No package publication, push,
or pedal-board flash was performed.

The goal remains to minimize the complete associated allocation beyond a
50-byte base-node milestone. The linked layout exposes four avoidable padding
bytes in each 72-byte style: offsets 2–3, 43 and 71. Reordering existing byte
fields is the next zero-indirection candidate, alongside automatic elimination
of unused numeric margin/padding, flex, gap and border defaults. These next
reductions are not implemented or claimed as measured savings yet.

### Previous matched experiment (2026-09-30)

After automatic class-overflow storage removal and compilation of disabled
profiling writes out of the hot paths, the shared candidate passed the unchanged
gate. The matching default inline control failed. All twelve emitted app/runtime
fingerprints match; original JSX, CSS, font and workload are unchanged.

| Metric                                 |       Inline control |     Shared candidate |
| -------------------------------------- | -------------------: | -------------------: |
| Node                                   |                144 B |                 52 B |
| Counted persistent tree/style storage  |             83,012 B |             43,972 B |
| Counted storage at layout scratch peak |             83,704 B |             44,664 B |
| Completed FPS                          | **59.693220 — fail** | **60.218928 — pass** |
| p99 completion bound                   |             18.50 ms |             18.50 ms |
| Maximum completion interval            |            33.362 ms |            32.286 ms |
| Firmware                               |          1,954,400 B |          1,954,976 B |

The 39,040-byte saving (47.0%) includes external styles, cold pages, table
capacity, bookkeeping and nominal allocator headers, excluding the common tree
header and unrelated runtime allocations. The app has 68 live nodes in 512
reserved slots; all 68 final styles are unique. Most savings come from unused
slots, not deduplication. Dense unique-style workloads can cost more in shared
mode, which remains experimental and disabled by default.

The host profiling-on/off suites preserve the same pixels and geometry. Off-mode
rendering leaves diagnostic backing bytes untouched; S3 assembly has no live
counter references in the eight affected engine files, and the linked 744-byte
discard object is gone. The scheduler timing gate is independent and unchanged.

Passing shared SHA-256:
`97f0238d273af6a8e2cc74815f36199679cb0b4be374a1704437a04f40877efc`.
Failed inline SHA-256:
`0f7f34a35bcec5f9f1926ba515c5c2a28f4f9b4380f7636c5fb85dd504ccefa6`.
Both measurements and binaries are retained in the pedal experiment audit as
`balls-206-style-{shared52,inline}-no-profiling-writes-*`. The passing shared image
is restored on USB AMOLED 2.06. The failed control is not rounded up or retried;
default inline throughput remains unresolved. One pair does not establish a
statistically reliable speed difference or an every-frame 16.67 ms guarantee.

### Earlier memory reductions (2026-09-30)

The current experimental shared build uses a **52-byte Node** and 88-byte
ComputedStyle. Pass-local layout memo entries cover allocated slots only and
are freed before retained rendering (680-byte scratch payload for 68 slots).
Cold available-box/static-anchor state uses stable 16-slot pages, counted with
pointer-table capacity, allocator slack, headers and static bookkeeping. Current
and previous geometry remains inline. Automatic analysis recognizes Display
imports without unnecessarily retaining image/input payloads or unbounded CSS.

The retained update resolves each absolute sibling group's common parent bounds
once per frame. The 64-ball regression requires 1 calculation and 63 reuses;
alternating parents, borders and percentage offsets match full layout. Moving
parent/child, overflow, pixels, memo lifetime and shared ownership also pass.

A fresh control uses identical emitted app/runtime fingerprints and the original
source/CSS/font hashes:

| Metric                       |      Inline |      Shared |
| ---------------------------- | ----------: | ----------: |
| Node                         |       144 B |        52 B |
| Persistent tree/style budget |    84,036 B |    44,996 B |
| Completed FPS                |   60.205064 |   60.109305 |
| p 99 completion bound        |    18.50 ms |    18.50 ms |
| Maximum interval             |   32.174 ms |   32.064 ms |
| Firmware                     | 1,960,944 B | 1,961,296 B |

Both passed 3,600 completed samples after 300 warmup, with no faults. The budget
includes all style/cold-layout allocations, their headers and bookkeeping;
it excludes the common TreeState allocation header and unrelated runtime/render
allocations. The saving is 39,040 bytes (46.5%). This app uses 68 of 512 reserved
slots, with unique live styles: unused-slot savings dominate and must not be
extrapolated to a dense tree of unique styles. The measured FPS delta is -0.159%,
not proof of zero overhead. These are sustained-throughput results, not a
16.67 ms guarantee for every frame.

Shared image SHA-256:
`9b7dfc30556f720e6f2dad6196f32fccd984c13777a23b02bca83571466b8555`.
Inline control:
`922a3d7d76d456c7490f69b198432469d94fa4f0ca54ea539327d80b784228ca`.
The initial 52-byte cold-layout candidate failed at 59.914222 FPS and remains a
failed result; it was not rerun unchanged. All artifacts and the full experiment
history live in the pedal repository's `build/css-feature-audit` and
`docs/SHARED_STYLE_EXPERIMENT.md`. Shared storage remains experimental and
disabled by default; no package release or push was performed.

### Latest host reduction: cache keys, absent buckets and ready masks

The same automatic one-class proof now narrows both private class-rule cache
keys from six atoms to one. Programs with class overflow retain the six-atom
fast key and their existing fallback beyond six classes. No field indirection
or runtime capacity check is added.

With custom properties absent, the active-rule plan also omits its empty custom
buckets and their cached counts/offsets. Pseudo-element ordinary buckets remain
available. Circle-cache readiness masks now use the integer width required by
the proven radius/span, and the four-slot cursor uses one byte.

| Host record              | Before this batch |   After |            Reduction |
| ------------------------ | ----------------: | ------: | -------------------: |
| RuleIndex                |           3,680 B | 3,552 B |          128 B fixed |
| ActiveRulePlanCacheStore |           4,816 B | 4,720 B |           96 B fixed |
| Bounded CanvasMath       |             768 B |   756 B |           12 B fixed |
| ActiveRulePlan           |             264 B |   136 B | 128 B stack per plan |

The fixed-storage reduction is **236 B**. Each spilled candidate cache record
also shrinks 184 to 176 B and each spilled active-plan cache record 598 to 586 B;
actual allocated savings depend on entry counts and allocator rounding. The
full/default circle cache remains 21,480 B. Relative to the original full circle
cache, the bounded object now saves 20,724 B. Together with triangle scratch and
this batch's two style caches, these host static-storage changes total
**24,020 B**; stack savings are not added to that persistent total.

Shared native tests pass with variables enabled/default class storage and with
variables disabled/one-class storage. They cover 32 distinct class keys,
repeated mutation/reuse, candidate and plan spill, six-class cache hits and
seven-class fallback in the default build, and before/after pseudo-elements.
The original Bouncing Balls pixel hash remains `18157712955437833091` in both.
Full/bounded/uncached renderer comparisons also pass. All 45 device-gate tests
pass; the pre-flash circle ceiling is now 756 B. No new FPS result is claimed:
these layouts are compiler-measured on the host, and S3 linking, heap census
and hardware qualification remain pending the board/build reservation.

Artifacts: `balls-style-cache-layouts.json`,
`balls-circle-bookkeeping-host-layouts.json`,
`balls-cache-bookkeeping-{pruned,default,renderer}-regressions.log`,
`balls-cache-bookkeeping-gate-tests.log`.

### Packed circle tables: all cached sizes retained

The circle table rows are now concatenated at their actual heights. Previously,
every radius reserved the maximum height: the default radius table occupied
64 × 127 × 2 bytes, even though radius `r` only reads `2r + 1` rows. Concatenation
places that radius at row `r²`, reducing the table from 16,256 to 8,192 B. The
even-diameter table likewise stores only `2s` rows for half-diameter `s`, starting
at row `s(s - 1)`. Every previous cached size remains cached; no rows move to heap.

| Compiler-measured host object                   | Before this batch |    After |   Saved |
| ----------------------------------------------- | ----------------: | -------: | ------: |
| Full/default CanvasMath                         |          21,480 B | 12,872 B | 8,608 B |
| Automatically bounded Bouncing Balls CanvasMath |             756 B |    468 B |   288 B |

The bounded object is now 21,012 B smaller than the original full cache.
Together with triangle scratch and the earlier rule-key/bucket reductions,
the recent host static-storage reductions total **24,308 B**. These figures
remain separate from node-owned heap and temporary layout/stack measurements.

The per-row renderer and returned span shape are unchanged. Table-start
addressing uses the formulas above instead of a constant row stride. Therefore
unchanged device latency is **not assumed**: S3 link, census and 60 FPS
qualification remain pending the shared board/build reservation.

A new public-API test traverses all radii 1–64 (including the radius-64 fallback)
and all even diameters 2–32. Ascending fills followed by descending warm hits
exercise neighboring packed tables, with opaque/translucent and clipped/full
painting and guarded output buffers. Its hash is `a8fe09c99cdac523`.
All **40 fingerprints match before and after**, and the full/bounded/uncached
renderer comparisons pass. All 45 pre-flash gate tests pass; the circle ceiling
is now 468 B. The first two baseline compilation attempts used unavailable
private/member APIs; both failed logs are retained. The corrected test uses
`fillRoundedRect` and `Display::setAA`; the engine was changed only after that
baseline passed.

The rule-plan capacity audit found 31 captured app registration calls plus
14 separately injected compiler default rules. Some declarations expand into
multiple registration calls, and native/dynamic producers can add others.
The 96-rule cache capacity is unchanged: authored-CSS counting alone is not a
sufficient proof. Image-slot packing remains unapplied while the shared native
ABI is reserved.

Artifacts: `balls-packed-circle-tables-host-layouts.json`,
`balls-packed-circle-tables-baseline-public-api.log`,
`balls-packed-circle-tables-after.log`, `balls-packed-circle-tables-gate-tests.log`,
`balls-rule-plan-capacity-audit.json`. Initial compile failures are retained in
`balls-packed-circle-tables-before.log` and `balls-packed-circle-tables-baseline.log`.

### Automatic storage candidate: automatic percentage-size storage (v19)

The unchanged Bouncing Balls source now proves that width and height never use
percentage values. Both two-byte percentage fields become compile-time unset
constants. Pixel, viewport and font-relative dimensions keep their existing
paths; no field accessor or runtime feature check is added. Unknown values,
functions, variables, logical-axis ambiguity and native controls retain the
necessary fields. Missing, older, mixed or future proof versions cannot remove
them. The application requires no opt-in.

| Compiler-measured host layout    |   Before |    After |   Saved |
| -------------------------------- | -------: | -------: | ------: |
| ComputedStyle                    |     44 B |     40 B |     4 B |
| Inline Node                      |    104 B |    100 B |     4 B |
| Inline TreeState, 512 slots      | 62,520 B | 60,472 B | 2,048 B |
| Shared Node on 64-bit host       |     56 B |     56 B |     0 B |
| SharedStyleRecord on 64-bit host |     64 B |     64 B |     0 B |

The host's eight-byte pointer alignment absorbs the style reduction inside the
shared allocation. Do not claim a shared heap saving from these host numbers.
The last S3 Node remains 52 bytes; this batch has not been linked or measured
there. S3 shared-record size, allocator rounding, firmware size and frame latency
remain pending the shared board/build reservation.

The enabled-percentage control exposed stale absolute geometry: changing a
30-pixel width to 50% correctly updated the style but retained the old layout.
The retained-layout classifier now honors explicit structural invalidation before
taking its position-only path. Pixel-only ball movement still uses retained
layout. The failed control and diagnostic logs are preserved.

Validation: 686 analyzer-source cases, 37 CLI feature cases and 46 pre-flash
gate cases pass. Shared enabled-percentage, shared percentage-free and inline
percentage-free native controls pass, including viewport/em-to-pixel transitions,
percentage-to-pixel transitions and cached class changes. The retained-subtree
control also exits successfully. The Bouncing Balls pixel hash remains
`18157712955437833091`. CI covers v19 proof and both retained/pruned native
representations. These checks do not establish a new 60 FPS result.

Artifacts: `balls-v19-percent-original-app-source-proof.json`,
`balls-v19-percent-host-layouts.json`,
`balls-v19-percent-shared-record-host-layouts.json`,
`balls-v19-percent-{default,shared-pruned,inline-pruned}-fixed-regressions.log`,
`balls-v19-percent-subtree-regressions.log`, `balls-v19-percent-gate-tests.log`.
Initial failures remain in `balls-v19-percent-default-regressions.log` and
`balls-v19-percent-default-diagnostic.log`.

The private line-break cache also drops its unread `scaleQ8` member and its
redundant zero assignment. The saved S3 ELF has 16 entries of 420 bytes, totaling
6,720 bytes. With that four-byte member removed, the expected S3 total is
6,656 bytes (64 fewer); a new S3 link has not verified this prediction. Host
alignment keeps the entry at 424 bytes. All 40 renderer fingerprints match the
preceding cache-packing checkpoint across full, bounded and uncached builds.
No cache slots or supported lines were removed. Evidence is saved in
`balls-line-cache-s3-baseline-layout.json`,
`balls-line-cache-cleanup-comparison.json` and
`balls-line-cache-cleanup-renderer.log`.

### S3 object audit and smaller private caches (2026-09-30)

Standalone S3 compilation now verifies the earlier host predictions without
touching Knight's shared build or USB device. These are compiler record/symbol
measurements, **not a linked firmware, live allocator census or FPS result**.
The saved original Bouncing Balls commands use DPR 1.5 and current v19 feature
proofs. Both UI state initialization modes compile successfully.

| S3 storage | Saved v18 | Current object | Saved |
| ---------- | --------: | -------------: | ----: |
| Circle tables (`CanvasMath`) | 21,480 B | 468 B | 21,012 B |
| Triangle occlusion scratch | 3,072 B | 0 B | 3,072 B |
| CSS rule index | 3,000 B | 2,872 B | 128 B |
| Active-rule plan cache | 4,800 B | 4,704 B | 96 B |
| Text line-break cache | 6,720 B | 6,656 B | 64 B |
| Two dense class-update mark arrays | 2,052 B | 1,026 B | 1,026 B |
| Dynamic length-expression cache | 1,280 B | 1,024 B | 256 B |
| **These fixed objects combined** | **42,404 B** | **16,750 B** | **25,654 B** |

The latest two rows save another **1,282 B**. Length-cache bookkeeping occupies
existing tail padding with `[[no_unique_address]]`; direct member reads and
numeric precision are unchanged. Static-expression entries similarly shrink
12 to 8 B, but vector capacity and allocator savings need a device census.

Class-update marks now store an eight-bit batch epoch instead of sixteen bits.
Node IDs retain their full range; all 512 nodes remain supported. Before an epoch
is reused, the existing rollover path clears the marks. That reset now happens
every 255 batches rather than every 65,535, so its worst-frame cost still needs
hardware qualification. This is not a claim of zero runtime cost.

The S3 shared node remains **52 B**. ComputedStyle is now **40 B**, its shared
allocation record **52 B** (was 56), and the inline node **100 B** (was 104).
Shared TreeState remains 35,896 B; inline TreeState is 60,472 B. The default
shared-style owner record and counters total 60 B rather than 64 B. Per-record
payload changes must not be multiplied into claimed live heap savings before
the allocator census. Gradient storage, class-tracking globals, heap and stack
reductions are excluded from the fixed-object table to keep its scope explicit.

Focused native checks cover 70 dynamic length-cache entries, both axes, parent
resizing, static expressions and variable invalidation. Eight hundred batched
class updates exercise repeated epoch reuse and stale ancestor marks. Removing
the rollover reset deliberately makes the behavioral test fail. Default and
dynamic-initialization/pruned controls pass with the unchanged pixel hash
`18157712955437833091`. All **47** device-gate tests pass; the gate now checks
these private cache symbols as well as Node/TreeState/CanvasMath layouts. Its
symbol census was checked against the saved linked v18 ELF, including exclusion
of separate C++ initialization guards.

Artifacts: `balls-v19-s3-object-{commands,compile-results,layouts}.json`,
`balls-v18-s3-cache-baseline-layouts.json`,
`balls-length-and-epoch-s3-{commands,layouts}.json`,
`balls-length-and-epoch-storage-{default-final,dynamic-init}.log`,
`balls-epoch-rollover-mutation.log`,
`balls-epoch-rollover-rejected-mutant.log`,
`balls-length-and-epoch-gate-tests.log` and
`balls-cache-census-v18-linked-check.json`.

### Pass-local layout memo validity (2026-09-30)

The layout memo already allocates and clears scratch for each pass. Its two
generation tags therefore duplicate the scratch lifetime. Both cache-hit validity
bytes now live in that existing scratch; the persistent record retains only
whether its last available box is valid for scoped layout. No new allocation,
lookup or packed-bit accessor is introduced. The global generation counter and
its periodic whole-tree invalidation scan are removed.

| S3 compiler measurement | Before | After |
| ----------------------- | -----: | ----: |
| Shared persistent layout record | 10 B | 8 B |
| Sixteen-record page | 160 B | 128 B |
| Per-node pass scratch | 10 B | 10 B |
| Global generation counter | 4 B | 0 B |
| Shared Node | 52 B | 52 B |
| Inline Node | 100 B | 100 B |

For the last measured 68-node tree, five pages reserve 80 records. The page
payload falls 800 to 640 B; including the unchanged 32-byte pointer-table capacity
gives **832 to 672 B**. This **160 B payload reduction is a model using the
compiler-verified layout and previous occupancy**, not a new live-heap result.
At full 512-node occupancy the page payload saving is 1,024 B. Scratch size
does not increase, and the four-byte global saving is independently verified.

The zero-size regression deliberately leaves previous geometry at zero, changes
the authored width, and starts a fresh pass. Zeroed scratch must not count as a
cached result just because its dimensions match the old empty box. Replacing the
new pass-local validity check with persistent available-box validity makes that
test fail. Both MRU slots, explicit invalidation, node growth/reuse, scoped-layout
acceptance/rejection, repeated pass allocation and scratch release still pass.
Shared/pruned, inline, and shared dynamic-init/profiling-off controls preserve
pixel hash `18157712955437833091`. All **48** device-gate tests pass. The linked
gate now requires the eight-byte shared layout record, complete allocation
accounting and zero remaining generation-counter storage.

An additional control reproduced a promotion bug in the first candidate: an
out-of-range available box disabled the primary memo, and a later secondary hit
failed to restore persistent validity for scoped layout. Promotion now restores
that validity. The new case passes in both storage modes and with profiling off;
the original failure remains in
`balls-pass-local-memo-promotion-first-control.log`.

These S3 objects compile from current source with the saved original app flags.
They are **not a full firmware link or frame-rate qualification**. Actual heap,
firmware size and latency remain pending access to the AMOLED 2.06. Current and
previous geometry remain inline: their per-frame consumers make them a different
tradeoff from this pass-local memo bookkeeping.

Artifacts: `balls-pass-local-memo-s3-final-{commands,layouts}.json`,
`balls-pass-local-memo-{shared,shared-dynamic-init,inline}-final.log`,
`balls-pass-local-memo-rejected-mutant-final.log`,
`balls-pass-local-memo-inline-mutation-final.log`,
`balls-pass-local-memo-subtree-final.log`,
`balls-pass-local-memo-gate.log` and
`balls-pass-local-memo-v18-linked-check.json`.
