import { Component } from '@geastack/core'
import { diag } from '../stores/DiagnosticsStore'
import './MenuList.css'

export class MenuList extends Component {
  template() {
    return (
      <div class="menu-viewport">
        <div class="menu-list">
          {diag.visibleRows.map(row => (
            <div
              class={`menu-row diag-menu-row state-${row.state} ${row.id == diag.focusId ? 'is-focused' : ''}`}
              key={row.id}
              onClick={() => diag.open(row.id)}
            >
              <div class="menu-row-copy">
                <span class="menu-row-title">{row.title}</span>
                <span class="menu-row-detail">{row.detail}</span>
              </div>
              <span class={`state-badge badge-${row.state}`}>{row.badge}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
}
