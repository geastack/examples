export function pad2(value: number): string {
  return value < 10 ? '0' + value : '' + value
}

export function pad3(value: number): string {
  if (value < 10) return '00' + value
  if (value < 100) return '0' + value
  return '' + value
}

export function noteLabel(noteNumber: number): string {
  if (noteNumber <= 0) return '#---'
  return '#' + pad3(noteNumber)
}

export function noteId(noteNumber: number): string {
  return 'note-' + pad3(noteNumber)
}

export function noteAudioPath(noteNumber: number): string {
  return '/sdcard/notes/note_' + pad3(noteNumber) + '.wav'
}

export function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds - minutes * 60
  return pad2(minutes) + ':' + pad2(seconds)
}

export function formatRecordingTime(elapsedMs: number): string {
  return formatDuration(elapsedMs)
}

export function formatCreated(createdAtMs: number, nowMs: number): string {
  if (createdAtMs <= 0) return 'No time'
  const ageMs = Math.max(0, nowMs - createdAtMs)
  const minuteMs = 60 * 1000
  const hourMs = 60 * minuteMs
  const dayMs = 24 * hourMs
  if (ageMs < minuteMs) return 'Just now'
  if (ageMs < hourMs) return '' + Math.floor(ageMs / minuteMs) + 'm ago'
  if (ageMs < dayMs) return '' + Math.floor(ageMs / hourMs) + 'h ago'
  return '' + Math.floor(ageMs / dayMs) + 'd ago'
}

export function clipText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return value.substring(0, maxLength)
}

export function plural(count: number, singular: string, pluralValue: string): string {
  return count == 1 ? '1 ' + singular : '' + count + ' ' + pluralValue
}
