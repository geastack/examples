import { Component } from "@geastack/core";import './MenuScreen.css';
import { MENU_ITEMS, voiceNotesMenu } from '../../stores/MenuStore';export class MenuScreen extends Component {template() {


    return (
      <div class="vn-screen vn-menu">
      <span class="vn-screen-title">menu</span>
      <div class="vn-menu-list">
        {MENU_ITEMS.map((item) =>
          <div class={{ 'is-active': voiceNotesMenu.menuIndex == item.id }}>
            {item.label}
          </div>
          )}
      </div>
    </div>);}}