import { Component } from '@geastack/core'
import './App.css'
import { voiceNotes } from '../controllers/VoiceNotesController'
import { voiceNotesNavigation } from '../stores/NavigationStore'
import {
  VIEW_DELETE_CONFIRM,
  VIEW_DEVICE,
  VIEW_IDLE,
  VIEW_MENU,
  VIEW_NOTE_DETAIL,
  VIEW_NOTE_LIST,
  VIEW_RECORDING,
  VIEW_SETTINGS,
  VIEW_SYNC,
  VIEW_TAG_BROWSER,
  VIEW_TAG_SELECT,
  VIEW_TRANSFER
} from '../shared/views'
import { DeleteConfirmScreen } from './screens/DeleteConfirmScreen'
import { DetailScreen } from './screens/DetailScreen'
import { DeviceScreen } from './screens/DeviceScreen'
import { IdleScreen } from './screens/IdleScreen'
import { MenuScreen } from './screens/MenuScreen'
import { NoteListScreen } from './screens/NoteListScreen'
import { RecordingScreen } from './screens/RecordingScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { SyncScreen } from './screens/SyncScreen'
import { TagBrowserScreen } from './screens/TagBrowserScreen'
import { TagSelectScreen } from './screens/TagSelectScreen'
import { TransferScreen } from './screens/TransferScreen'

export class App extends Component {
  template() {
    return (
      <div class="voice-notes-app" onKeyDown={event => voiceNotes.keydown(event.keyCode)}>
        <div class="vn-device-shell">
          {voiceNotesNavigation.view == VIEW_IDLE ? <IdleScreen /> : null}
          {voiceNotesNavigation.view == VIEW_RECORDING ? <RecordingScreen /> : null}
          {voiceNotesNavigation.view == VIEW_TAG_SELECT ? <TagSelectScreen /> : null}
          {voiceNotesNavigation.view == VIEW_MENU ? <MenuScreen /> : null}
          {voiceNotesNavigation.view == VIEW_TAG_BROWSER ? <TagBrowserScreen /> : null}
          {voiceNotesNavigation.view == VIEW_NOTE_LIST ? <NoteListScreen /> : null}
          {voiceNotesNavigation.view == VIEW_NOTE_DETAIL ? <DetailScreen /> : null}
          {voiceNotesNavigation.view == VIEW_SYNC ? <SyncScreen /> : null}
          {voiceNotesNavigation.view == VIEW_SETTINGS ? <SettingsScreen /> : null}
          {voiceNotesNavigation.view == VIEW_TRANSFER ? <TransferScreen /> : null}
          {voiceNotesNavigation.view == VIEW_DELETE_CONFIRM ? <DeleteConfirmScreen /> : null}
          {voiceNotesNavigation.view == VIEW_DEVICE ? <DeviceScreen /> : null}
        </div>
      </div>
    )
  }
}
