import { ReactiveComponent } from '@geastack/core'

export class App extends ReactiveComponent {
  template() {
    return (
      <div style={{ width: 400, height: 300, alignItems: 'center', justifyContent: 'center' }}>
        <span>Hello, world!</span>
      </div>
    )
  }
}
