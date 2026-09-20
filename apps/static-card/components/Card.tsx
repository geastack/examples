import { Component } from '@geastack/core'

export class Card extends Component {
  template() {
    return (
      <div
        style={{
          width: '320px',
          backgroundColor: '#1F2937',
          borderRadius: '16px',
          borderWidth: '2px',
          borderColor: '#374151',
          padding: '20px',
          gap: '12px'
        }}
      >
        <span style={{ fontSize: '18px', color: '#F9FAFB' }}>Pixel-faithful browser preview</span>
        <span style={{ fontSize: '14px', color: '#9CA3AF' }}>
          Shared C layout and raster output in the browser.
        </span>
      </div>
    )
  }
}
