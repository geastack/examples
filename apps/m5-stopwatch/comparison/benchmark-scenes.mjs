export const benchmarkScenes = [
  {
    id: 'menu-idle',
    menuIndex: 0,
    expectedClass: 'menu-title',
    input: 'stationary board; idle launcher',
  },
  {
    id: 'classic-active',
    menuIndex: 1,
    expectedClass: 'hour-hand',
    input: 'ordinary clock movement',
  },
  {
    id: 'number-flow-active',
    menuIndex: 1,
    faceSteps: 1,
    expectedClass: 'number-face',
    input: 'ordinary one-second digit changes',
  },
  {
    id: 'imu-stationary',
    menuIndex: 4,
    expectedClass: 'imu',
    input: 'stationary board; ambient sensor noise',
  },
  {
    id: 'fft-passive',
    menuIndex: 5,
    expectedClass: 'fft',
    input: 'passive microphone; no generated speaker stimulus',
  },
  {
    id: 'stopwatch-running',
    menuIndex: 2,
    startStopwatch: true,
    expectedClass: 'stopwatch',
    input: 'ordinary running stopwatch; no laps',
  },
  {
    id: 'wheel-idle',
    menuIndex: 6,
    acceptWheel: true,
    optional: true,
    expectedClass: 'wheel',
    input: 'two-sector wheel at rest',
  },
]

export function selectScenes(names, includeWheel = false) {
  const selected = names
    ? names.split(',').map((name) => {
        const scene = benchmarkScenes.find((value) => value.id === name)

        if (!scene) {
          throw new Error(`Unknown benchmark scene: ${name}`)
        }

        return scene
      })
    : benchmarkScenes.filter((scene) => !scene.optional || includeWheel)

  if (!selected.length || new Set(selected.map((scene) => scene.id)).size !== selected.length) {
    throw new Error('Select at least one scene, without duplicates')
  }

  return selected
}

// Each scene starts after a fresh native reboot: LauncherStore initializes menu 0.
// Only real application keys/taps are used; no benchmark-only app state exists.
export async function enterScene(scene, actions) {
  await actions.key(27)
  for (let index = 0; index < scene.menuIndex; index++) {
    await actions.key(39)
  }

  if (scene.id !== 'menu-idle') {
    await actions.tap(233, 220)
  }

  for (let index = 0; index < (scene.faceSteps || 0); index++) {
    await actions.key(39)
  }

  if (scene.startStopwatch) {
    await actions.tap(315, 85)
  }

  if (scene.acceptWheel) {
    await actions.tap(233, 390)
  }
}
