import { Component, type GeaElement } from '@geastack/core'
import { reader } from '../stores/ReaderStore'
import { applyCoverSrc } from '../lib/coverArt'

// Full-screen cover illustration. The template stays static (no reactive src)
// so the component is natively mounted like PageArt — a reactive `src` binding
// would drop it into a heavier bridged component. The runtime SD path is applied
// imperatively in onAfterRender (and re-applied by ReaderStore after each cover
// page load — see paintCoverArt), which the engine loads via
// gea_host_image_load_asset_path → loadFile for the absolute SD path.
export class CoverArt extends Component {
  imgEl: GeaElement | null = null

  template() {
    return <img id="cover-art" class="cover-fullscreen" fit="contain" ref={this.imgEl} />
  }

  onAfterRender() {
    applyCoverSrc(reader.coverArtSrc)
  }
}
