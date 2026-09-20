import { CGRectMake, CGSizeMake } from "@geastack/apple/CoreGraphics";
import { MTKView } from "@geastack/apple/MetalKit";
import {
  UIButton,
  UIColor,
  UIFont,
  UIAction,
  UIControlEventTouchCancel,
  UIControlEventTouchDown,
  UIControlEventTouchUpInside,
  UIControlEventTouchUpOutside,
  UILabel,
  UIView,
  installRootView,
} from "@geastack/apple/UIKit";
import { metalWorldLayout } from "./constants";
import { MetalWorldController, createMetalWorldController } from "./metalWorld";

const UIControlEventPrimaryActionTriggered = 8192;

function controlButton(x: number, y: number, w: number, h: number, title: string, primary: boolean): UIButton {
  const fill = primary ? UIColor.colorWithRed(0.08, 0.64, 1, 0.22) : UIColor.colorWithRed(0, 0, 0, 0);
  const button = (
    <UIButton
      frame={CGRectMake(x, y, w, h)}
      title={title}
      titleColor={UIColor.whiteColor()}
      backgroundColor={fill}
      layer={{
        cornerRadius: primary ? h / 2 : 0,
        shadowOpacity: primary ? 0.36 : 0,
        shadowRadius: primary ? 18 : 0,
        shadowOffset: CGSizeMake(0, primary ? 7 : 0),
      }}
    />
  ) as UIButton;
  button.titleLabel.font = primary ? UIFont.boldSystemFontOfSize(11) : UIFont.boldSystemFontOfSize(1);
  return button;
}

function refreshHud(
  world: MetalWorldController,
  statusLabel: UILabel,
  scoreLabel: UILabel,
  shieldLabel: UILabel,
): void {
  statusLabel.text = world.statusText();
  scoreLabel.text = world.scoreText();
  shieldLabel.text = world.shieldText();
}

function wirePress(
  world: MetalWorldController,
  button: UIButton,
  command: string,
  statusLabel: UILabel,
  scoreLabel: UILabel,
  shieldLabel: UILabel,
): void {
  const downAction = UIAction.actionWithHandler(() => {
    button.alpha = 0.72;
    world.beginControl(command);
    refreshHud(world, statusLabel, scoreLabel, shieldLabel);
  });
  const finishAction = UIAction.actionWithHandler(() => {
    button.alpha = 1;
    world.tapControl(command);
    refreshHud(world, statusLabel, scoreLabel, shieldLabel);
  });
  const cancelAction = UIAction.actionWithHandler(() => {
    button.alpha = 1;
    world.endControl(command);
    refreshHud(world, statusLabel, scoreLabel, shieldLabel);
  });
  const cancelEvents = UIControlEventTouchUpOutside | UIControlEventTouchCancel;
  const finishEvents = UIControlEventTouchUpInside | UIControlEventPrimaryActionTriggered;
  button.addAction(downAction, UIControlEventTouchDown);
  button.addAction(finishAction, finishEvents);
  button.addAction(cancelAction, cancelEvents);
}

export function mountMetalWorldGame(): void {
  const layout = metalWorldLayout();
  const width = layout.width;
  const height = layout.height;
  const inset = layout.inset;
  const contentWidth = layout.contentWidth;
  const titleTop = layout.titleTop;
  const sceneTop = layout.sceneTop;
  const sceneHeight = layout.sceneHeight;

  const worldView = (
    <MTKView
      frame={CGRectMake(0, sceneTop, width, sceneHeight)}
    />
  ) as MTKView;

  const hudTop = titleTop + 18;
  const scoreCaption = (
    <UILabel
      frame={CGRectMake(inset, titleTop, contentWidth * 0.36, 16)}
      text="SCORE"
      textColor={UIColor.colorWithRed(1, 1, 1, 0.64)}
      font={UIFont.boldSystemFontOfSize(10)}
    />
  ) as UILabel;
  const statusLabel = (
    <UILabel
      frame={CGRectMake(inset + contentWidth * 0.34, titleTop + 8, contentWidth * 0.32, 28)}
      text="WAVE 1/10"
      textColor={UIColor.colorWithRed(1, 1, 1, 0.88)}
      font={UIFont.boldSystemFontOfSize(13)}
      textAlignment={1}
    />
  ) as UILabel;
  const scoreLabel = (
    <UILabel
      frame={CGRectMake(inset, hudTop, contentWidth * 0.42, 34)}
      text="0"
      textColor={UIColor.whiteColor()}
      font={UIFont.boldSystemFontOfSize(22)}
    />
  ) as UILabel;
  const shieldLabel = (
    <UILabel
      frame={CGRectMake(inset + contentWidth * 0.64, titleTop + 8, contentWidth * 0.36, 28)}
      text="Shield 100%"
      textColor={UIColor.colorWithRed(0.34, 0.93, 1, 1)}
      font={UIFont.boldSystemFontOfSize(12)}
      textAlignment={2}
    />
  ) as UILabel;
  const world = createMetalWorldController(worldView, statusLabel, scoreLabel, shieldLabel, height / width);
  if (!world.ready) statusLabel.text = "Metal is unavailable on this device.";

  const abilityWidth = Math.max(88, Math.min(104, width * 0.24));
  const abilityHeight = Math.max(48, Math.min(56, height * 0.058));
  const abilityTop = height - abilityHeight * 2 - 78;
  const abilityX = width - inset - abilityWidth;
  const moveZoneTop = height * 0.28;
  const moveZoneHeight = height - moveZoneTop - 12;
  const leftButton = controlButton(0, moveZoneTop, width * 0.34, moveZoneHeight, "", false);
  const upButton = controlButton(width * 0.34, moveZoneTop, width * 0.32, moveZoneHeight * 0.44, "", false);
  const downButton = controlButton(width * 0.34, moveZoneTop + moveZoneHeight * 0.44, width * 0.32, moveZoneHeight * 0.56, "", false);
  const rightButton = controlButton(width * 0.66, moveZoneTop, width * 0.34, moveZoneHeight, "", false);
  const fireButton = controlButton(abilityX, abilityTop, abilityWidth, abilityHeight, "FIRE", true);
  const boostButton = controlButton(inset, abilityTop + abilityHeight + 30, abilityWidth, abilityHeight, "BOOST", true);

  wirePress(world, upButton, "up", statusLabel, scoreLabel, shieldLabel);
  wirePress(world, leftButton, "left", statusLabel, scoreLabel, shieldLabel);
  wirePress(world, downButton, "down", statusLabel, scoreLabel, shieldLabel);
  wirePress(world, rightButton, "right", statusLabel, scoreLabel, shieldLabel);
  wirePress(world, fireButton, "fire", statusLabel, scoreLabel, shieldLabel);
  wirePress(world, boostButton, "boost", statusLabel, scoreLabel, shieldLabel);

  const root = (
    <UIView
      frame={CGRectMake(0, 0, width, height)}
      backgroundColor={UIColor.blackColor()}
      tintColor={UIColor.colorWithRed(0.33, 0.84, 1, 1)}
    >
      {worldView}
      {leftButton}
      {upButton}
      {downButton}
      {rightButton}
      {scoreCaption}
      {scoreLabel}
      {shieldLabel}
      {statusLabel}
      {fireButton}
      {boostButton}
    </UIView>
  ) as UIView;

  installRootView(root);
}
