// fetchAsync / fetchReady / fetchResult / fetchRelease / fetchUploadFileAsync are
// ambient globals (declared in gea-embedded's `declare global`), like browser
// `fetch` — not module exports, so they are used bare (only readFileRange is imported).
import { readFileRange } from '@geastack/core'
import { noteIsPending } from '../shared/noteQueries'
import { noteAudioPath } from '../shared/noteText'
import type { VoiceNote } from '../shared/notes'

// Transcription runs through Soniox's async file API (api.soniox.com). Unlike
// OpenAI Whisper's single multipart POST (capped at 25 MB), Soniox is a 4-step
// pipeline with no such size ceiling, so long recordings transcribe too:
//   1. POST /v1/files            (multipart, field "file")        -> { id }       file id
//   2. POST /v1/transcriptions   ({ file_id, model })             -> { id }       job id
//   3. GET  /v1/transcriptions/{id}                               -> { status }   poll until "completed"
//   4. GET  /v1/transcriptions/{id}/transcript                    -> { tokens:[{text}] }
// The WAV still streams off disk into step 1 (never loaded into RAM).
const SONIOX_HOST = 'https://api.soniox.com'
const SONIOX_MODEL = 'stt-async-v5'
const TRANSCRIPTION_API_KEY = 'voice_notes_soniox_api_key'
const TRANSCRIPTION_MODEL = 'voice_notes_transcription_model'
const MULTIPART_BOUNDARY = '----GeaVoiceNotesBoundary'
// Poll every ~8 s while the job processes. Each poll opens a fresh TLS
// connection (Connection: close), so a tight 1.5 s interval churned ~40
// short-lived sockets/minute and exhausted LWIP's TCP PCB pool — the next
// connect then failed ("upload HTTP -12"). Soniox takes minutes on a long
// note, so 8 s is plenty and keeps TIME_WAIT sockets well under the pool.
const POLL_INTERVAL_MS = 8000

// Pipeline phases for the single in-flight transcription (Sync processes one
// note at a time, so a module-level pipeline is enough).
const PH_IDLE = 0
const PH_UPLOAD = 1
const PH_CREATE = 2
const PH_POLL = 3
const PH_TRANSCRIPT = 4
const PH_DONE = 5
const PH_ERROR = 6

let pipePhase = PH_IDLE
let pipeFetch = 0 // in-flight fetch job id (0 = none in flight)
let pipeFileId = ''
let pipeTransId = ''
let pipeText = ''
let pipeNextPollMs = 0
// Why the last pipeline run failed (step + HTTP status). Survives resetPipeline()
// so Sync can show it after pollTranscriptionJob; cleared on the next start.
let pipeError = ''
let pipeWavPath = '' // the note's WAV path for the in-flight upload

export interface TranscriptionSummary {
  total: number
  pending: number
}

interface SonioxToken {
  text?: string
  start_ms?: number
  end_ms?: number
  confidence?: number
}

// Shape of the Soniox JSON responses we read: /v1/files + create return `id`,
// poll returns `status` (+ `error_message`), and the transcript returns `tokens`.
interface SonioxResponse {
  id?: string
  status?: string
  error_message?: string
  tokens?: SonioxToken[]
}

export function configureTranscriptionApiKey(apiKey: string) {
  localStorage.setItem(TRANSCRIPTION_API_KEY, apiKey)
}

export function configureTranscriptionModel(model: string) {
  localStorage.setItem(TRANSCRIPTION_MODEL, model.length > 0 ? model : SONIOX_MODEL)
}

export function transcriptionApiKey(): string {
  return localStorage.getItem(TRANSCRIPTION_API_KEY)
}

export function transcriptionModel(): string {
  const model = localStorage.getItem(TRANSCRIPTION_MODEL)
  return model.length > 0 ? model : SONIOX_MODEL
}

export function noteTranscriptionPath(note: VoiceNote): string {
  return note.audioPath.length > 0 ? note.audioPath : noteAudioPath(note.number)
}

export function transcriptionSummary(notes: VoiceNote[]): TranscriptionSummary {
  let pending = 0
  for (let i = 0; i < notes.length; i++) {
    if (noteIsPending(notes[i])) pending = pending + 1
  }
  return {
    total: notes.length,
    pending
  }
}

