import { Component } from '@geastack/core'
import { LibraryScreen } from './LibraryScreen'
import { OpeningModal } from './OpeningModal'
import { ReaderScreen } from './ReaderScreen'
import { reader, VIEW_LIBRARY } from '../stores/ReaderStore'
import './App.css'

export class App extends Component {
  template() {
    return (
      <div class="app-root" onKeyDown={event => reader.keydown(event.keyCode)}>
        {reader.view == VIEW_LIBRARY ? <LibraryScreen /> : <ReaderScreen />}
        {reader.opening == 1 ? <OpeningModal /> : null}
      </div>
    )
  }
}
