import { Store, WiFi } from '@geastack/core'
import { startTransferServer, stopTransferServer } from '../lib/transfer'

const TRANSFER_OFF = 0
const TRANSFER_WAIT_WIFI = 1
const TRANSFER_LISTENING = 2
const WIFI_WAIT_MS = 20000

export class VoiceNotesTransferStore extends Store {
  transferAddress = 'offline'
  transferMessage = 'Transfer off'
  transferActive = 0
  transferStateLabel = 'offline'
  transferPhase = TRANSFER_OFF
  startedAtMs = 0

  start(noteCount: number) {
    if (noteCount == 0) {
      this.transferActive = 0
      this.transferPhase = TRANSFER_OFF
      this.transferAddress = 'offline'
      this.transferMessage = 'No notes to transfer'
      this.refreshDerived()
      return
    }
    this.transferActive = 1
    this.transferPhase = TRANSFER_WAIT_WIFI
    this.transferAddress = 'offline'
    this.transferMessage = 'Connecting Wi-Fi'
    this.startedAtMs = Date.now()
    WiFi.setEnabled(true)
    this.refreshDerived()
  }

  tick() {
    if (this.transferPhase != TRANSFER_WAIT_WIFI) return
    if (WiFi.connected()) {
      this.beginListening()
    } else if (Date.now() - this.startedAtMs > WIFI_WAIT_MS) {
      this.transferActive = 0
      this.transferPhase = TRANSFER_OFF
      this.transferMessage = 'Wi-Fi offline'
      this.refreshDerived()
    }
  }

  beginListening() {
    const url = startTransferServer()
    if (url.length == 0) {
      this.transferActive = 0
      this.transferPhase = TRANSFER_OFF
      this.transferMessage = 'Server error'
      this.refreshDerived()
      return
    }
    this.transferAddress = url
    this.transferMessage = 'Open in your browser'
    this.transferPhase = TRANSFER_LISTENING
    this.refreshDerived()
  }

  close() {
    stopTransferServer()
    this.transferActive = 0
    this.transferPhase = TRANSFER_OFF
    this.transferAddress = 'offline'
    this.transferMessage = 'Transfer off'
    this.refreshDerived()
  }

  refreshDerived() {
    if (this.transferPhase == TRANSFER_LISTENING) this.transferStateLabel = 'live'
    else if (this.transferActive) this.transferStateLabel = 'starting'
    else this.transferStateLabel = 'offline'
  }
}

export const voiceNotesTransfer = new VoiceNotesTransferStore()
