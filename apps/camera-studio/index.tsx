import { mount, Display } from '@geastack/core'
import { App } from './components/App'
import { studio } from './stores/CameraStudioStore'

// The <camera> element streams on its own (the runtime repaints it each frame),
// so there's no manual RAF / Camera.draw loop here — just mount the UI. Keep
// portrait panels native; the framed controls rotate with CSS instead.
Display.setSupportedOrientations('portrait-primary')
Display.setOrientation('portrait-primary')
Display.setAutoRotate(false)
Display.setFrameRate(30)
studio.start()
mount(App)
