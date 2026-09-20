import { Component } from '@geastack/core'
import { Card } from './Card'

export class App extends Component {
  template() {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          backgroundColor: '#111827',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '24px'
        }}
      >
        <Card />
      </div>
    )
  }
}
