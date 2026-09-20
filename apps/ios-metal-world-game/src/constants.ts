import { UIScreen } from "@geastack/apple/UIKit";

export interface MetalWorldLayout {
  width: number;
  height: number;
  inset: number;
  contentWidth: number;
  titleTop: number;
  subtitleTop: number;
  sceneTop: number;
  sceneHeight: number;
  controlsTop: number;
  buttonHeight: number;
  buttonGap: number;
}

export function metalWorldLayout(): MetalWorldLayout {
  const bounds = UIScreen.mainScreen().bounds;
  const width = Math.max(360, bounds.size.width);
  const height = Math.max(760, bounds.size.height);
  const inset = width >= 420 ? 22 : 18;
  const contentWidth = width - inset * 2;
  const titleTop = height >= 900 ? 58 : 44;
  const subtitleTop = titleTop + 34;
  const sceneTop = 0;
  const buttonHeight = height >= 900 ? 40 : 38;
  const buttonGap = width >= 420 ? 10 : 8;
  const sceneHeight = height;
  const controlsTop = height - (buttonHeight * 2 + 38);

  return {
    width,
    height,
    inset,
    contentWidth,
    titleTop,
    subtitleTop,
    sceneTop,
    sceneHeight,
    controlsTop,
    buttonHeight,
    buttonGap,
  };
}
