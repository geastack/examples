import { Component } from '@geastack/core'
import { reader } from '../stores/ReaderStore'
import './OpeningModal.css'

// Shown while a book is being opened for the first time (no cached pagination
// on the card). The anchor walk streams and paginates every chapter one frame
// at a time; this modal reports which chapter is in flight so the multi-second
// first open reads as deliberate work rather than a frozen tap.
export class OpeningModal extends Component {
  template() {
    return (
      <div class="opening-overlay">
        <div class="opening-card">
          <span class="opening-kicker">PREPARING BOOK</span>
          <span class="opening-title">{reader.currentTitle}</span>
          <span class="opening-author">{reader.currentAuthor}</span>
          <div class="opening-track">
            <div class="opening-fill" style={{ width: reader.openFillPx }}></div>
          </div>
          <span class="opening-status">{reader.openLabel}</span>
        </div>
      </div>
    )
  }
}
