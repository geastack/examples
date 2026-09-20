import { installRootView } from '@geastack/apple/UIKit'
import { createDeviceShowcaseRoot } from './views'

export function mountDeviceShowcase(): void {
  installRootView(createDeviceShowcaseRoot())
}
