import { CGRectMake, CGSizeMake } from '@geastack/apple/CoreGraphics'
import {
  UIApplication,
  ObjCTarget,
  ObjCTargetAction,
  UIAlertAction,
  UIAlertActionStyleDefault,
  UIAlertController,
  UIAlertControllerStyleAlert,
  UIButton,
  UIAction,
  UIBlurEffect,
  UIColor,
  UIFont,
  UIControlEventTouchDown,
  UIControlEventTouchUpInside,
  UIImage,
  UIImageView,
  UILabel,
  UIProgressView,
  UISwitch,
  UIStackView,
  UIView,
  UIVisualEffectView
} from '@geastack/apple/UIKit'
import {
  actionBottom,
  actionHeight,
  cardRadius,
  contentWidth,
  height,
  heroHeight,
  heroTop,
  inset,
  panelHeight,
  panelTop,
  tileGap,
  tileHeight,
  tileTop,
  tileWidth
} from './constants'
import {
  actionTitle,
  appSubtitle,
  appTitle,
  bridgeStatusBadge,
  bridgeStatusDetail,
  bridgeStatusTitle,
  controlsTileDetail,
  controlsTileTitle,
  controlsTileValue,
  firstPillTitle,
  frameTileDetail,
  frameTileTitle,
  frameTileValue,
  heroBody,
  heroTitle,
  imageTileDetail,
  imageTileTitle,
  imageTileValue,
  layerTileDetail,
  layerTileTitle,
  layerTileValue,
  renderStatusDetail,
  renderStatusTitle,
  secondPillTitle,
  swiftStatusDetail,
  swiftStatusTitle,
  thirdPillTitle
} from './content'

export function createTitleLabel(): UILabel {
  return (
    <UILabel
      frame={CGRectMake(inset, 58, contentWidth, 34)}
      text={appTitle}
      textColor={UIColor.labelColor()}
      font={UIFont.boldSystemFontOfSize(28)}
      numberOfLines={1}
      textAlignment={0}
    />
  ) as UILabel
}

export function createSubtitleLabel(): UILabel {
  return (
    <UILabel
      frame={CGRectMake(inset, 93, contentWidth, 42)}
      text={appSubtitle}
      textColor={UIColor.secondaryLabelColor()}
      font={UIFont.systemFontOfSize(15)}
      numberOfLines={2}
      textAlignment={0}
    />
  ) as UILabel
}

export function createHeroCard(): UIVisualEffectView {
  return (
    <UIVisualEffectView
      frame={CGRectMake(inset, heroTop, contentWidth, heroHeight)}
      effect={UIBlurEffect.effectWithStyle(4)}
      backgroundColor={UIColor.systemIndigoColor()}
      alpha={0.97}
      clipsToBounds={true}
      layer={{
        cornerRadius: cardRadius,
        shadowOpacity: 0.22,
        shadowRadius: 18,
        shadowOffset: CGSizeMake(0, 10)
      }}
    >
      {createHeroIconBadge()}
      {createHeroTitleLabel()}
      {createHeroBodyLabel()}
      <UIStackView
        frame={CGRectMake(22, 120, contentWidth - 44, 40)}
        axis={0}
        alignment={0}
        distribution={2}
        spacing={10}
      >
        {createUIKitPill()}
        {createLayerPill()}
        {createSymbolPill()}
      </UIStackView>
    </UIVisualEffectView>
  ) as UIVisualEffectView
}

export function createStatusPanel(): UIView {
  return (
    <UIView
      frame={CGRectMake(inset, panelTop, contentWidth, panelHeight)}
      backgroundColor={UIColor.secondarySystemGroupedBackgroundColor()}
      layer={{
        cornerRadius: cardRadius,
        shadowOpacity: 0.08,
        shadowRadius: 14,
        shadowOffset: CGSizeMake(0, 7)
      }}
    >
      <UILabel
        frame={CGRectMake(22, 18, contentWidth - 44, 28)}
        text="Bridge status"
        textColor={UIColor.labelColor()}
        font={UIFont.boldSystemFontOfSize(20)}
        numberOfLines={1}
      />
      {createBridgeStatusRow()}
      {createRenderStatusRow()}
      {createSwiftStatusRow()}
    </UIView>
  ) as UIView
}