// --- tiny JSON field readers (the id/status responses are small + flat; the
// transcript is parsed by concatenating every token's "text") ---

// Read a top-level string field from a Soniox JSON response via JSON.parse.
// Returns '' if the body doesn't parse or the field is absent/non-string.
function jsonStringField(raw: string, key: string): string {
  try {
    const r = JSON.parse(raw) as SonioxResponse
    if (key == 'id') return r.id ? r.id : ''
    if (key == 'status') return r.status ? r.status : ''
    if (key == 'error_message') return r.error_message ? r.error_message : ''
    return ''
  } catch {
    return ''
  }
}

// Rebuild the transcript by concatenating every token's text via JSON.parse
// (Soniox returns one token per word/sub-word, each carrying its own spacing).
function joinTokenText(raw: string): string {
  try {
    // Parse the FULL Soniox JSON and concatenate every token's text. A 20-min
    // note is ~1700 token records (each text + start_ms/end_ms/confidence); the
    // typed JSON decoder materializes the whole tokens[] array, then we join.
    const r = JSON.parse(raw) as SonioxResponse
    const tokens = r.tokens ? r.tokens : []
    let out = ''
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i].text
      if (t) out = out + t
    }
    return out.trim()
  } catch {
    return ''
  }
}

function resetPipeline() {
  if (pipeFetch > 0) fetchRelease(pipeFetch)
  pipePhase = PH_IDLE
  pipeFetch = 0
  pipeFileId = ''
  pipeTransId = ''
  pipeText = ''
  pipeNextPollMs = 0
}

function authHeader(): string {
  return 'Bearer ' + transcriptionApiKey()
}

// Confirm the WAV exists (cheap RIFF header read). Soniox has no 25 MB cap, so
// the only reason to bail here is a missing/empty file.
function wavExists(wavPath: string): boolean {
  const header = readFileRange(wavPath, 0, 12)
  return header.length >= 8
}

function uploadMultipartPrefix(): string {
  return (
    '--' +
    MULTIPART_BOUNDARY +
    '\r\nContent-Disposition: form-data; name="file"; filename="note.wav"\r\nContent-Type: audio/wav\r\n\r\n'
  )
}

function uploadMultipartSuffix(): string {
  return '\r\n--' + MULTIPART_BOUNDARY + '--\r\n'
}

// Stream the current note's WAV into POST /v1/files (also used to retry).
function startUpload() {
  pipeFetch = fetchUploadFileAsync(
    SONIOX_HOST + '/v1/files',
    authHeader(),
    'multipart/form-data; boundary=' + MULTIPART_BOUNDARY,
    uploadMultipartPrefix(),
    pipeWavPath,
    uploadMultipartSuffix()
  )
}

// Step 1: stream the WAV into POST /v1/files. Returns a non-zero handle when the
// pipeline started (the handle is opaque; Sync only checks > 0 / readiness).
export function startTranscriptionJob(wavPath: string): number {
  const apiKey = transcriptionApiKey()
  if (apiKey.length == 0) return 0
  if (!wavExists(wavPath)) return 0

  resetPipeline()
  pipeError = ''
  pipeWavPath = wavPath
  startUpload()
  if (pipeFetch <= 0) {
    pipeError = 'upload not started'
    pipePhase = PH_ERROR
    return 1
  }
  pipePhase = PH_UPLOAD
  return 1
}

function postCreateTranscription() {
  const body = '{"file_id":"' + pipeFileId + '","model":"' + transcriptionModel() + '"}'
  pipeFetch = fetchAsync(SONIOX_HOST + '/v1/transcriptions', {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body
  })
}

function getJob(suffix: string) {
  pipeFetch = fetchAsync(SONIOX_HOST + '/v1/transcriptions/' + pipeTransId + suffix, {
    method: 'GET',
    headers: { Authorization: authHeader() }
  })
}

