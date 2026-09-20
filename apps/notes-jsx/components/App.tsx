import { Component } from '@geastack/core'
import './App.css'
import { Sidebar } from './Sidebar'
import { NoteList } from './NoteList'
import { Editor } from './Editor'

// <glass-split> maps to a native NSSplitViewController on the macOS target:
// the sidebar pane gets the system Liquid Glass sidebar material + resizable
// divider, and <toolbar> becomes a real unified-title-bar NSToolbar with SF
// Symbol items. Each <glass-pane> hosts a gea subtree laid out against the
// pane's live bounds.
export class App extends Component {
  template() {
    return (
      <glass-split>
        <toolbar>
          <toolbar-item data-symbol="sidebar.left" data-role="sidebar-toggle" data-label="Toggle Sidebar" />
          <toolbar-space />
          <toolbar-item data-symbol="square.and.pencil" data-action="newNote" data-label="New Note" />
          <toolbar-item data-symbol="textformat" data-label="Format" />
          <toolbar-item data-symbol="checklist" data-label="Checklist" />
          <toolbar-item data-symbol="tablecells" data-label="Table" />
          <toolbar-item data-symbol="square.and.arrow.up" data-label="Share" />
          <toolbar-search />
        </toolbar>
        <glass-pane data-pane="sidebar">
          <Sidebar />
        </glass-pane>
        <glass-pane data-pane="list">
          <NoteList />
        </glass-pane>
        <glass-pane data-pane="detail">
          <Editor />
        </glass-pane>
      </glass-split>
    )
  }
}