export function createFrameTile(): UIView {
  return (
    <UIView
      frame={CGRectMake(inset, tileTop, tileWidth, tileHeight)}
      backgroundColor={UIColor.secondarySystemGroupedBackgroundColor()}
      layer={{
        cornerRadius: 18,
        masksToBounds: false
      }}
    >
      <UILabel
        frame={CGRectMake(14, 12, tileWidth - 28, 20)}
        text={frameTileTitle}
        textColor={UIColor.secondaryLabelColor()}
        font={UIFont.systemFontOfSize(13)}
      />
      <UILabel
        frame={CGRectMake(14, 36, tileWidth - 28, 28)}
        text={frameTileValue}
        textColor={UIColor.labelColor()}
        font={UIFont.boldSystemFontOfSize(23)}
      />
      <UILabel
        frame={CGRectMake(14, 64, tileWidth - 28, 22)}
        text={frameTileDetail}
        textColor={UIColor.secondaryLabelColor()}
        font={UIFont.systemFontOfSize(12)}
        numberOfLines={2}
      />
    </UIView>
  ) as UIView
}

export function createLayerTile(): UIView {
  return (
    <UIView
      frame={CGRectMake(inset + tileWidth + tileGap, tileTop, tileWidth, tileHeight)}
      backgroundColor={UIColor.secondarySystemGroupedBackgroundColor()}
      layer={{
        cornerRadius: 18,
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: CGSizeMake(0, 6)
      }}
    >
      <UILabel
        frame={CGRectMake(14, 12, tileWidth - 28, 20)}
        text={layerTileTitle}
        textColor={UIColor.secondaryLabelColor()}
        font={UIFont.systemFontOfSize(13)}
      />
      <UILabel
        frame={CGRectMake(14, 36, tileWidth - 28, 28)}
        text={layerTileValue}
        textColor={UIColor.labelColor()}
        font={UIFont.boldSystemFontOfSize(23)}
      />
      <UILabel
        frame={CGRectMake(14, 64, tileWidth - 28, 22)}
        text={layerTileDetail}
        textColor={UIColor.secondaryLabelColor()}
        font={UIFont.systemFontOfSize(12)}
        numberOfLines={2}
      />
    </UIView>
  ) as UIView
}

export function createImageTile(): UIView {
  return (
    <UIView
      frame={CGRectMake(inset, tileTop + tileHeight + tileGap, tileWidth, tileHeight)}
      backgroundColor={UIColor.secondarySystemGroupedBackgroundColor()}
      layer={{ cornerRadius: 18 }}
    >
      <UIImageView
        frame={CGRectMake(tileWidth - 42, 14, 26, 26)}
        image={UIImage.systemImageNamed('photo.on.rectangle.angled')}
        tintColor={UIColor.systemOrangeColor()}
        contentMode={1}
      />
      <UILabel
        frame={CGRectMake(14, 12, tileWidth - 54, 20)}
        text={imageTileTitle}
        textColor={UIColor.secondaryLabelColor()}
        font={UIFont.systemFontOfSize(13)}
      />
      <UILabel
        frame={CGRectMake(14, 36, tileWidth - 28, 28)}
        text={imageTileValue}
        textColor={UIColor.labelColor()}
        font={UIFont.boldSystemFontOfSize(23)}
      />
      <UILabel
        frame={CGRectMake(14, 64, tileWidth - 28, 22)}
        text={imageTileDetail}
        textColor={UIColor.secondaryLabelColor()}
        font={UIFont.systemFontOfSize(12)}
        numberOfLines={2}
      />
    </UIView>
  ) as UIView
}

