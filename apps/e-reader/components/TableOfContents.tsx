import { Component } from '@geastack/core'
import { reader } from '../stores/ReaderStore'
import './TableOfContents.css'

export class TableOfContents extends Component {
  template() {
    return (
      <div class="toc-panel">
        <div class="toc-header">
          <div class="toc-heading">
            <span class="toc-kicker">{reader.currentTitle}</span>
            <span class="toc-heading-title">CONTENTS</span>
          </div>
          <div class="toc-close" onClick={() => reader.closePanels()}><span>DONE</span></div>
        </div>
        <div class="toc-list">
          {reader.tocPageRows.map(row => (
            <div key={row.id} class={`toc-row ${row.current ? 'is-current' : ''}`} onClick={() => reader.jumpToChapter(row.chapterIndex)}>
              <span class="toc-number">{row.number}</span>
              <span class="toc-title">{row.title}</span>
              <span class="toc-page">P. {row.pageNumber}</span>
            </div>
          ))}
        </div>
        <div class="toc-pager">
          <div class="toc-pager-zone" onClick={() => reader.tocPrevPage()}>
            <span>PREVIOUS</span>
          </div>
          <span class="toc-pager-label">{reader.tocPageLabel}</span>
          <div class="toc-pager-zone" onClick={() => reader.tocNextPage()}>
            <span>NEXT</span>
          </div>
        </div>
      </div>
    )
  }
}
