import { CGRectMake } from "@geastack/apple/CoreGraphics";
import { UIColor, UIScreen, UIView } from "@geastack/apple/UIKit";
import {
  contentWidth,
  height,
  inset,
  width,
} from "./constants";
import {
  createActionButton,
  createFrameTile,
  createHeroCard,
  createImageTile,
  createLayerTile,
  createNativeControlsTile,
  createStatusPanel,
  createSubtitleLabel,
  createTitleLabel,
} from "./sections";

export function createNativeShowcaseRoot(): UIView {
  return (
    <UIView
      frame={UIScreen.mainScreen().bounds}
      backgroundColor={UIColor.systemGroupedBackgroundColor()}
      tintColor={UIColor.systemBlueColor()}
      hidden={false}
    >
      <UIView
        frame={CGRectMake(0, 0, width, height)}
        backgroundColor={UIColor.systemGroupedBackgroundColor()}
        hidden={true}
      />
      <UIView
        frame={CGRectMake(0, 0, width, height)}
        backgroundColor={UIColor.colorWithRedGreenBlueAlpha(1, 1, 1, 0)}
      >
        {createTitleLabel()}
        {createSubtitleLabel()}
        {createHeroCard()}
        {createStatusPanel()}
        {createFrameTile()}
        {createLayerTile()}
        {createImageTile()}
        {createNativeControlsTile()}
        {createActionButton()}
        <UIView
          frame={CGRectMake(inset, height - 8, contentWidth, 1)}
          backgroundColor={UIColor.colorWithRedGreenBlueAlpha(0, 0, 0, 0)}
        />
      </UIView>
    </UIView>
  ) as UIView;
}
