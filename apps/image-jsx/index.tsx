import { Component, mount } from '@geastack/core'

// Render a PNG by path. `face.png` is a real file in this folder — at build
// time it's embedded into the app binary as .rodata (the ESP32 app partition;
// the macOS executable; the WASM module) and registered by path, so this
// `<img src="...">` resolves it without any byte array in the source bundle.
// See lib/gea-embedded/include/asset_registry.h.
class App extends Component {
  template() {
    return <img src="face.png" />
  }
}

mount(App)
