import { WiFi, http, type HttpReply, type IncomingMessage } from '@geastack/core'
import { noteIsPending } from '../shared/noteQueries'
import { noteAudioPath, pad3 } from '../shared/noteText'
import { tagName } from '../shared/tags'
import type { VoiceNote } from '../shared/notes'
import { voiceNotesLibrary } from '../stores/NoteLibraryStore'

// The device hosts a tiny HTTP portal over Wi-Fi (modeled after Node's `http`):
// a phone/laptop on the same network browses recordings, plays them inline, and
// downloads the audio (.wav) or the transcript text. The recordings live on the
// SD card, so audio is streamed straight off disk by the native server — the
// handler only ever returns a path, never the bytes.

// Port 8080 is taken by the platform OTA HTTP server (which fails to start on
// this RAM-tight board but still leaves the port unusable), so serve on 8088.
const TRANSFER_PORT = 8088

// Persist only the numeric server handle (a plain number cell). Holding the
// HttpServer object across module scope would box it into a gea_cpp_value.
let activeServerHandle = 0

export interface TransferSession {
  active: number
  address: string
  message: string
}

function escapeHtml(value: string): string {
  let out = ''
  for (let i = 0; i < value.length; i++) {
    const ch = value.charAt(i)
    if (ch == '&') out = out + '&amp;'
    else if (ch == '<') out = out + '&lt;'
    else if (ch == '>') out = out + '&gt;'
    else if (ch == '"') out = out + '&quot;'
    else out = out + ch
  }
  return out
}

// Parse the trailing integer of a path like "/a/12" -> 12. Returns 0 when none.
function trailingNumber(path: string): number {
  let value = 0
  let seen = 0
  for (let i = 0; i < path.length; i++) {
    const code = path.charCodeAt(i)
    if (code >= 48 && code <= 57) {
      value = value * 10 + (code - 48)
      seen = 1
    } else {
      value = 0
      seen = 0
    }
  }
  return seen ? value : 0
}

function findNote(notes: VoiceNote[], number: number): VoiceNote | null {
  for (let i = 0; i < notes.length; i++) {
    if (notes[i].number == number) return notes[i]
  }
  return null
}

const PORTAL_CSS =
  '<style>' +
  ':root{font-family:-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",sans-serif;color:#111;background:#f3f0e9}' +
  'body{margin:0;padding:24px;background:#f3f0e9}' +
  '.wrap{max-width:760px;margin:0 auto}' +
  '.top{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:22px}' +
  'h1{font-size:42px;letter-spacing:-.05em;line-height:.9;margin:0;font-weight:800}' +
  '.sub{font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#6a665f;margin-top:8px}' +
  '.pill{border:1px solid #111;border-radius:999px;padding:8px 12px;font-size:13px;background:#fffaf1;white-space:nowrap}' +
  '.actions{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:22px}' +
  'a.btn{color:#111;text-decoration:none;border:1px solid #111;border-radius:999px;padding:8px 12px;background:#f3f0e9;font-size:13px}' +
  'a.btn.primary{background:#111;color:#fff}' +
  '.grid{display:grid;grid-template-columns:1fr;gap:14px}' +
  '.card{background:#fffaf1;border:1.5px solid #111;border-radius:22px;padding:18px;box-shadow:4px 4px 0 #111}' +
  '.row{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}' +
  '.num{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6a665f;margin-bottom:6px}' +
  '.title{font-size:21px;line-height:1.1;letter-spacing:-.03em;font-weight:700;margin:0 0 10px}' +
  '.tag{border:1px solid #111;border-radius:999px;padding:4px 9px;font-size:12px;background:#111;color:#fff;white-space:nowrap}' +
  '.text{font-size:15px;line-height:1.45;color:#222;margin:0 0 12px;white-space:pre-wrap}' +
  '.muted{color:#9a958c}' +
  'audio{width:100%;margin:6px 0 12px}' +
  '.empty{border:1.5px dashed #111;border-radius:22px;padding:34px;text-align:center;color:#6a665f}' +
  '@media(max-width:520px){body{padding:16px}h1{font-size:34px}}' +
  '</style>'

