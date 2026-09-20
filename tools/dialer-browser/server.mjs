// Tiny WebSocket signaling relay. Pairs clients by room and forwards JSON
// messages. Also serves the static index.html so a single command spins up the
// whole demo.
//
//   cd tools/dialer-browser && npm i && npm start
//
// The watch dialer (and any browser tab) connects to:
//   ws://<host>:8788/?room=<room>
// and broadcasts JSON {type:'offer'|'answer'|'ice', ...} to the other party.

import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync, existsSync } from 'node:fs'
import { WebSocketServer } from 'ws'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 8788)
const HOST = '0.0.0.0'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
}

const httpServer = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`)
  let filePath = url.pathname === '/' ? '/index.html' : url.pathname
  const abs = path.join(__dirname, filePath)
  if (!abs.startsWith(__dirname) || !existsSync(abs)) {
    res.writeHead(404, { 'content-type': 'text/plain' })
    res.end('not found')
    return
  }
  const ext = path.extname(abs).toLowerCase()
  res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream' })
  res.end(readFileSync(abs))
})

const wss = new WebSocketServer({ server: httpServer })
const rooms = new Map() // roomId → Set<ws>

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`)
  const room = url.searchParams.get('room') || 'default'
  if (!rooms.has(room)) rooms.set(room, new Set())
  const peers = rooms.get(room)
  peers.add(ws)
  console.log(`[${room}] peer joined (${peers.size} total)`)

  ws.on('message', (data) => {
    const text = data.toString()
    for (const peer of peers) {
      if (peer !== ws && peer.readyState === ws.OPEN) peer.send(text)
    }
  })

  ws.on('close', () => {
    peers.delete(ws)
    console.log(`[${room}] peer left (${peers.size} remaining)`)
    if (peers.size === 0) rooms.delete(room)
  })

  ws.on('error', (err) => {
    console.error(`[${room}] ws error:`, err.message)
  })
})

httpServer.listen(PORT, HOST, () => {
  console.log(`dialer signaling + browser peer on http://localhost:${PORT}/`)
  console.log(`watch should connect to ws://<this-machine-ip>:${PORT}/?room=<room>`)
})
