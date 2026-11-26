import { Component, Store } from '@geastack/core'
import { Checkbox } from '@geastack/elements'

class CheckboxSettings extends Store {
  emailNotifications = false
  productUpdates = false
  productUpdatesIndeterminate = true

  setEmailNotifications(value: boolean) {
    this.emailNotifications = value
  }

  setProductUpdates(value: boolean) {
    this.productUpdates = value
    this.productUpdatesIndeterminate = false
  }
}

const settings = new CheckboxSettings()

/** Demonstrates controlled, indeterminate, and disabled Checkbox states. */
export class App extends Component {
  template() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
        <Checkbox
          label="Email notifications"
          checked={settings.emailNotifications}
          onChange={(value) => settings.setEmailNotifications(value)}
        />
        <Checkbox
          label="Product updates"
          checked={settings.productUpdates}
          indeterminate={settings.productUpdatesIndeterminate}
          onChange={(value) => settings.setProductUpdates(value)}
        />
        <Checkbox label="Disabled option" checked disabled />
      </div>
    )
  }
}
