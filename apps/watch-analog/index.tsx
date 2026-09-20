import { mount } from '@geastack/core'
import { App } from './components/App'

// Analog watch face. The hands rotate via declarative data-anim attributes,
// driven by the firmware's gea::css engine (DeclarativeAnimations scans the
// mounted tree after launch), so no app-side rAF/store is needed.
mount(App)
