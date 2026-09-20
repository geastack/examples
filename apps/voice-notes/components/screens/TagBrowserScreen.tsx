import { Component } from "@geastack/core";import './TagBrowserScreen.css';
import { BROWSE_TAGS } from '../../shared/tags';
import { BROWSE_TAG_BACK, voiceNotesTagBrowser } from '../../stores/TagBrowserStore';export class TagBrowserScreen extends Component {template() {


    return (
      <div class="vn-screen vn-tag-browser">
      <span class="vn-screen-title">tags</span>
      <div class="vn-tag-hero">
        {voiceNotesTagBrowser.browseTagNameText}
      </div>
      <span class="vn-tag-count">{voiceNotesTagBrowser.browseTagCountText}</span>
      <div class="vn-mini-tags">
        {BROWSE_TAGS.map((tag) =>
          <div class={{ 'is-active': voiceNotesTagBrowser.browseTagIndex == tag.index }}>
            {tag.name}
          </div>
          )}
        <div class={{ 'is-active': voiceNotesTagBrowser.browseTagIndex == BROWSE_TAG_BACK }}>
          Back
        </div>
      </div>
    </div>);}}