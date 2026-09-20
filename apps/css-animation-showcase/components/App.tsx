import { Component } from '@geastack/core'

// CSS animation showcase. Each animated element carries declarative `data-anim-*`
// attributes; the firmware's gea::css DeclarativeAnimations scanner reads them
// after mount and drives the animation through the gea::css engine (no per-frame
// JS). See docs/geaos-grand-vision.md (M3, §8c).
//
// Six distinct animatable properties, one per row: rotate, opacity, color
// (background), scale (driven as width+height since there is no transform-scale
// property), translateX (driven as left), translateY (driven as top). The five
// easing flavors are spread across them — linear, ease-in-out, ease,
// cubic-bezier spring, steps — so this single screen exercises the whole engine.
//
// IMPORTANT — geatsc mounted fast-path constraints (verified on-device):
//   1. Every style must be a STATIC literal object and every attribute a static
//      string. Computed styles (helper functions, `${..}px` template literals)
//      fall out of the fast-path into the dynamic string path, which drops
//      positioning + attributes (the tree collapses to top-left).
//   2. NO JSX comments ({/* ... */}) in the template — a single one cascades the
//      whole template into the dynamic path (same collapse).
//   3. Absolute positioning is reliable; nested inline-flex containers collapse.
// Static style coordinates are in the ~273x334 CSS space (410x502 physical at
// DPR 1.5). BUT the gea::css engine animates layout PROPERTIES (width/height for
// scale, left for translateX, top for translateY) in PHYSICAL device px — it
// runs below the DPR layer. So the geometry data-anim-from/to here are physical
// values (= the intended CSS value x 1.5), and `from` is set to the element's
// static-CSS position x 1.5 so the animation starts where the element rests
// (no jump). Rotate/opacity/color are DPR-independent (degrees / 0-255 / RGB565).
// Hence this file is deliberately verbose/literal and comment-free in template().

export class App extends Component {
  template() {
    return (
      <div style={{ width: '100vw', height: '100vh', backgroundColor: '#0B0F19', position: 'absolute' }}>
        <span style={{ position: 'absolute', top: '12px', left: '16px', fontSize: '24px', color: '#F9FAFB' }}>
          CSS Animations
        </span>
        <span style={{ position: 'absolute', top: '42px', left: '16px', fontSize: '11px', color: '#6B7280' }}>
          gea::css engine - declarative data-anim
        </span>
        <div
          id="d-rotate"
          data-anim="rotate"
          data-anim-from="0"
          data-anim-to="360"
          data-anim-dur="2200"
          data-anim-ease="linear"
          data-anim-iter="-1"
          style={{ position: 'absolute', left: '32px', top: '70px', width: '52px', height: '13px', backgroundColor: '#38BDF8', borderRadius: '50%' }}
        />
        <span style={{ position: 'absolute', left: '116px', top: '64px', fontSize: '17px', color: '#E5E7EB' }}>Rotate</span>
        <span style={{ position: 'absolute', left: '116px', top: '86px', fontSize: '11px', color: '#6B7280' }}>linear - loop</span>
        <div
          id="d-opacity"
          data-anim="opacity"
          data-anim-from="255"
          data-anim-to="45"
          data-anim-dur="900"
          data-anim-ease="ease-in-out"
          data-anim-dir="alternate"
          data-anim-iter="-1"
          style={{ position: 'absolute', left: '44px', top: '108px', width: '34px', height: '34px', backgroundColor: '#34D399', borderRadius: '9px' }}
        />
        <span style={{ position: 'absolute', left: '116px', top: '106px', fontSize: '17px', color: '#E5E7EB' }}>Opacity</span>
        <span style={{ position: 'absolute', left: '116px', top: '128px', fontSize: '11px', color: '#6B7280' }}>ease-in-out - alternate</span>
        <div
          id="d-color"
          data-anim="bg"
          data-anim-from="0xF800"
          data-anim-to="0x07E0"
          data-anim-dur="1400"
          data-anim-ease="ease"
          data-anim-dir="alternate"
          data-anim-iter="-1"
          style={{ position: 'absolute', left: '44px', top: '151px', width: '34px', height: '34px', backgroundColor: '#FF0000', borderRadius: '9px' }}
        />
        <span style={{ position: 'absolute', left: '116px', top: '149px', fontSize: '17px', color: '#E5E7EB' }}>Color</span>
        <span style={{ position: 'absolute', left: '116px', top: '171px', fontSize: '11px', color: '#6B7280' }}>ease - alternate</span>
        <div
          id="d-scale"
          data-anim="scale"
          data-anim-from="21"
          data-anim-to="60"
          data-anim-dur="1300"
          data-anim-ease="cubic-bezier(0.68,-0.55,0.27,1.55)"
          data-anim-dir="alternate"
          data-anim-iter="-1"
          style={{ position: 'absolute', left: '44px', top: '195px', width: '14px', height: '14px', backgroundColor: '#FBBF24', borderRadius: '6px' }}
        />
        <span style={{ position: 'absolute', left: '116px', top: '192px', fontSize: '17px', color: '#E5E7EB' }}>Scale</span>
        <span style={{ position: 'absolute', left: '116px', top: '214px', fontSize: '11px', color: '#6B7280' }}>spring - w + h</span>
        <div
          id="d-tx"
          data-anim="translateX"
          data-anim-from="48"
          data-anim-to="126"
          data-anim-dur="1100"
          data-anim-ease="ease-in-out"
          data-anim-dir="alternate"
          data-anim-iter="-1"
          style={{ position: 'absolute', left: '32px', top: '240px', width: '24px', height: '14px', backgroundColor: '#A78BFA', borderRadius: '7px' }}
        />
        <span style={{ position: 'absolute', left: '116px', top: '232px', fontSize: '17px', color: '#E5E7EB' }}>Translate X</span>
        <span style={{ position: 'absolute', left: '116px', top: '254px', fontSize: '11px', color: '#6B7280' }}>ease-in-out - left</span>
        <div
          id="d-ty"
          data-anim="translateY"
          data-anim-from="418"
          data-anim-to="468"
          data-anim-dur="1300"
          data-anim-ease="steps(4)"
          data-anim-dir="alternate"
          data-anim-iter="-1"
          style={{ position: 'absolute', left: '50px', top: '279px', width: '20px', height: '20px', backgroundColor: '#F472B6', borderRadius: '6px' }}
        />
        <span style={{ position: 'absolute', left: '116px', top: '277px', fontSize: '17px', color: '#E5E7EB' }}>Translate Y</span>
        <span style={{ position: 'absolute', left: '116px', top: '299px', fontSize: '11px', color: '#6B7280' }}>steps(4) - top</span>
      </div>
    )
  }
}
