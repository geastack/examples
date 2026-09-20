import { Store } from '@geastack/core'
import type {
  RTCIceCandidateInit,
  RTCPeerConnectionInstance,
  RTCSessionDescriptionInit,
  WebSocketInstance,
  MediaStream,
  RTCPeerConnectionIceEvent,
  WebSocketMessageEvent
} from '@geastack/core'

export type CallState = 'idle' | 'dialing' | 'ringing' | 'connected'

/**
 * What this app's own signalling peer sends over the socket -- the three
 * messages `startCall` below writes, read back.
 *
 * Stated, rather than left as whatever `JSON.parse` returns, because the values
 * do not stay dynamic: `sdpType`/`sdp` go straight into
 * `setRemoteDescription(RTCSessionDescriptionInit)` and `candidate` into
 * `addIceCandidate(RTCIceCandidateInit)`, both of which are typed host calls.
 * Parsed as `any`, each of those crossings is a dynamic value being poured into
 * a native record, which is exactly the conversion a compiler has no way to
 * perform -- and it is not the parse that is dynamic, it is this file that
 * never said what it parsed.
 */
interface SignalMessage {
  type: 'offer' | 'answer' | 'ice'
  sdpType?: RTCSessionDescriptionInit['type']
  sdp?: string
  candidate?: RTCIceCandidateInit
}

export class DialerStore extends Store {
  state: CallState = 'idle'
  remoteId: string = ''
  errorMessage: string = ''
  pc: RTCPeerConnectionInstance | null = null
  ws: WebSocketInstance | null = null
  localStream: MediaStream | null = null

  pressDigit(digit: string): void {
    if (this.state === 'idle') this.remoteId = this.remoteId + digit
  }

  clearDigits(): void {
    if (this.state === 'idle') this.remoteId = ''
  }

  async dial(signalingUrl: string): Promise<void> {
    if (this.state !== 'idle' || !this.remoteId) return
    this.state = 'dialing'
    this.errorMessage = ''

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true })

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      })
      this.pc = pc

      const ws = new WebSocket(`${signalingUrl}?room=${encodeURIComponent(this.remoteId)}`)
      this.ws = ws

      pc.onicecandidate = (e: RTCPeerConnectionIceEvent) => {
        if (e.candidate && this.ws) {
          this.ws.send(JSON.stringify({ type: 'ice', candidate: e.candidate }))
        }
      }
      pc.onconnectionstatechange = () => {
        const cs = pc.connectionState
        if (cs === 'connected') this.state = 'connected'
        else if (cs === 'failed' || cs === 'closed') this.hangup()
      }

      pc.addTrack(this.localStream.getAudioTracks()[0], this.localStream)

      ws.onopen = async () => {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        ws.send(JSON.stringify({ type: 'offer', sdp: offer.sdp, sdpType: offer.type }))
      }

      ws.onmessage = async (e: WebSocketMessageEvent) => {
        const msg = JSON.parse(e.data) as SignalMessage
        if (msg.type === 'answer' && msg.sdpType) {
          await pc.setRemoteDescription({ type: msg.sdpType, sdp: msg.sdp })
          if (this.state === 'dialing') this.state = 'ringing'
        } else if (msg.type === 'ice' && msg.candidate) {
          await pc.addIceCandidate(msg.candidate)
        }
      }

      ws.onerror = () => {
        this.errorMessage = 'signaling error'
        this.hangup()
      }
      ws.onclose = () => {
        if (this.state !== 'connected') this.hangup()
      }
    } catch (err) {
      this.errorMessage = String(err)
      this.state = 'idle'
    }
  }

  hangup(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    if (this.pc) {
      this.pc.close()
      this.pc = null
    }
    if (this.localStream) {
      const tracks = this.localStream.getTracks()
      for (const t of tracks) t.stop()
      this.localStream = null
    }
    this.state = 'idle'
    this.remoteId = ''
  }
}

export const dialer = new DialerStore()
