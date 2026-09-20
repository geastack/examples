import { CGRectMake, CGSizeMake } from "@geastack/apple/CoreGraphics";
import { MTKView } from "@geastack/apple/MetalKit";
import {
  ObjCTarget,
  ObjCTargetAction,
  UIButton,
  UIColor,
  UIFont,
  UIControlEventTouchUpInside,
  UIImage,
  UIImageView,
  UILabel,
  UIProgressView,
  UIView,
  installRootView,
} from "@geastack/apple/UIKit";
import { metalShowcaseLayout } from "./constants";
import { installOrbitScene, updateOrbitControl } from "./metalScene";

const retainedControlTargets: unknown[] = [];

function addButtonAction(button: UIButton, command: string): void {
  const target = ObjCTarget.create(() => updateOrbitControl(command));
  retainedControlTargets.push(target);
  button.addTarget(target, ObjCTargetAction, UIControlEventTouchUpInside);
}

export function mountMetalShowcase(): void {
  const layout = metalShowcaseLayout();
  const width = layout.width;
  const height = layout.height;
  const inset = layout.inset;
  const contentWidth = layout.contentWidth;
  const titleTop = layout.titleTop;
  const subtitleTop = layout.subtitleTop;
  const sceneTop = layout.sceneTop;
  const sceneHeight = layout.sceneHeight;
  const panelTop = layout.panelTop;
  const bottomButtonTop = layout.bottomButtonTop;
  const cardRadius = layout.cardRadius;
  const metricCardWidth = (contentWidth - 12) / 2;
  const metricTextWidth = (contentWidth - 40) / 2;
  const metalView = (
    <MTKView
      frame={CGRectMake(inset, sceneTop, contentWidth, sceneHeight)}
      layer={{
        cornerRadius: 28,
        shadowOpacity: 0.28,
        shadowRadius: 24,
        shadowOffset: CGSizeMake(0, 14),
      }}
    />
  ) as MTKView;

  const metalReady = installOrbitScene(metalView);

  const speedButton = (
    <UIButton
      frame={CGRectMake(inset + 18, sceneTop + sceneHeight - 52, 92, 32)}
      title="Speed"
      titleColor={UIColor.whiteColor()}
      backgroundColor={UIColor.colorWithRed(1, 1, 1, 0.12)}
      layer={{ cornerRadius: 16 }}
    />
  ) as UIButton;
  const meshButton = (
    <UIButton
      frame={CGRectMake(inset + 120, sceneTop + sceneHeight - 52, 114, 32)}
      title="Tilt"
      titleColor={UIColor.whiteColor()}
      backgroundColor={UIColor.colorWithRed(1, 1, 1, 0.12)}
      layer={{ cornerRadius: 16 }}
    />
  ) as UIButton;
  const shaderButton = (
    <UIButton
      frame={CGRectMake(inset + contentWidth - 100, sceneTop + sceneHeight - 52, 82, 32)}
      title="Shader"
      titleColor={UIColor.whiteColor()}
      backgroundColor={UIColor.colorWithRed(1, 1, 1, 0.12)}
      layer={{ cornerRadius: 16 }}
    />
  ) as UIButton;
  const inspectButton = (
    <UIButton
      frame={CGRectMake(inset, bottomButtonTop, contentWidth, 54)}
      title={metalReady ? "Pause / resume cube" : "Metal unavailable"}
      titleColor={UIColor.blackColor()}
      backgroundColor={UIColor.whiteColor()}
      layer={{ cornerRadius: 22 }}
    />
  ) as UIButton;

  addButtonAction(speedButton, "speed");
  addButtonAction(meshButton, "tilt");
  addButtonAction(shaderButton, "palette");
  addButtonAction(inspectButton, "pause");

  const root = (
    <UIView
      frame={CGRectMake(0, 0, width, height)}
      backgroundColor={UIColor.blackColor()}
      tintColor={UIColor.systemTealColor()}
    >
      <UILabel
        frame={CGRectMake(inset, titleTop, contentWidth, 36)}
        text="Metal Orbit Lab"
        textColor={UIColor.whiteColor()}
        font={UIFont.boldSystemFontOfSize(30)}
      />
      <UILabel
        frame={CGRectMake(inset, subtitleTop, contentWidth, 44)}
        text="A TypeScript MTKView renders an animated, button-controlled cube."
        textColor={UIColor.colorWithRed(1, 1, 1, 0.72)}
        font={UIFont.systemFontOfSize(15)}
        numberOfLines={2}
      />
      {metalView}
      <UILabel
        frame={CGRectMake(inset + 18, sceneTop + 18, contentWidth - 36, 26)}
        text="GPU scene"
        textColor={UIColor.whiteColor()}
        font={UIFont.boldSystemFontOfSize(21)}
      />
      <UILabel
        frame={CGRectMake(inset + 18, sceneTop + 48, contentWidth - 36, 38)}
        text="MTLRenderPipeline, procedural vertex shader, and per-frame command buffers."
        textColor={UIColor.colorWithRed(1, 1, 1, 0.76)}
        font={UIFont.systemFontOfSize(13)}
        numberOfLines={2}
      />
      {speedButton}
      {meshButton}
      {shaderButton}
      <UIView
        frame={CGRectMake(inset, panelTop, contentWidth, 124)}
        backgroundColor={UIColor.systemBackgroundColor()}
        layer={{
          cornerRadius: cardRadius,
          shadowOpacity: 0.16,
          shadowRadius: 18,
          shadowOffset: CGSizeMake(0, 10),
        }}
      >
        <UIView
          frame={CGRectMake(16, 18, 48, 48)}
          backgroundColor={UIColor.systemTealColor()}
          layer={{ cornerRadius: 15 }}
        >
          <UIImageView
            frame={CGRectMake(12, 12, 24, 24)}
            image={UIImage.systemImageNamed("cube.transparent.fill")}
            tintColor={UIColor.whiteColor()}
          />
        </UIView>
        <UILabel
          frame={CGRectMake(78, 18, contentWidth - 108, 24)}
          text="Native GPU bridge"
          textColor={UIColor.labelColor()}
          font={UIFont.boldSystemFontOfSize(18)}
        />
        <UILabel
          frame={CGRectMake(78, 44, contentWidth - 108, 38)}
          text="The renderer is TypeScript using the same Metal and MetalKit APIs Apple documents."
          textColor={UIColor.secondaryLabelColor()}
          font={UIFont.systemFontOfSize(13)}
          numberOfLines={2}
        />
        <UIProgressView
          frame={CGRectMake(78, 91, contentWidth - 112, 8)}
          progress={0.86}
          progressTintColor={UIColor.systemTealColor()}
          trackTintColor={UIColor.systemGray5Color()}
        />
      </UIView>
      <UIView
        frame={CGRectMake(inset, panelTop + 140, metricCardWidth, 104)}
        backgroundColor={UIColor.systemBackgroundColor()}
        layer={{
          cornerRadius: 20,
          shadowOpacity: 0.12,
          shadowRadius: 12,
          shadowOffset: CGSizeMake(0, 7),
        }}
      >
        <UILabel
          frame={CGRectMake(14, 12, metricTextWidth, 19)}
          text="Geometry"
          textColor={UIColor.secondaryLabelColor()}
          font={UIFont.systemFontOfSize(12)}
        />
        <UILabel
          frame={CGRectMake(14, 35, metricTextWidth, 28)}
          text="18 verts"
          textColor={UIColor.labelColor()}
          font={UIFont.boldSystemFontOfSize(23)}
        />
        <UILabel
          frame={CGRectMake(14, 67, metricTextWidth, 30)}
          text="Three shaded faces"
          textColor={UIColor.secondaryLabelColor()}
          font={UIFont.systemFontOfSize(12)}
          numberOfLines={2}
        />
      </UIView>
      <UIView
        frame={CGRectMake(inset + (contentWidth + 12) / 2, panelTop + 140, metricCardWidth, 104)}
        backgroundColor={UIColor.systemBackgroundColor()}
        layer={{
          cornerRadius: 20,
          shadowOpacity: 0.12,
          shadowRadius: 12,
          shadowOffset: CGSizeMake(0, 7),
        }}
      >
        <UILabel
          frame={CGRectMake(14, 12, metricTextWidth, 19)}
          text="Frame loop"
          textColor={UIColor.secondaryLabelColor()}
          font={UIFont.systemFontOfSize(12)}
        />
        <UILabel
          frame={CGRectMake(14, 35, metricTextWidth, 28)}
          text="60 fps"
          textColor={UIColor.labelColor()}
          font={UIFont.boldSystemFontOfSize(23)}
        />
        <UILabel
          frame={CGRectMake(14, 67, metricTextWidth, 30)}
          text="MTKView delegate ticks"
          textColor={UIColor.secondaryLabelColor()}
          font={UIFont.systemFontOfSize(12)}
          numberOfLines={2}
        />
      </UIView>
      {inspectButton}
    </UIView>
  ) as UIView;

  installRootView(root);
}