// Drive the pipeline forward one step per call. Returns 1 only when terminal
// (PH_DONE or PH_ERROR); Sync then calls pollTranscriptionJob to collect text.
export function transcriptionJobReady(jobId: number): number {
  if (jobId <= 0) return 0
  if (pipePhase == PH_DONE || pipePhase == PH_ERROR) return 1
  if (pipePhase == PH_IDLE) return 1

  // Between polls: wait out the throttle, then re-issue GET status.
  if (pipePhase == PH_POLL && pipeFetch == 0) {
    if (Date.now() >= pipeNextPollMs) getJob('')
    return 0
  }

  if (pipeFetch == 0) return 0
  if (!fetchReady(pipeFetch)) return 0

  const response = fetchResult(pipeFetch)
  const ok = response.ok
  const text = response.text()
  fetchRelease(pipeFetch)
  pipeFetch = 0

  if (!ok) {
    const code = Math.round(response.status)
    if (pipePhase == PH_UPLOAD) pipeError = 'upload HTTP ' + code
    else if (pipePhase == PH_CREATE) pipeError = 'create HTTP ' + code
    else if (pipePhase == PH_POLL) pipeError = 'poll HTTP ' + code
    else if (pipePhase == PH_TRANSCRIPT) pipeError = 'transcript HTTP ' + code
    else pipeError = 'HTTP ' + code
    pipePhase = PH_ERROR
    return 1
  }

  if (pipePhase == PH_UPLOAD) {
    pipeFileId = jsonStringField(text, 'id')
    if (pipeFileId.length == 0) {
      pipeError = 'upload ok, no id: ' + text.substring(0, 20)
      pipePhase = PH_ERROR
      return 1
    }
    postCreateTranscription()
    pipePhase = PH_CREATE
    return 0
  }

  if (pipePhase == PH_CREATE) {
    pipeTransId = jsonStringField(text, 'id')
    if (pipeTransId.length == 0) {
      pipeError = 'create ok, no job id: ' + text.substring(0, 20)
      pipePhase = PH_ERROR
      return 1
    }
    pipeNextPollMs = Date.now() + POLL_INTERVAL_MS
    pipePhase = PH_POLL
    return 0
  }

  if (pipePhase == PH_POLL) {
    const status = jsonStringField(text, 'status')
    if (status == 'completed') {
      getJob('/transcript')
      pipePhase = PH_TRANSCRIPT
      return 0
    }
    if (status == 'error') {
      pipeError = 'soniox job error: ' + jsonStringField(text, 'error_message').substring(0, 24)
      pipePhase = PH_ERROR
      return 1
    }
    // queued / processing -> poll again after the throttle interval.
    pipeNextPollMs = Date.now() + POLL_INTERVAL_MS
    return 0
  }

  if (pipePhase == PH_TRANSCRIPT) {
    pipeText = joinTokenText(text)
    if (pipeText.length > 0) {
      pipePhase = PH_DONE
    } else {
      pipeError = 'empty transcript'
      pipePhase = PH_ERROR
    }
    return 1
  }

  pipeError = 'unexpected phase'
  pipePhase = PH_ERROR
  return 1
}

// Why the last transcription failed (step + HTTP status), for the Sync screen.
export function transcriptionError(): string {
  return pipeError
}

// Collect the final transcript (or '' on failure) and clear the pipeline.
export function pollTranscriptionJob(jobId: number): string {
  if (jobId <= 0) return ''
  const text = pipePhase == PH_DONE ? pipeText : ''
  resetPipeline()
  return text
}

export function cancelTranscriptionJob(jobId: number) {
  if (jobId > 0) resetPipeline()
}

// Raw upload byte counts (host globals must be called from module scope, not
// from a Store method, or the codegen emits an undeclared fn_ forwarder).
export function uploadSentBytes(): number {
  return fetchUploadSent(0)
}

export function uploadTotalBytes(): number {
  return fetchUploadTotal(0)
}

// Progress (0..1) of the active transcription, for the Sync screen bar. The
// long phase is the upload, so it drives the bar via the host byte counter;
// once uploaded, the Soniox-side create/poll/transcript steps hold the bar full.
export function transcriptionProgress(): number {
  if (pipePhase == PH_UPLOAD) {
    const p = fetchUploadProgress(0)
    return p < 0 ? 0 : p
  }
  if (pipePhase == PH_CREATE || pipePhase == PH_POLL || pipePhase == PH_TRANSCRIPT || pipePhase == PH_DONE) {
    return 1
  }
  return 0
}
