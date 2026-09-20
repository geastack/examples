import { mount } from '@geastack/core'
import { App } from './components/App'
import { notes } from './stores/NotesStore'

notes.init()
mount(App)
