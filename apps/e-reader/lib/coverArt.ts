import type { GeaElement } from '@geastack/core'

// Apply the runtime cover path to the full-screen cover <img>. A module
// function (not a class method) on purpose: template image sources only support
// literal/bundled assets, so the reactive `src` binding would drop CoverArt out
// of native rendering and into a heavier bridged component. Setting src
// imperatively keeps CoverArt's template static (natively mounted like PageArt);
// the engine loads the path at setAttribute time via gea_host_image_load_asset_path,
// which falls back to loadFile for absolute SD paths (see host/image.cpp), and
// large covers decode 1-channel grayscale on monochrome targets so they fit PSRAM.
export function applyCoverSrc(path: string): void {
  const img = document.getElementById('cover-art') as unknown as GeaElement | null
  if (!img) return
  if (path.length == 0) {
    img.removeAttribute('src')
    return
  }
  img.setAttribute('src', path)
}
