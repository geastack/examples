import { Component, type GeaElement } from '@geastack/core'
import type { BookRow } from '../models'
import { reader } from '../stores/ReaderStore'
import './BookCover.css'

// The one component in the corpus whose template takes props. `Component`'s
// second type parameter is where a component states them; the parameter type
// below is the same shape restated, which is what an override is.
export class BookCover extends Component<GeaElement, { book: BookRow; compact: number }> {
  template({ book, compact }: { book: BookRow; compact: number }) {
    return (
      <div class={`library-book-row ${reader.selectedBookId == book.id ? 'is-selected' : ''}`} onClick={() => reader.openBook(book.id)}>
        <div class={{ 'book-cover': true, 'cover-tone-1': true, 'has-art': book.hasArt == 1 }}>
          <img class="cover-art" src={book.coverThumb} fit="contain" />
          <span class="cover-rule"></span>
          <span class="cover-monogram">{book.monogram}</span>
          <span class="cover-title">{book.title}</span>
          <span class="cover-author">{book.author}</span>
        </div>
        <div class="book-row-copy">
          <span class="book-row-title">{book.title}</span>
          <span class="book-row-author">{book.author}</span>
          <span class="book-row-progress">{book.progressPercent}% READ</span>
        </div>
      </div>
    )
  }
}
