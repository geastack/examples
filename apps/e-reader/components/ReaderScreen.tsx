import { Component } from '@geastack/core'
import { reader } from '../stores/ReaderStore'
import { CoverArt } from './CoverArt'
import { PageArt } from './PageArt'
import { ReaderControls } from './ReaderControls'
import { ReaderSettings } from './ReaderSettings'
import { TableOfContents } from './TableOfContents'
import './ReaderScreen.css'

export class ReaderScreen extends Component {
  template() {
    return (
      <div class={reader.readerClass} onKeyDown={event => reader.keydown(event.keyCode)}>
        {reader.pageIsCover == 1 && reader.coverArtSrc.length > 0 ? (
          <CoverArt />
        ) : (
        <div class="reader-paper">
          {reader.showChapterTitle == 1 ? (
            <div class="chapter-title-block">
              <span class="chapter-title">{reader.pageChapterTitle}</span>
            </div>
          ) : null}
          <div class="page-body">
            {reader.pageRowsA.map(row => (
              <p key={row.id} class={row.className}>{row.text}</p>
            ))}
            {reader.pageImageOn == 1 ? <PageArt /> : null}
            {reader.pageRowsB.map(row => (
              <p key={row.id} class={row.className}>{row.text}</p>
            ))}
          </div>
        </div>
        )}

        {reader.isBookmarked ? (
          <div class="page-bookmark">
            <span class="page-bookmark-notch"></span>
          </div>
        ) : null}

        <div class="page-zone page-zone-left" onClick={() => reader.previousPage()}></div>
        <div class="page-zone page-zone-right" onClick={() => reader.nextPage()}></div>

        <div class="reader-menu-hit" onClick={() => reader.toggleReaderControls()}>
          <div class="reader-menu-trigger">
            <span></span><span></span><span></span>
          </div>
        </div>

        <span class="reader-page-number">{reader.pageNumberLabel}</span>

        {reader.repaginating == 1 && reader.settingsOpen == 0 ? (
          <div class="reader-applying">
            <span class="reader-applying-label">{reader.repagLabel}</span>
            <span class="reader-applying-note">UPDATING PAGE BREAKS</span>
          </div>
        ) : null}

        {reader.controlsOpen ? <ReaderControls /> : null}
        {reader.settingsOpen ? <ReaderSettings /> : null}
        {reader.tocOpen ? <TableOfContents /> : null}
      </div>
    )
  }
}
