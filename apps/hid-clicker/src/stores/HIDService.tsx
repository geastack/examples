import { BLEServer, registerBleServer } from '@geastack/core'
import { store } from './ClickerStore'

export class HIDService extends BLEServer {
  constructor() {
    // Pass identity through the base class so native BLEServer references retain
    // it without dynamic property lookup.
    super('Gea Clicker', 961, '')
    // super('Gea Clicker', 961, 'C0:DE:5E:DA:73:8A')
  }

  onConnected() {
    store.markConnected()
  }

  onDisconnected() {
    store.markAdvertising()
  }

  onBound() {
    store.markBound()
  }
}

export const hid = new HIDService()
registerBleServer(hid)
