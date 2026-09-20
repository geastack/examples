import { Component } from '@geastack/core'
import { reader } from '../stores/ReaderStore'
import './ReaderControls.css'

export class ReaderControls extends Component {
  template() {
    return (
      <div class="reader-controls-overlay">
        <div class="reader-controls-bar">
          <div class="reader-controls-summary">
            <span class="controls-title">{reader.currentTitle}</span>
            <span class="controls-position">{reader.pageNumberLabel} • {reader.progressPercent}%</span>
          </div>
          <div class="controls-close" onClick={() => reader.closeReaderControls()}><span>CLOSE</span></div>
        </div>
        <div class="reader-control-actions">
          <div class="reader-control-action" onClick={() => reader.closeBook()}>
            <span>LIBRARY</span>
          </div>
          <div class="reader-control-action" onClick={() => reader.toggleToc()}>
            <span>CONTENTS</span>
          </div>
          <div class={`reader-control-action ${reader.isBookmarked ? 'is-active' : ''}`} onClick={() => reader.toggleBookmark()}>
            <span>BOOKMARK</span>
          </div>
          <div class="reader-control-action" onClick={() => reader.toggleSettings()}>
            <span>TYPE</span>
          </div>
        </div>
      </div>
    )
  }
}
