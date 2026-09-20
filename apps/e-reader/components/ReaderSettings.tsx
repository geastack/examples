import { Component } from '@geastack/core'
import { reader } from '../stores/ReaderStore'
import './ReaderSettings.css'

export class ReaderSettings extends Component {
  template() {
    return (
      <div class="settings-panel">
        <div class="settings-header">
          <div class="settings-heading">
            <span class="settings-kicker">READING PROFILE</span>
            <span class="settings-title">TYPE & PAGE</span>
          </div>
          <div class="settings-close" onClick={() => reader.closePanels()}><span>DONE</span></div>
        </div>
        {reader.repaginating ? (
          <div class="settings-applying">
            <span class="settings-applying-label">{reader.repagLabel}</span>
            <span class="settings-applying-note">PAGE BREAKS UPDATE WHEN DONE</span>
          </div>
        ) : null}
        <div class="setting-row">
          <span class="setting-name">FONT</span>
          <span class={reader.fontPreviewClass}>Ag</span>
          <button class="setting-control" onClick={() => reader.cycleFont()}>
            <span class="setting-control-caption">CHANGE</span>
            <span class="setting-control-current">{reader.fontLabel}</span>
            <span class="setting-control-arrow">&gt;</span>
          </button>
        </div>
        <div class="setting-row">
          <span class="setting-name">SIZE</span>
          <span class={reader.sizePreviewClass}>Aa</span>
          <button class="setting-control" onClick={() => reader.cycleSize()}>
            <span class="setting-control-caption">CHANGE</span>
            <span class="setting-control-current">{reader.sizeLabel}</span>
            <span class="setting-control-arrow">&gt;</span>
          </button>
        </div>
        <div class="setting-row">
          <span class="setting-name">LEADING</span>
          <span class={reader.leadingPreviewClass}>
            <span></span>
            <span></span>
            <span></span>
          </span>
          <button class="setting-control" onClick={() => reader.cycleSpacing()}>
            <span class="setting-control-caption">CHANGE</span>
            <span class="setting-control-current">{reader.spacingLabel}</span>
            <span class="setting-control-arrow">&gt;</span>
          </button>
        </div>
        <div class="setting-row">
          <span class="setting-name">MARGINS</span>
          <span class="setting-preview">
            <span class={reader.marginPreviewClass}>
              <span class="margin-preview-body"></span>
            </span>
          </span>
          <button class="setting-control" onClick={() => reader.cycleMargins()}>
            <span class="setting-control-caption">CHANGE</span>
            <span class="setting-control-current">{reader.marginLabel}</span>
            <span class="setting-control-arrow">&gt;</span>
          </button>
        </div>
        <div class="setting-row refresh-row">
          <span class="setting-name">REFRESH</span>
          <div class="refresh-modes">
            <button class={`refresh-mode ${reader.refreshMode == 1 ? 'is-active' : ''}`} onClick={() => reader.setRefreshMode(1)}>
              <span>FAST</span>
              <span>PARTIAL REFRESH</span>
            </button>
            <button class={`refresh-mode ${reader.refreshMode == 0 ? 'is-active' : ''}`} onClick={() => reader.setRefreshMode(0)}>
              <span>QUALITY</span>
              <span>FULL REFRESH</span>
            </button>
          </div>
        </div>
      </div>
    )
  }
}
