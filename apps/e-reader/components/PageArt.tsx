import { Component, type GeaCanvasElement } from '@geastack/core'
import { reader } from '../stores/ReaderStore'
import { drawPageArt } from '../lib/pageArt'

// The visible page's illustration. Template image sources only support
// literal/bundled assets, so EPUB art is painted imperatively instead
// (extract the zip bytes, decode, contain-fit draw, dispose — nothing
// image-sized is retained). onAfterRender covers the canvas's first mount;
// subsequent page turns whose page ALSO has art reuse this same canvas node
// (the conditional that mounts PageArt only remounts on a true/false
// transition, not on every page turn), so ReaderStore separately repaints it
// via rAF after every page load that has an image — see paintPageArt.
export class PageArt extends Component {
  canvasEl: GeaCanvasElement | null = null

  template() {
    return <canvas id="page-art" class="page-image" width={404} height={320} style={{ width: 404, height: 320 }} ref={this.canvasEl} />
  }

  onAfterRender() {
    drawPageArt(reader.currentBookPath, reader.pageImageHref, reader.pageIsCover == 1)
  }
}
