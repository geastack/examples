import { UIScreen } from "@geastack/apple/UIKit";

export interface MetalShowcaseLayout {
  width: number;
  height: number;
  inset: number;
  contentWidth: number;
  titleTop: number;
  subtitleTop: number;
  sceneTop: number;
  sceneHeight: number;
  panelTop: number;
  bottomButtonTop: number;
  cardRadius: number;
}

export function metalShowcaseLayout(): MetalShowcaseLayout {
  const bounds = UIScreen.mainScreen().bounds;
  const width = Math.max(360, bounds.size.width);
  const height = Math.max(760, bounds.size.height);
  const inset = width >= 420 ? 24 : 20;
  const contentWidth = width - inset * 2;
  const titleTop = height >= 900 ? 64 : 54;
  const subtitleTop = titleTop + 42;
  const sceneTop = subtitleTop + (height >= 900 ? 60 : 46);
  const bottomButtonTop = height - (height >= 900 ? 90 : 86);
  const lowerStackHeight = 124 + 16 + 104 + 18;
  const maxSceneHeight = bottomButtonTop - 18 - sceneTop - lowerStackHeight;
  const sceneHeight = Math.max(312, Math.min(height >= 900 ? 410 : 348, maxSceneHeight));
  const panelTop = sceneTop + sceneHeight + 16;

  return {
    width,
    height,
    inset,
    contentWidth,
    titleTop,
    subtitleTop,
    sceneTop,
    sceneHeight,
    panelTop,
    bottomButtonTop,
    cardRadius: 24,
  };
}
