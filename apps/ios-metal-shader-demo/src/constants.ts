import { UIScreen } from "@geastack/apple/UIKit";

export interface MetalShaderLayout {
  width: number;
  height: number;
  inset: number;
  contentWidth: number;
  titleTop: number;
  subtitleTop: number;
  shaderTop: number;
  shaderHeight: number;
  panelTop: number;
}

export function metalShaderLayout(): MetalShaderLayout {
  const bounds = UIScreen.mainScreen().bounds;
  const width = Math.max(360, bounds.size.width);
  const height = Math.max(760, bounds.size.height);
  const inset = width >= 420 ? 24 : 20;
  const contentWidth = width - inset * 2;
  const titleTop = height >= 900 ? 64 : 54;
  const subtitleTop = titleTop + 42;
  const shaderTop = subtitleTop + (height >= 900 ? 54 : 42);
  const shaderHeight = Math.max(430, Math.min(height >= 900 ? 560 : 520, height - shaderTop - 206));
  const panelTop = shaderTop + shaderHeight + 16;

  return {
    width,
    height,
    inset,
    contentWidth,
    titleTop,
    subtitleTop,
    shaderTop,
    shaderHeight,
    panelTop,
  };
}
