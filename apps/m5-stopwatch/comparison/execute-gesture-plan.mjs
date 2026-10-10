// A normal-HAL backend schedules the entire recipe on the device clock. Serial
// screenshots must not interrupt pointer sampling; read observations afterward.
export async function executeGesturePlan(adapter, plan, caseId) {
  if (adapter.hardwareMuteVerified !== true) {
    throw new Error('A physically muted diagnostic backend is required')
  }

  const recipe = plan.cases.find((entry) => entry.id === caseId)

  if (!recipe) {
    throw new Error(`Unknown gesture case: ${caseId}`)
  }

  const initial = await adapter.prepare(recipe)

  if (initial.route !== recipe.requiredRoute || !initial.stateEvidence) {
    throw new Error('Initial route and selected/scroll state evidence are required')
  }

  // The adapter must retain actual normal-HAL read timestamps, not merely
  // command enqueue times. This prevents transport delays masquerading as parity.
  const observed = await adapter.runScheduled({
    events: recipe.events,
    observeAtMs: recipe.observeAtMs,
    normalHal: true,
  })
  const evidence = observed.samples || []
  const complete = recipe.observeAtMs.every((time) =>
    evidence.some((sample) => sample.requestedAtMs === time && sample.actualAtMs !== undefined),
  )

  return {
    schemaVersion: 1,
    factoryCommit: plan.factoryCommit,
    caseId,
    initial,
    recipe,
    observed,
    normalHalVerified: observed.normalHalVerified === true,
    timingEvidenceComplete: complete,
    comparable:
      observed.normalHalVerified === true && complete && observed.pointerReadTimes?.length > 0,
    interpretation:
      'Compare actual timestamps, initial state and position traces; this receipt alone does not assert parity.',
  }
}

export function normalizePointerTrace(framework, rows, originUs) {
  let pressed = false

  return rows.map((row) => {
    if (!Array.isArray(row) || row.length < (framework === 'factory' ? 4 : 6)) {
      throw new Error('Invalid compact pointer sample')
    }

    const [timestampUs] = row
    let phase
    let touchNum
    let x
    let y

    if (framework === 'factory') {
      ;[, touchNum, x, y] = row
      phase = touchNum ? (pressed ? 'move' : 'down') : 'up'
      pressed = touchNum > 0
    } else if (framework === 'gea') {
      ;[, phase, touchNum, x, y] = row
      phase = { 1: 'down', 2: 'move', 3: 'up' }[phase]
      if (!phase) {
        throw new Error('Unknown Gea pointer phase')
      }
    } else {
      throw new Error(`Unknown pointer framework: ${framework}`)
    }

    return {
      timestampUs,
      relativeUs: timestampUs - originUs,
      phase,
      touchNum,
      x,
      y,
      pointerId: framework === 'gea' ? row[5] : null,
      handlerX: framework === 'gea' ? row[6] : x,
      handlerY: framework === 'gea' ? row[7] : y,
      samplingAuthority:
        framework === 'factory'
          ? 'LVGL indev read callback'
          : 'TouchRuntime consumed dispatch event',
    }
  })
}
