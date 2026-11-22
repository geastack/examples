# Dialer Browser Peer

A tiny WebSocket signaling relay + browser WebRTC peer for testing the watch's
dialer end-to-end.

## Setup

```bash
npm install          # once, at the examples repository root
cd tools/dialer-browser
npm start
```

Visit `http://<this-machine-ip>:8788/` from any browser on the same network.

## Watch side

The watch's `apps/dialer/` app is hardcoded to dial
`ws://gea-dev.local:8788/` (`SIGNALING_URL` in
[`shared/Dialer/index.tsx`](../../shared/Dialer/index.tsx)). Either:

1. Change `SIGNALING_URL` to your dev machine's IP, OR
2. Add a `gea-dev.local` entry to your home router's local DNS, OR
3. Run a small mDNS responder that exposes `gea-dev.local` on your dev machine.

## Flow

1. Browser tab loads `index.html` → joins room `42`.
2. Watch tap on "Call" with the number `42` → connects to the same room,
   creates an offer, sends it through the relay.
3. Browser receives offer → generates answer → sends it back.
4. Both sides exchange ICE candidates → connection established → audio flows.

## Troubleshooting

- **"connecting…" stays forever**: signaling reached but no audio path. Likely
  TURN needed (`failed (try TURN)` will appear). For most LAN setups this won't
  happen.
- **No remote audio in the browser**: the watch's `esp_peer_send_audio` isn't
  pushing frames — check the watch logs for the `gea_rtc_send` task starting.
- **No remote audio on the watch**: the browser's `addTrack` is sending but
  the watch's `on_audio_data` callback isn't firing. Check codec negotiation
  in the offer/answer SDP — both sides need to agree on Opus 16 kHz mono.
- **Echo in the browser**: expected. The dialer build has no acoustic echo
  cancellation: the CLI enables it only for apps that both capture the
  microphone and create an audio playback object (`AudioContext`, `Audio`,
  `PcmAudioStream`), and the dialer plays the remote WebRTC track instead.