function noteCardHtml(note: VoiceNote): string {
  const num = note.number
  const id = pad3(num)
  const transcribed = noteIsPending(note) == 0
  const transcript = transcribed ? note.transcript : 'Not transcribed yet.'
  let title = transcript
  if (title.length > 56) title = title.substring(0, 56) + '...'
  if (!transcribed) title = 'Voice note ' + id

  let html = '<div class="card">'
  html = html + '<div class="row"><div><div class="num">#' + id + '</div>'
  html = html + '<h2 class="title">' + escapeHtml(title) + '</h2></div>'
  html = html + '<div class="tag">' + escapeHtml(tagName(note.tagId)) + '</div></div>'
  if (transcribed) {
    html = html + '<p class="text">' + escapeHtml(note.transcript) + '</p>'
  } else {
    html = html + '<p class="text muted">Not transcribed yet.</p>'
  }
  html = html + '<audio controls preload="none" src="/a/' + num + '"></audio>'
  html = html + '<div class="actions" style="margin:0">'
  html = html + '<a class="btn primary" href="/d/' + num + '">Download WAV</a>'
  if (transcribed) html = html + '<a class="btn" href="/t/' + num + '">Transcript</a>'
  html = html + '</div></div>'
  return html
}

function indexHtml(notes: VoiceNote[]): string {
  let html = '<!doctype html><html><head><meta charset="utf-8">'
  html = html + '<meta name="viewport" content="width=device-width,initial-scale=1">'
  html = html + '<title>Voice Notes</title>' + PORTAL_CSS + '</head><body><div class="wrap">'
  html = html + '<div class="top"><div><h1>voice<br>notes</h1>'
  html = html + '<div class="sub">local transfer portal</div></div>'
  html = html + '<div class="pill">' + notes.length + ' notes</div></div>'
  html = html + '<div class="actions"><a class="btn primary" href="/export.txt">Download all transcripts</a></div>'

  if (notes.length == 0) {
    html = html + '<div class="empty">No recordings yet.</div>'
  } else {
    html = html + '<div class="grid">'
    for (let i = notes.length - 1; i >= 0; i--) html = html + noteCardHtml(notes[i])
    html = html + '</div>'
  }
  html = html + '</div></body></html>'
  return html
}

function exportText(notes: VoiceNote[]): string {
  let out = 'Voice Notes Export\n------------------------------\n\n'
  for (let i = notes.length - 1; i >= 0; i--) {
    const note = notes[i]
    out = out + '#' + pad3(note.number) + ' · ' + tagName(note.tagId) + '\n\n'
    out = out + (note.transcript.length > 0 ? note.transcript : 'Not transcribed yet.')
    out = out + '\n\n------------------------------\n\n'
  }
  return out
}

// One request -> one reply. Runs on the frame task. Returns a plain reply
// record; a reply that sets `file` streams that path off the SD card natively.
function transferReply(req: IncomingMessage): HttpReply {
  const notes = voiceNotesLibrary.notes
  const path = req.path

  if (path == '/' || path == '/index.html') {
    return { status: 200, contentType: 'text/html; charset=utf-8', body: indexHtml(notes) }
  }
  if (path == '/export.txt') {
    return { status: 200, contentType: 'text/plain; charset=utf-8', body: exportText(notes), download: 'voice-notes.txt' }
  }

  const number = trailingNumber(path)
  if (number > 0) {
    const note = findNote(notes, number)
    if (note == null) return { status: 404, contentType: 'text/plain', body: 'Unknown note' }

    // Audio: stream the .wav off disk (inline player or attachment download).
    if (path.indexOf('/a/') == 0) {
      return { status: 200, contentType: 'audio/wav', file: noteAudioPath(number) }
    }
    if (path.indexOf('/d/') == 0) {
      return { status: 200, contentType: 'audio/wav', file: noteAudioPath(number), download: 'note_' + pad3(number) + '.wav' }
    }
    // Transcript text comes from the note model (not a file on disk).
    if (path.indexOf('/t/') == 0) {
      const transcript = note.transcript.length > 0 ? note.transcript : 'Not transcribed yet.'
      return { status: 200, contentType: 'text/plain; charset=utf-8', body: transcript }
    }
  }

  return { status: 404, contentType: 'text/plain', body: 'Not found' }
}

// Start (or restart) the portal. Returns the LAN URL, or '' if it can't bind.
export function startTransferServer(): string {
  stopTransferServer()
  const server = http.createServer((req: IncomingMessage) => transferReply(req))
  if (!server.listen(TRANSFER_PORT)) return ''
  activeServerHandle = server.id()
  return 'http://' + WiFi.ip() + ':' + TRANSFER_PORT
}

export function stopTransferServer() {
  if (activeServerHandle != 0) {
    http.close(activeServerHandle)
    activeServerHandle = 0
  }
}