export function createNativeControlsTile(): UIView {
  return (
    <UIView
      frame={CGRectMake(inset + tileWidth + tileGap, tileTop + tileHeight + tileGap, tileWidth, tileHeight)}
      backgroundColor={UIColor.secondarySystemGroupedBackgroundColor()}
      layer={{ cornerRadius: 18 }}
    >
      <UILabel
        frame={CGRectMake(14, 12, 82, 20)}
        text={controlsTileTitle}
        textColor={UIColor.secondaryLabelColor()}
        font={UIFont.systemFontOfSize(13)}
      />
      <UISwitch
        frame={CGRectMake(tileWidth - 66, 10, 52, 32)}
        onTintColor={UIColor.systemGreenColor()}
        thumbTintColor={UIColor.whiteColor()}
        on={true}
      />
      <UILabel
        frame={CGRectMake(14, 36, tileWidth - 28, 26)}
        text={controlsTileValue}
        textColor={UIColor.labelColor()}
        font={UIFont.boldSystemFontOfSize(23)}
      />
      <UILabel
        frame={CGRectMake(14, 61, tileWidth - 28, 15)}
        text={controlsTileDetail}
        textColor={UIColor.secondaryLabelColor()}
        font={UIFont.systemFontOfSize(11)}
      />
      <UIProgressView
        frame={CGRectMake(14, 80, tileWidth - 28, 8)}
        progress={0.78}
        progressTintColor={UIColor.systemBlueColor()}
        trackTintColor={UIColor.systemGray5Color()}
      />
    </UIView>
  ) as UIView
}

export function createActionButton(): UIButton {
  const button = (
    <UIButton
      frame={CGRectMake(inset, height - actionBottom - actionHeight, contentWidth, actionHeight)}
      backgroundColor={UIColor.systemBlueColor()}
      tintColor={UIColor.whiteColor()}
      title={actionTitle}
      titleColor={UIColor.whiteColor()}
      layer={{ cornerRadius: 20 }}
    />
  ) as UIButton
  const target = ObjCTarget.create(() => {
    button.setTitle('Target/action armed', 0)
  })
  const action = UIAction.actionWithHandler(() => {
    presentNativeAlert(button)
  })
  button.addTarget(target, ObjCTargetAction, UIControlEventTouchDown)
  button.addAction(action, UIControlEventTouchUpInside)
  return button
}

function presentNativeAlert(button: UIButton): void {
  const alert = UIAlertController.alertControllerWithTitleMessagePreferredStyle(
    'Native UIKit alert',
    'Presented from TypeScript through real UIAlertController APIs.',
    UIAlertControllerStyleAlert
  )
  const ok = UIAlertAction.actionWithTitleStyleHandler('OK', UIAlertActionStyleDefault, () => {
    button.setTitle(actionTitle, 0)
  })

  alert.addAction(ok)
  const root = UIApplication.sharedApplication().keyWindow.rootViewController
  root.presentViewControllerAnimatedCompletion(alert, true, () => {
    button.setTitle('Alert presented', 0)
  })
}

function createHeroIconBadge(): UIView {
  return (
    <UIView
      frame={CGRectMake(22, 24, 56, 56)}
      backgroundColor={UIColor.colorWithRedGreenBlueAlpha(1, 1, 1, 0.2)}
      layer={{
        cornerRadius: 18,
        masksToBounds: true
      }}
    >
      <UIImageView
        frame={CGRectMake(12, 12, 32, 32)}
        image={UIImage.systemImageNamed('sparkles')}
        tintColor={UIColor.whiteColor()}
        contentMode={1}
      />
    </UIView>
  ) as UIView
}

function createHeroTitleLabel(): UILabel {
  return (
    <UILabel
      frame={CGRectMake(92, 22, contentWidth - 116, 32)}
      text={heroTitle}
      textColor={UIColor.whiteColor()}
      font={UIFont.boldSystemFontOfSize(23)}
      numberOfLines={1}
    />
  ) as UILabel
}

function createHeroBodyLabel(): UILabel {
  return (
    <UILabel
      frame={CGRectMake(92, 58, contentWidth - 116, 45)}
      text={heroBody}
      textColor={UIColor.whiteColor()}
      alpha={0.9}
      font={UIFont.systemFontOfSize(15)}
      numberOfLines={2}
    />
  ) as UILabel
}

function createUIKitPill(): UIButton {
  return (
    <UIButton
      backgroundColor={UIColor.whiteColor()}
      title={firstPillTitle}
      titleColor={UIColor.systemIndigoColor()}
      layer={{ cornerRadius: 20 }}
    />
  ) as UIButton
}

function createLayerPill(): UIButton {
  return (
    <UIButton
      backgroundColor={UIColor.colorWithRedGreenBlueAlpha(1, 1, 1, 0.18)}
      title={secondPillTitle}
      titleColor={UIColor.whiteColor()}
      layer={{ cornerRadius: 20 }}
    />
  ) as UIButton
}

