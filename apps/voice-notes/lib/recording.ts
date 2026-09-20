import { Clock } from '@geastack/core'
import { noteAudioPath, noteId } from '../shared/noteText'
import { TAG_NOTE } from '../shared/tags'
import type { VoiceNote } from '../shared/notes'

export interface RecorderSession {
  noteNumber: number
  startedAtMs: number
  createdAtMs: number
  audioPath: string
}

let activeStream = new MediaStream()
let activeRecorder = new MediaRecorder(activeStream)
let streamActive = 0
let recorderActive = 0
let recordedAudioPath = ''

function wallClockMs(): number {
  const epochMs = Clock.epochMs()
  if (epochMs > 1600000000000) return epochMs
  return Date.now()
}

export async function startRecordingSession(noteNumber: number): Promise<RecorderSession> {
  const session = {
    noteNumber,
    startedAtMs: Date.now(),
    createdAtMs: wallClockMs(),
    audioPath: noteAudioPath(noteNumber)
  }
  recordedAudioPath = session.audioPath
  activeStream = await navigator.mediaDevices.getUserMedia({ audio: true })
  activeRecorder = new MediaRecorder(activeStream, { mimeType: 'audio/wav', path: session.audioPath })
  streamActive = 1
  recorderActive = 1
  activeRecorder.ondataavailable = (event: MediaRecorderDataAvailableEvent) => {
    if (event.data.path.length > 0) recordedAudioPath = event.data.path
  }
  activeRecorder.start()
  return session
}

function stopTracks() {
  if (!streamActive) return
  const tracks = activeStream.getTracks()
  for (let i = 0; i < tracks.length; i++) tracks[i].stop()
  streamActive = 0
}

export function cancelRecordingSession() {
  if (recorderActive && activeRecorder.state == 'recording') activeRecorder.stop()
  recorderActive = 0
  stopTracks()
  recordedAudioPath = ''
}

export function recordingElapsed(session: RecorderSession): number {
  if (session.startedAtMs <= 0) return 0
  return Math.max(0, Date.now() - session.startedAtMs)
}

export function finishRecordingSession(session: RecorderSession): VoiceNote {
  if (recorderActive && activeRecorder.state == 'recording') activeRecorder.stop()
  recorderActive = 0
  stopTracks()
  const durationMs = Math.max(1000, recordingElapsed(session))
  const audioPath = recordedAudioPath.length > 0 ? recordedAudioPath : session.audioPath
  recordedAudioPath = ''
  return {
    id: noteId(session.noteNumber),
    number: session.noteNumber,
    tagId: TAG_NOTE,
    createdAtMs: session.createdAtMs,
    durationMs,
    transcript: '',
    audioPath,
    pending: 1
  }
}
