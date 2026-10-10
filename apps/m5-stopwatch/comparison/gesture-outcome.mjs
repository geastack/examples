export function addedAlarmLabels(before, after) {
  const remaining = [...before]
  const added = []

  for (const text of after) {
    const index = remaining.indexOf(text)

    if (index >= 0) {
      remaining.splice(index, 1)
    } else {
      added.push(text)
    }
  }

  return { added, removed: remaining }
}
