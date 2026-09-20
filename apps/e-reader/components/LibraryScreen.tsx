import { Component } from '@geastack/core'
import { FILTER_ALL, FILTER_READING, FILTER_UNREAD, reader } from '../stores/ReaderStore'
import { BookCover } from './BookCover'
import './LibraryScreen.css'

export class LibraryScreen extends Component {
  template() {
    return (
      <div class="library-screen" onKeyDown={event => reader.keydown(event.keyCode)}>
        <div class="library-header">
          <div class="brand-block">
            <span class="brand-name">FOLIO</span>
            <span class="brand-edition">READER / 01</span>
          </div>
          <div class="source-block">
            <span class={`source-dot ${reader.librarySource == 'SD CARD / BOOKS' ? 'is-mounted' : ''}`}></span>
            <div class="source-copy">
              <span class="source-label">{reader.librarySource}</span>
              <span class="source-status">{reader.libraryStatus}</span>
            </div>
          </div>
          <div class="scan-button" onClick={() => reader.scanSd()}>
            <span>RESCAN</span>
          </div>
        </div>

        <div class="library-filters">
          <div class={`filter-tab ${reader.filter == FILTER_ALL ? 'is-active' : ''}`} onClick={() => reader.setFilter(FILTER_ALL)}>
            <span>ALL</span><span>{reader.books.length}</span>
          </div>
          <div class={`filter-tab ${reader.filter == FILTER_READING ? 'is-active' : ''}`} onClick={() => reader.setFilter(FILTER_READING)}>
            <span>READING</span><span>{reader.readingBookCount}</span>
          </div>
          <div class={`filter-tab ${reader.filter == FILTER_UNREAD ? 'is-active' : ''}`} onClick={() => reader.setFilter(FILTER_UNREAD)}>
            <span>UNREAD</span><span>{reader.unreadBookCount}</span>
          </div>
        </div>

        <div class="book-list" momentum="false" snap-step="324">
          <div class="book-grid">
            {reader.visibleBooks.map(book => <BookCover key={book.id} book={book} compact={1} />)}
          </div>
          {reader.visibleBookCount == 0 ? (
            <div class="empty-library">
              <span class="empty-title">NO BOOKS HERE</span>
              <span class="empty-copy">CHOOSE ALL, OR ADD EPUBS TO THE SD LIBRARY INDEX.</span>
            </div>
          ) : null}
        </div>

      </div>
    )
  }
}
