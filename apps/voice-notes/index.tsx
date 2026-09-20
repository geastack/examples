import { Display, mount } from '@geastack/core'
import './styles.css'
import { App } from './components/App'
import { voiceNotes } from './controllers/VoiceNotesController'

Display.setFrameRate(30)
Display.setEpaperRefreshConfig({ fastStreakWindowMs: 0 })

voiceNotes.init()
mount(App)

setInterval(() => {
  voiceNotes.tick(Date.now())
}, 1000)
