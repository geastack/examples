import { Component } from "@geastack/core";import './SettingsScreen.css';
import { SETTING_SOUNDS, SETTINGS_ITEMS, voiceNotesSettings } from '../../stores/SettingsStore';export class SettingsScreen extends Component {template() {


    return (
      <div class="vn-screen vn-settings">
      <span class="vn-screen-title">settings</span>
      <div class="vn-menu-list">
        {SETTINGS_ITEMS.map((item) =>
          <div class={{ 'is-active': voiceNotesSettings.settingsIndex == item.id }}>
            <span>{item.label}</span>
            <span>{item.id == SETTING_SOUNDS ? voiceNotesSettings.soundsEnabledLabel : ''}</span>
          </div>
          )}
      </div>
    </div>);}}