function createSymbolPill(): UIButton {
  return (
    <UIButton
      backgroundColor={UIColor.colorWithRedGreenBlueAlpha(1, 1, 1, 0.18)}
      title={thirdPillTitle}
      titleColor={UIColor.whiteColor()}
      layer={{ cornerRadius: 20 }}
    />
  ) as UIButton
}

function createBridgeStatusRow(): UIView {
  return (
    <UIView
      frame={CGRectMake(0, 58, contentWidth, 46)}
      backgroundColor={UIColor.colorWithRedGreenBlueAlpha(1, 1, 1, 0)}
    >
      <UIView
        frame={CGRectMake(22, 0, 40, 40)}
        backgroundColor={UIColor.systemGreenColor()}
        layer={{ cornerRadius: 14 }}
      >
        <UIImageView
          frame={CGRectMake(10, 10, 20, 20)}
          image={UIImage.systemImageNamed('checkmark.seal.fill')}
          tintColor={UIColor.whiteColor()}
        />
      </UIView>
      <UILabel
        frame={CGRectMake(74, -4, contentWidth - 170, 24)}
        text={bridgeStatusTitle}
        textColor={UIColor.labelColor()}
        font={UIFont.boldSystemFontOfSize(17)}
      />
      <UILabel
        frame={CGRectMake(74, 21, contentWidth - 170, 22)}
        text={bridgeStatusDetail}
        textColor={UIColor.secondaryLabelColor()}
        font={UIFont.systemFontOfSize(13)}
      />
      <UIButton
        frame={CGRectMake(contentWidth - 84, 4, 64, 30)}
        backgroundColor={UIColor.systemGreenColor()}
        title={bridgeStatusBadge}
        titleColor={UIColor.whiteColor()}
        layer={{ cornerRadius: 15 }}
      />
    </UIView>
  ) as UIView
}

function createRenderStatusRow(): UIView {
  return (
    <UIView
      frame={CGRectMake(0, 116, contentWidth, 46)}
      backgroundColor={UIColor.colorWithRedGreenBlueAlpha(1, 1, 1, 0)}
    >
      <UIView
        frame={CGRectMake(22, 0, 40, 40)}
        backgroundColor={UIColor.systemBlueColor()}
        layer={{ cornerRadius: 14 }}
      >
        <UIImageView
          frame={CGRectMake(10, 10, 20, 20)}
          image={UIImage.systemImageNamed('rectangle.stack.fill')}
          tintColor={UIColor.whiteColor()}
        />
      </UIView>
      <UILabel
        frame={CGRectMake(74, -4, contentWidth - 170, 24)}
        text={renderStatusTitle}
        textColor={UIColor.labelColor()}
        font={UIFont.boldSystemFontOfSize(17)}
      />
      <UILabel
        frame={CGRectMake(74, 21, contentWidth - 170, 22)}
        text={renderStatusDetail}
        textColor={UIColor.secondaryLabelColor()}
        font={UIFont.systemFontOfSize(13)}
      />
    </UIView>
  ) as UIView
}

function createSwiftStatusRow(): UIView {
  return (
    <UIView
      frame={CGRectMake(0, 174, contentWidth, 46)}
      backgroundColor={UIColor.colorWithRedGreenBlueAlpha(1, 1, 1, 0)}
    >
      <UIView
        frame={CGRectMake(22, 0, 40, 40)}
        backgroundColor={UIColor.systemPurpleColor()}
        layer={{ cornerRadius: 14 }}
      >
        <UIImageView
          frame={CGRectMake(10, 10, 20, 20)}
          image={UIImage.systemImageNamed('bolt.fill')}
          tintColor={UIColor.whiteColor()}
        />
      </UIView>
      <UILabel
        frame={CGRectMake(74, -4, contentWidth - 170, 24)}
        text={swiftStatusTitle}
        textColor={UIColor.labelColor()}
        font={UIFont.boldSystemFontOfSize(17)}
      />
      <UILabel
        frame={CGRectMake(74, 21, contentWidth - 170, 22)}
        text={swiftStatusDetail}
        textColor={UIColor.secondaryLabelColor()}
        font={UIFont.systemFontOfSize(13)}
      />
    </UIView>
  ) as UIView
}
