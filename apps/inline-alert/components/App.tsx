import { Component } from '@geastack/core'
import { demo } from '../stores/DemoStore'
import { Alerts } from './Alerts'

export class App extends Component {
  template() {
    return (
      <div class="demo-app">
        <span class="demo-title">InlineAlert</span>
        <Alerts />
        <div class="demo-buttons">
          <button class="demo-button" onClick={() => demo.toggleLanguage()}>
            {demo.turkish ? 'English' : 'Türkçe'}
          </button>
          <button class="demo-button" onClick={() => demo.reset()}>
            {demo.turkish ? 'Sıfırla' : 'Reset'}
          </button>
        </div>
      </div>
    )
  }
}
