import {
  AVCaptureDevice,
  AVCaptureFlashModeAuto,
  AVCaptureFlashModeOff,
  AVCaptureFlashModeOn,
  AVCapturePhotoOutput,
  AVCapturePhotoQualityPrioritizationBalanced,
  AVCapturePhotoQualityPrioritizationQuality,
  AVCapturePhotoQualityPrioritizationSpeed,
  AVCaptureSession,
  AVCaptureSessionPresetHigh,
  AVCaptureSessionPresetMedium,
  AVCaptureSessionPresetPhoto,
} from '@geastack/apple/AVFoundation'
import { CGRectMake, CGSizeMake } from '@geastack/apple/CoreGraphics'
import { NSDictionary, NSURL } from '@geastack/apple/Foundation'
import { CLLocationManager } from '@geastack/apple/CoreLocation'
import { MKMapTypeStandard, MKMapView, MKUserTrackingModeFollow } from '@geastack/apple/MapKit'
import {
  UIApplication,
  UIButton,
  UIAction,
  UIColor,
  UIControlEventTouchUpInside,
  UIFont,
  UIImage,
  UIImageView,
  UILabel,
  UIModalPresentationFullScreen,
  UIView,
  UIViewController,
} from '@geastack/apple/UIKit'
import {
  appSubtitle,
  appTitle,
  cameraDetail,
  cameraFlashAuto,
  cameraFlashOff,
  cameraFlashOn,
  cameraFocusUpdated,
  cameraGridOff,
  cameraGridOn,
  cameraNoCamera,
  cameraTitle,
  cameraToolsHidden,
  cameraToolsVisible,
  locationIdle,
  mapDetail,
  mapTitle,
} from './content'
import { createCameraLayout, createOverviewLayout, type CameraLayout, type OverviewLayout } from './layout'
import {
  applyAutoExposureAndFocusAtPoint,
  applyCameraZoom,
  applyCenterAutoExposureAndFocus,
  applyCameraSessionPreset,
  applyContinuousFocus,
  applyExposureBias,
  applyLockedFocus,
  applyManualExposure,
  applyWhiteBalanceMode,
  cameraZoomText,
  configureCamera,
  configureMap,
  capturePhotoToLibrary,
  createCameraLensModel,
  defaultCameraLensModel,
  lensZoomAt,
  refreshLocation,
  startCamera,
  stopCamera,
  type CameraLensModel,
} from './native'

export function createDeviceShowcaseRoot(): UIView {
  const layout = createOverviewLayout()
  const locationManager = new CLLocationManager()
  const mapView = createMapView(layout)
  const locationStatusLabel = createStatusValueLabel(layout, locationIdle, 36)
  const cameraStatusLabel = createStatusValueLabel(layout, 'Camera idle', 78)
  const locateButton = createActionButton(layout, 'Locate', 0)
  const cameraButton = createActionButton(layout, 'Open camera', 1)

  locateButton.addAction(UIAction.actionWithHandler(() => {
    refreshLocation(mapView, locationManager, locationStatusLabel)
  }), UIControlEventTouchUpInside)
  cameraButton.addAction(UIAction.actionWithHandler(() => {
    presentCameraController()
  }), UIControlEventTouchUpInside)

  const root = (
    <UIView
      frame={CGRectMake(0, 0, layout.width, layout.height)}
      backgroundColor={UIColor.systemGroupedBackgroundColor()}
      tintColor={UIColor.systemBlueColor()}
    >
      {createTitleLabel(layout)}
      {createSubtitleLabel(layout)}
      {createMapCard(layout, mapView)}
      {createCameraLaunchCard(layout)}
      {createStatusPanel(layout, locationStatusLabel, cameraStatusLabel)}
      {locateButton}
      {cameraButton}
    </UIView>
  ) as UIView

  configureMap(mapView, locationManager)
  return root
}

function presentCameraController(): void {
  const layout = createCameraLayout()
  const cameraController = new UIViewController()
  cameraController.modalPresentationStyle = UIModalPresentationFullScreen
  const rootController = UIApplication.sharedApplication().keyWindow.rootViewController
  const cameraSession = new AVCaptureSession()
  const photoOutput = new AVCapturePhotoOutput()
  const previewHost = createCameraPreviewHost(layout)
  const cameraGrid = createCameraGrid(layout)
  const flashOverlay = createCaptureFlashOverlay(layout)
  const focusReticle = createFocusReticle(layout)
  const photosButton = createCaptureSaveButton(layout)
  const statusLabel = createCameraStatusLabel(layout, 'Preparing')
  const closeButton = createCameraCloseButton(layout)
  const flashButton = createTopIconButton(layout, layout.controlInset + 50, 'bolt.fill', 'Flash')
  const topBadgeWidth = layout.width >= 430 ? 64 : 54
  const resolutionButtonX = layout.controlInset + (layout.width >= 430 ? 100 : 96)
  const gridButtonX = layout.width - layout.controlInset - 42
  const resolutionPrimaryLabel = createTopBadgePrimaryLabel(topBadgeWidth, '48MP')
  const resolutionSecondaryLabel = createTopBadgeSecondaryLabel(topBadgeWidth, 'MAX')
  const resolutionButton = createTopBadgeButton(
    layout,
    resolutionButtonX,
    topBadgeWidth,
    resolutionPrimaryLabel,
    resolutionSecondaryLabel,
    'Photo resolution',
  )
  const optionsButton = createCameraOptionsButton(layout)
  const gridButton = createTopIconButton(layout, gridButtonX, 'square.grid.3x3', 'Grid')
  const qualityPrimaryLabel = createTopBadgePrimaryLabel(topBadgeWidth, 'HEIF')
  const qualitySecondaryLabel = createTopBadgeSecondaryLabel(topBadgeWidth, 'MAX')
  const qualityButton = createTopBadgeButton(
    layout,
    gridButtonX - 10 - topBadgeWidth,
    topBadgeWidth,
    qualityPrimaryLabel,
    qualitySecondaryLabel,
    'Photo quality',
  )
  const cameraDevice = configureCamera(cameraSession, previewHost, photoOutput, statusLabel)
  const lensModel = cameraDevice ? createCameraLensModel(cameraDevice) : defaultCameraLensModel()
  const lens0Button = createLensButton(layout, lensModel, 0)
  const lens1Button = createLensButton(layout, lensModel, 1)
  const lens2Button = createLensButton(layout, lensModel, 2)
  const lens3Button = createLensButton(layout, lensModel, 3)
  const lens4Button = createLensButton(layout, lensModel, 4)
  const focusButton = createCameraUtilityButton(layout)
  const shutterButton = createShutterButton(layout)
  const isoValueLabel = createMetricValueLabel(layout, '100', false)
  const shutterValueLabel = createMetricValueLabel(layout, '1/250', false)
  const evValueLabel = createMetricValueLabel(layout, '0.0', true)
  const focusValueLabel = createMetricValueLabel(layout, 'AF-C', false)
  const wbValueLabel = createMetricValueLabel(layout, 'AUTO', false)
  const isoButton = createMetricButton(layout, 0, 'ISO', isoValueLabel)
  const shutterMetricButton = createMetricButton(layout, 1, 'SHUTTER', shutterValueLabel)
  const evButton = createMetricButton(layout, 2, 'EV', evValueLabel)
  const focusMetricButton = createMetricButton(layout, 3, 'FOCUS', focusValueLabel)
  const wbButton = createMetricButton(layout, 4, 'WB', wbValueLabel)
  const metricsTray = createCameraMetricsTray(layout, isoButton, shutterMetricButton, evButton, focusMetricButton, wbButton)
  const lensRail = createLensRail(layout, lensModel, lens0Button, lens1Button, lens2Button, lens3Button, lens4Button)
  const focusTapLayer = createFocusTapLayer(layout, cameraDevice, statusLabel, focusReticle, focusValueLabel)
  const photoModeButton = createModeButton(layout, 0, 'PHOTO')
  const portraitModeButton = createModeButton(layout, 1, 'PORTRAIT')
  const streetModeButton = createModeButton(layout, 2, 'STREET')
  const videoModeButton = createModeButton(layout, 3, 'VIDEO')
  const proModeButton = createModeButton(layout, 4, 'PRO')
  const modeMarker = createModeMarker(layout, 0)
  const modeStrip = createModeStrip(
    layout,
    photoModeButton,
    portraitModeButton,
    streetModeButton,
    videoModeButton,
    proModeButton,
    modeMarker,
  )
  cameraGrid.userInteractionEnabled = false
  flashOverlay.userInteractionEnabled = false
  focusReticle.userInteractionEnabled = false
  flashButton.tag = 0
  gridButton.tag = 1
  optionsButton.tag = 1
  resolutionButton.tag = 0
  qualityButton.tag = 0
  photosButton.tag = 0
  isoButton.tag = 0
  shutterMetricButton.tag = 0
  evButton.tag = 1
  focusMetricButton.tag = 0
  wbButton.tag = 0

  closeButton.addAction(UIAction.actionWithHandler(() => {
    stopCamera(cameraSession)
    cameraController.dismissViewControllerAnimatedCompletion(true, () => {})
  }), UIControlEventTouchUpInside)

  flashButton.addAction(UIAction.actionWithHandler(() => {
    let flashIndex = flashButton.tag + 1
    if (flashIndex > 2) flashIndex = 0
    flashButton.tag = flashIndex
    if (flashIndex === 0) {
      statusLabel.text = cameraFlashOff
      flashButton.backgroundColor = UIColor.colorWithRedGreenBlueAlpha(1, 1, 1, 0.1)
    } else if (flashIndex === 1) {
      statusLabel.text = cameraFlashAuto
      flashButton.backgroundColor = UIColor.colorWithRedGreenBlueAlpha(1, 0.84, 0, 0.24)
    } else {
      statusLabel.text = cameraFlashOn
      flashButton.backgroundColor = UIColor.colorWithRedGreenBlueAlpha(1, 0.84, 0, 0.32)
    }
  }), UIControlEventTouchUpInside)

  gridButton.addAction(UIAction.actionWithHandler(() => {
    const gridVisible = gridButton.tag === 0
    gridButton.tag = gridVisible ? 1 : 0
    cameraGrid.hidden = !gridVisible
    statusLabel.text = gridVisible ? cameraGridOn : cameraGridOff
  }), UIControlEventTouchUpInside)

  optionsButton.addAction(UIAction.actionWithHandler(() => {
    const toolsVisible = optionsButton.tag === 0
    optionsButton.tag = toolsVisible ? 1 : 0
    metricsTray.hidden = !toolsVisible
    lensRail.hidden = !toolsVisible
    statusLabel.text = toolsVisible ? cameraToolsVisible : cameraToolsHidden
  }), UIControlEventTouchUpInside)

  resolutionButton.addAction(UIAction.actionWithHandler(() => {
    const nextTag = nextWrappedTag(resolutionButton.tag, 2)
    resolutionButton.tag = nextTag
    applyResolutionBadge(nextTag, resolutionPrimaryLabel, resolutionSecondaryLabel)
    applyCameraSessionPreset(cameraSession, resolutionPresetForTag(nextTag), statusLabel)
  }), UIControlEventTouchUpInside)

  qualityButton.addAction(UIAction.actionWithHandler(() => {
    const nextTag = nextWrappedTag(qualityButton.tag, 2)
    qualityButton.tag = nextTag
    applyQualityBadge(nextTag, qualityPrimaryLabel, qualitySecondaryLabel)
    statusLabel.text = qualityStatusForTag(nextTag)
  }), UIControlEventTouchUpInside)

  shutterButton.addAction(UIAction.actionWithHandler(() => {
    if (!cameraDevice) {
      statusLabel.text = cameraNoCamera
      return
    }
    photosButton.tag = 1
    capturePhotoToLibrary(cameraDevice, photoOutput, statusLabel, shutterButton, flashOverlay, photosButton, flashModeForTag(flashButton.tag), photoQualityForTag(qualityButton.tag), (success: boolean) => {
      photosButton.tag = success ? 2 : 3
      photosButton.backgroundColor = success
        ? UIColor.colorWithRedGreenBlueAlpha(1, 0.84, 0, 0.26)
        : UIColor.colorWithRedGreenBlueAlpha(1, 0.18, 0.14, 0.22)
    })
  }), UIControlEventTouchUpInside)

  photosButton.addAction(UIAction.actionWithHandler(() => {
    openPhotosApp(statusLabel)
  }), UIControlEventTouchUpInside)

  wireMetricControls(
    cameraDevice,
    statusLabel,
    isoButton,
    isoValueLabel,
    shutterMetricButton,
    shutterValueLabel,
    evButton,
    evValueLabel,
    focusMetricButton,
    focusValueLabel,
    wbButton,
    wbValueLabel,
  )

  wireModeControls(
    layout,
    statusLabel,
    modeMarker,
    photoModeButton,
    portraitModeButton,
    streetModeButton,
    videoModeButton,
    proModeButton,
  )

  if (cameraDevice) {
    wireCameraControls(
      layout,
      cameraDevice,
      lensModel,
      statusLabel,
      lens0Button,
      lens1Button,
      lens2Button,
      lens3Button,
      lens4Button,
      focusButton,
      focusReticle,
      focusValueLabel,
    )
  } else {
    wireFallbackCameraControls(
      layout,
      lensModel,
      statusLabel,
      lens0Button,
      lens1Button,
      lens2Button,
      lens3Button,
      lens4Button,
      focusButton,
      focusReticle,
      focusValueLabel,
    )
  }

  const cameraRoot = (
    <UIView frame={CGRectMake(0, 0, layout.width, layout.height)} backgroundColor={UIColor.blackColor()}>
      {previewHost}
      {cameraGrid}
      {focusTapLayer}
      {flashOverlay}
      {focusReticle}
      {createTopCameraHud(layout, closeButton, flashButton, resolutionButton, optionsButton, qualityButton, gridButton, statusLabel)}
      {lensRail}
      {createBottomCameraPanel(
        layout,
        metricsTray,
        photosButton,
        focusButton,
        shutterButton,
        modeStrip,
      )}
    </UIView>
  ) as UIView

  cameraController.view = cameraRoot
  rootController.presentViewControllerAnimatedCompletion(cameraController, true, () => {
    if (cameraDevice) startCamera(cameraSession, statusLabel)
  })
}

function wireCameraControls(
  layout: CameraLayout,
  cameraDevice: AVCaptureDevice,
  lensModel: CameraLensModel,
  statusLabel: UILabel,
  lens0Button: UIButton,
  lens1Button: UIButton,
  lens2Button: UIButton,
  lens3Button: UIButton,
  lens4Button: UIButton,
  focusButton: UIButton,
  focusReticle: UIView,
  focusValueLabel: UILabel,
): void {
  refreshLensButtons(lensModel, lensModel.z0, lens0Button, lens1Button, lens2Button, lens3Button, lens4Button)
  lens0Button.addAction(UIAction.actionWithHandler(() => {
    applyLensZoom(cameraDevice, lensModel, 0, statusLabel, lens0Button, lens1Button, lens2Button, lens3Button, lens4Button)
  }), UIControlEventTouchUpInside)
  lens1Button.addAction(UIAction.actionWithHandler(() => {
    applyLensZoom(cameraDevice, lensModel, 1, statusLabel, lens0Button, lens1Button, lens2Button, lens3Button, lens4Button)
  }), UIControlEventTouchUpInside)
  lens2Button.addAction(UIAction.actionWithHandler(() => {
    applyLensZoom(cameraDevice, lensModel, 2, statusLabel, lens0Button, lens1Button, lens2Button, lens3Button, lens4Button)
  }), UIControlEventTouchUpInside)
  lens3Button.addAction(UIAction.actionWithHandler(() => {
    applyLensZoom(cameraDevice, lensModel, 3, statusLabel, lens0Button, lens1Button, lens2Button, lens3Button, lens4Button)
  }), UIControlEventTouchUpInside)
  lens4Button.addAction(UIAction.actionWithHandler(() => {
    applyLensZoom(cameraDevice, lensModel, 4, statusLabel, lens0Button, lens1Button, lens2Button, lens3Button, lens4Button)
  }), UIControlEventTouchUpInside)
  focusButton.addAction(UIAction.actionWithHandler(() => {
    moveFocusReticle(layout, focusReticle, 0.5, 0.5)
    focusValueLabel.text = 'AE/AF'
    applyCenterAutoExposureAndFocus(cameraDevice, statusLabel)
  }), UIControlEventTouchUpInside)
}

function wireFallbackCameraControls(
  layout: CameraLayout,
  lensModel: CameraLensModel,
  statusLabel: UILabel,
  lens0Button: UIButton,
  lens1Button: UIButton,
  lens2Button: UIButton,
  lens3Button: UIButton,
  lens4Button: UIButton,
  focusButton: UIButton,
  focusReticle: UIView,
  focusValueLabel: UILabel,
): void {
  refreshLensButtons(lensModel, lensModel.z0, lens0Button, lens1Button, lens2Button, lens3Button, lens4Button)
  lens0Button.addAction(UIAction.actionWithHandler(() => {
    applyFallbackLensZoom(lensModel, 0, statusLabel, lens0Button, lens1Button, lens2Button, lens3Button, lens4Button)
  }), UIControlEventTouchUpInside)
  lens1Button.addAction(UIAction.actionWithHandler(() => {
    applyFallbackLensZoom(lensModel, 1, statusLabel, lens0Button, lens1Button, lens2Button, lens3Button, lens4Button)
  }), UIControlEventTouchUpInside)
  lens2Button.addAction(UIAction.actionWithHandler(() => {
    applyFallbackLensZoom(lensModel, 2, statusLabel, lens0Button, lens1Button, lens2Button, lens3Button, lens4Button)
  }), UIControlEventTouchUpInside)
  lens3Button.addAction(UIAction.actionWithHandler(() => {
    applyFallbackLensZoom(lensModel, 3, statusLabel, lens0Button, lens1Button, lens2Button, lens3Button, lens4Button)
  }), UIControlEventTouchUpInside)
  lens4Button.addAction(UIAction.actionWithHandler(() => {
    applyFallbackLensZoom(lensModel, 4, statusLabel, lens0Button, lens1Button, lens2Button, lens3Button, lens4Button)
  }), UIControlEventTouchUpInside)
  focusButton.addAction(UIAction.actionWithHandler(() => {
    moveFocusReticle(layout, focusReticle, 0.5, 0.5)
    focusValueLabel.text = 'AE/AF'
    statusLabel.text = cameraFocusUpdated
  }), UIControlEventTouchUpInside)
}

function applyFallbackLensZoom(
  lensModel: CameraLensModel,
  index: number,
  statusLabel: UILabel,
  lens0Button: UIButton,
  lens1Button: UIButton,
  lens2Button: UIButton,
  lens3Button: UIButton,
  lens4Button: UIButton,
): void {
  if (index >= lensModel.count) return
  const zoom = lensZoomAt(lensModel, index)
  statusLabel.text = 'LENS ' + cameraZoomText(zoom, lensModel)
  refreshLensButtons(lensModel, zoom, lens0Button, lens1Button, lens2Button, lens3Button, lens4Button)
}

function flashModeForTag(tag: number): number {
  if (tag === 1) return AVCaptureFlashModeAuto
  if (tag === 2) return AVCaptureFlashModeOn
  return AVCaptureFlashModeOff
}

function photoQualityForTag(tag: number): number {
  if (tag === 1) return AVCapturePhotoQualityPrioritizationBalanced
  if (tag === 2) return AVCapturePhotoQualityPrioritizationSpeed
  return AVCapturePhotoQualityPrioritizationQuality
}

function qualityStatusForTag(tag: number): string {
  if (tag === 1) return 'QUALITY BALANCED'
  if (tag === 2) return 'QUALITY SPEED'
  return 'QUALITY MAX'
}

function applyQualityBadge(tag: number, primaryLabel: UILabel, secondaryLabel: UILabel): void {
  if (tag === 1) {
    primaryLabel.text = 'HEIF'
    secondaryLabel.text = 'BAL'
    return
  }
  if (tag === 2) {
    primaryLabel.text = 'FAST'
    secondaryLabel.text = 'SHOT'
    return
  }
  primaryLabel.text = 'HEIF'
  secondaryLabel.text = 'MAX'
}

function resolutionPresetForTag(tag: number): string {
  if (tag === 1) return AVCaptureSessionPresetHigh
  if (tag === 2) return AVCaptureSessionPresetMedium
  return AVCaptureSessionPresetPhoto
}

function applyResolutionBadge(tag: number, primaryLabel: UILabel, secondaryLabel: UILabel): void {
  if (tag === 1) {
    primaryLabel.text = '24MP'
    secondaryLabel.text = 'HIGH'
    return
  }
  if (tag === 2) {
    primaryLabel.text = '12MP'
    secondaryLabel.text = 'STD'
    return
  }
  primaryLabel.text = '48MP'
  secondaryLabel.text = 'MAX'
}

function nextWrappedTag(tag: number, maxTag: number): number {
  const next = tag + 1
  if (next > maxTag) return 0
  return next
}

function wireMetricControls(
  cameraDevice: AVCaptureDevice | null,
  statusLabel: UILabel,
  isoButton: UIButton,
  isoValueLabel: UILabel,
  shutterMetricButton: UIButton,
  shutterValueLabel: UILabel,
  evButton: UIButton,
  evValueLabel: UILabel,
  focusMetricButton: UIButton,
  focusValueLabel: UILabel,
  wbButton: UIButton,
  wbValueLabel: UILabel,
): void {
  isoButton.addAction(UIAction.actionWithHandler(() => {
    const nextTag = nextWrappedTag(isoButton.tag, 2)
    isoButton.tag = nextTag
    const iso = isoForTag(nextTag)
    isoValueLabel.text = isoTextForValue(iso)
    if (cameraDevice) {
      const appliedIso = applyManualExposure(cameraDevice, iso, shutterSecondsForTag(shutterMetricButton.tag), statusLabel)
      isoValueLabel.text = isoTextForValue(appliedIso)
    } else {
      statusLabel.text = 'ISO ' + isoTextForValue(iso)
    }
  }), UIControlEventTouchUpInside)

  shutterMetricButton.addAction(UIAction.actionWithHandler(() => {
    const nextTag = nextWrappedTag(shutterMetricButton.tag, 2)
    shutterMetricButton.tag = nextTag
    shutterValueLabel.text = shutterTextForTag(nextTag)
    if (cameraDevice) {
      const appliedIso = applyManualExposure(cameraDevice, isoForTag(isoButton.tag), shutterSecondsForTag(nextTag), statusLabel)
      isoValueLabel.text = isoTextForValue(appliedIso)
    } else {
      statusLabel.text = 'SHUTTER ' + shutterTextForTag(nextTag)
    }
  }), UIControlEventTouchUpInside)

  evButton.addAction(UIAction.actionWithHandler(() => {
    const nextTag = nextWrappedTag(evButton.tag, 2)
    evButton.tag = nextTag
    const bias = exposureBiasForTag(nextTag)
    evValueLabel.text = evTextForValue(bias)
    if (cameraDevice) {
      const appliedBias = applyExposureBias(cameraDevice, bias, statusLabel)
      evValueLabel.text = evTextForValue(appliedBias)
    } else {
      statusLabel.text = 'EV ' + evTextForValue(bias)
    }
  }), UIControlEventTouchUpInside)

  focusMetricButton.addAction(UIAction.actionWithHandler(() => {
    const locked = focusMetricButton.tag === 0
    focusMetricButton.tag = locked ? 1 : 0
    focusValueLabel.text = locked ? 'LOCK' : 'AF-C'
    if (cameraDevice) {
      if (locked) applyLockedFocus(cameraDevice, statusLabel)
      else applyContinuousFocus(cameraDevice, statusLabel)
    } else {
      statusLabel.text = locked ? 'FOCUS LOCKED' : 'FOCUS AF-C'
    }
  }), UIControlEventTouchUpInside)

  wbButton.addAction(UIAction.actionWithHandler(() => {
    const locked = wbButton.tag === 0
    wbButton.tag = locked ? 1 : 0
    wbValueLabel.text = locked ? 'LOCK' : 'AUTO'
    if (cameraDevice) {
      applyWhiteBalanceMode(cameraDevice, locked, statusLabel)
    } else {
      statusLabel.text = locked ? 'WB LOCKED' : 'WB AUTO'
    }
  }), UIControlEventTouchUpInside)
}

function openPhotosApp(statusLabel: UILabel): void {
  const url = NSURL.URLWithString('photos-redirect://')
  if (url) {
    statusLabel.text = 'OPENING PHOTOS'
    UIApplication.sharedApplication().openURLOptionsCompletionHandler(url, NSDictionary.dictionary(), (opened: boolean) => {
      statusLabel.text = opened ? 'PHOTOS OPENED' : 'PHOTOS UNAVAILABLE'
    })
    return
  }
  statusLabel.text = 'PHOTOS UNAVAILABLE'
}

function isoForTag(tag: number): number {
  if (tag === 1) return 200
  if (tag === 2) return 400
  return 100
}

function isoTextForValue(value: number): string {
  if (value < 150) return '100'
  if (value < 300) return '200'
  return '400'
}

function shutterSecondsForTag(tag: number): number {
  if (tag === 1) return 1 / 125
  if (tag === 2) return 1 / 60
  return 1 / 250
}

function shutterTextForTag(tag: number): string {
  if (tag === 1) return '1/125'
  if (tag === 2) return '1/60'
  return '1/250'
}

function exposureBiasForTag(tag: number): number {
  if (tag === 0) return -1
  if (tag === 2) return 1
  return 0
}

function evTextForValue(value: number): string {
  if (value > 0.05) return '+1.0'
  if (value < -0.05) return '-1.0'
  return '0.0'
}

function wireModeControls(
  layout: CameraLayout,
  statusLabel: UILabel,
  modeMarker: UIView,
  photoModeButton: UIButton,
  portraitModeButton: UIButton,
  streetModeButton: UIButton,
  videoModeButton: UIButton,
  proModeButton: UIButton,
): void {
  refreshModeButtons(layout, 0, modeMarker, photoModeButton, portraitModeButton, streetModeButton, videoModeButton, proModeButton)
  photoModeButton.addAction(UIAction.actionWithHandler(() => {
    selectCameraMode(layout, 0, 'PHOTO MODE', statusLabel, modeMarker, photoModeButton, portraitModeButton, streetModeButton, videoModeButton, proModeButton)
  }), UIControlEventTouchUpInside)
  portraitModeButton.addAction(UIAction.actionWithHandler(() => {
    selectCameraMode(layout, 1, 'PORTRAIT MODE', statusLabel, modeMarker, photoModeButton, portraitModeButton, streetModeButton, videoModeButton, proModeButton)
  }), UIControlEventTouchUpInside)
  streetModeButton.addAction(UIAction.actionWithHandler(() => {
    selectCameraMode(layout, 2, 'STREET MODE', statusLabel, modeMarker, photoModeButton, portraitModeButton, streetModeButton, videoModeButton, proModeButton)
  }), UIControlEventTouchUpInside)
  videoModeButton.addAction(UIAction.actionWithHandler(() => {
    selectCameraMode(layout, 3, 'VIDEO MODE', statusLabel, modeMarker, photoModeButton, portraitModeButton, streetModeButton, videoModeButton, proModeButton)
  }), UIControlEventTouchUpInside)
  proModeButton.addAction(UIAction.actionWithHandler(() => {
    selectCameraMode(layout, 4, 'PRO MODE', statusLabel, modeMarker, photoModeButton, portraitModeButton, streetModeButton, videoModeButton, proModeButton)
  }), UIControlEventTouchUpInside)
}

function selectCameraMode(
  layout: CameraLayout,
  index: number,
  status: string,
  statusLabel: UILabel,
  modeMarker: UIView,
  photoModeButton: UIButton,
  portraitModeButton: UIButton,
  streetModeButton: UIButton,
  videoModeButton: UIButton,
  proModeButton: UIButton,
): void {
  statusLabel.text = status
  refreshModeButtons(layout, index, modeMarker, photoModeButton, portraitModeButton, streetModeButton, videoModeButton, proModeButton)
}

function refreshModeButtons(
  layout: CameraLayout,
  selected: number,
  modeMarker: UIView,
  photoModeButton: UIButton,
  portraitModeButton: UIButton,
  streetModeButton: UIButton,
  videoModeButton: UIButton,
  proModeButton: UIButton,
): void {
  styleModeButton(photoModeButton, selected === 0)
  styleModeButton(portraitModeButton, selected === 1)
  styleModeButton(streetModeButton, selected === 2)
  styleModeButton(videoModeButton, selected === 3)
  styleModeButton(proModeButton, selected === 4)
  const itemWidth = layout.width / 5
  modeMarker.frame = CGRectMake(selected * itemWidth + (itemWidth - 5) / 2, 36, 5, 5)
}

function styleModeButton(button: UIButton, selected: boolean): void {
  button.setTitleColor(
    selected ? UIColor.colorWithRedGreenBlueAlpha(1, 0.84, 0, 1) : UIColor.colorWithRedGreenBlueAlpha(1, 1, 1, 0.72),
    0,
  )
}

function applyLensZoom(
  cameraDevice: AVCaptureDevice,
  lensModel: CameraLensModel,
  index: number,
  statusLabel: UILabel,
  lens0Button: UIButton,
  lens1Button: UIButton,
  lens2Button: UIButton,
  lens3Button: UIButton,
  lens4Button: UIButton,
): void {
  if (index >= lensModel.count) return
  const requestedZoom = lensZoomAt(lensModel, index)
  const appliedZoom = applyCameraZoom(cameraDevice, requestedZoom, lensModel, statusLabel)
  statusLabel.text = 'LENS ' + cameraZoomText(appliedZoom, lensModel)
  refreshLensButtons(lensModel, appliedZoom, lens0Button, lens1Button, lens2Button, lens3Button, lens4Button)
}

function refreshLensButtons(
  lensModel: CameraLensModel,
  selectedZoom: number,
  lens0Button: UIButton,
  lens1Button: UIButton,
  lens2Button: UIButton,
  lens3Button: UIButton,
  lens4Button: UIButton,
): void {
  styleLensButton(lens0Button, lensModel, selectedZoom, 0)
  styleLensButton(lens1Button, lensModel, selectedZoom, 1)
  styleLensButton(lens2Button, lensModel, selectedZoom, 2)
  styleLensButton(lens3Button, lensModel, selectedZoom, 3)
  styleLensButton(lens4Button, lensModel, selectedZoom, 4)
}

function styleLensButton(button: UIButton, lensModel: CameraLensModel, selectedZoom: number, index: number): void {
  if (index >= lensModel.count) {
    button.hidden = true
    return
  }
  const selected = nearestLensIndex(lensModel, selectedZoom) === index
  button.hidden = false
  button.backgroundColor = selected
    ? UIColor.colorWithRedGreenBlueAlpha(1, 1, 1, 0.22)
    : UIColor.colorWithRedGreenBlueAlpha(1, 1, 1, 0.06)
  button.setTitleColor(selected ? UIColor.colorWithRedGreenBlueAlpha(1, 0.84, 0, 1) : UIColor.whiteColor(), 0)
}

function nearestLensIndex(lensModel: CameraLensModel, selectedZoom: number): number {
  let nearest = 0
  let nearestDistance = 100000
  for (let i = 0; i < lensModel.count; i++) {
    const zoom = lensZoomAt(lensModel, i)
    let distance = selectedZoom - zoom
    if (distance < 0) distance = -distance
    if (distance < nearestDistance) {
      nearest = i
      nearestDistance = distance
    }
  }
  return nearest
}

function cameraZoomTickText(nativeZoom: number, lensModel: CameraLensModel): string {
  const text = cameraZoomText(nativeZoom, lensModel)
  if (text === '0.5x') return '.5'
  if (text === '1x') return '1'
  if (text === '2x') return '2'
  if (text === '4x') return '4'
  if (text === '8x') return '8'
  return text
}

function createTitleLabel(layout: OverviewLayout): UILabel {
  return (
    <UILabel
      frame={CGRectMake(layout.inset, layout.titleTop, layout.contentWidth, 34)}
      text={appTitle}
      textColor={UIColor.labelColor()}
      font={UIFont.boldSystemFontOfSize(28)}
      numberOfLines={1}
    />
  ) as UILabel
}

function createSubtitleLabel(layout: OverviewLayout): UILabel {
  return (
    <UILabel
      frame={CGRectMake(layout.inset, layout.titleTop + 38, layout.contentWidth, 40)}
      text={appSubtitle}
      textColor={UIColor.secondaryLabelColor()}
      font={UIFont.systemFontOfSize(15)}
      numberOfLines={2}
    />
  ) as UILabel
}

function createMapView(layout: OverviewLayout): MKMapView {
  return (
    <MKMapView
      frame={CGRectMake(0, 58, layout.contentWidth, layout.mapHeight - 58)}
      mapType={MKMapTypeStandard}
      showsUserLocation={true}
      userTrackingMode={MKUserTrackingModeFollow}
      clipsToBounds={true}
      layer={{ cornerRadius: layout.cardRadius - 4 }}
    />
  ) as MKMapView
}

function createMapCard(layout: OverviewLayout, mapView: MKMapView): UIView {
  return (
    <UIView
      frame={CGRectMake(layout.inset, layout.mapTop, layout.contentWidth, layout.mapHeight)}
      backgroundColor={UIColor.secondarySystemGroupedBackgroundColor()}
      layer={{
        cornerRadius: layout.cardRadius,
        shadowOpacity: 0.12,
        shadowRadius: 16,
        shadowOffset: CGSizeMake(0, 8),
      }}
    >
      {createMapIcon()}
      <UILabel
        frame={CGRectMake(58, 16, layout.contentWidth - 76, 22)}
        text={mapTitle}
        textColor={UIColor.labelColor()}
        font={UIFont.boldSystemFontOfSize(18)}
      />
      <UILabel
        frame={CGRectMake(58, 38, layout.contentWidth - 76, 18)}
        text={mapDetail}
        textColor={UIColor.secondaryLabelColor()}
        font={UIFont.systemFontOfSize(12)}
      />
      {mapView}
    </UIView>
  ) as UIView
}

function createCameraLaunchCard(layout: OverviewLayout): UIView {
  return (
    <UIView
      frame={CGRectMake(layout.inset, layout.cameraTop, layout.contentWidth, layout.cameraHeight)}
      backgroundColor={UIColor.secondarySystemGroupedBackgroundColor()}
      layer={{
        cornerRadius: layout.cardRadius,
        shadowOpacity: 0.1,
        shadowRadius: 14,
        shadowOffset: CGSizeMake(0, 7),
      }}
    >
      {createCameraIcon()}
      <UILabel
        frame={CGRectMake(58, 16, layout.contentWidth - 76, 22)}
        text={cameraTitle}
        textColor={UIColor.labelColor()}
        font={UIFont.boldSystemFontOfSize(18)}
      />
      <UILabel
        frame={CGRectMake(58, 40, layout.contentWidth - 76, 34)}
        text={cameraDetail}
        textColor={UIColor.secondaryLabelColor()}
        font={UIFont.systemFontOfSize(12)}
        numberOfLines={2}
      />
      <UIImageView
        frame={CGRectMake(layout.contentWidth - 52, layout.cameraHeight - 48, 30, 30)}
        image={UIImage.systemImageNamed('camera.aperture')}
        tintColor={UIColor.systemOrangeColor()}
        contentMode={1}
      />
    </UIView>
  ) as UIView
}

function createStatusPanel(layout: OverviewLayout, locationStatusLabel: UILabel, cameraStatusLabel: UILabel): UIView {
  return (
    <UIView
      frame={CGRectMake(layout.inset, layout.statusTop, layout.contentWidth, layout.statusHeight)}
      backgroundColor={UIColor.secondarySystemGroupedBackgroundColor()}
      layer={{ cornerRadius: layout.cardRadius }}
    >
      <UILabel
        frame={CGRectMake(18, 14, layout.contentWidth - 36, 20)}
        text="Native callbacks"
        textColor={UIColor.secondaryLabelColor()}
        font={UIFont.systemFontOfSize(13)}
      />
      <UILabel
        frame={CGRectMake(18, 40, 126, 22)}
        text="CoreLocation"
        textColor={UIColor.labelColor()}
        font={UIFont.boldSystemFontOfSize(15)}
      />
      <UILabel
        frame={CGRectMake(18, 82, 126, 22)}
        text="AVFoundation"
        textColor={UIColor.labelColor()}
        font={UIFont.boldSystemFontOfSize(15)}
      />
      {locationStatusLabel}
      {cameraStatusLabel}
    </UIView>
  ) as UIView
}

function createStatusValueLabel(layout: OverviewLayout, text: string, y: number): UILabel {
  return (
    <UILabel
      frame={CGRectMake(152, y, layout.contentWidth - 170, 32)}
      text={text}
      textColor={UIColor.secondaryLabelColor()}
      font={UIFont.systemFontOfSize(13)}
      numberOfLines={2}
      textAlignment={2}
    />
  ) as UILabel
}

function createActionButton(layout: OverviewLayout, title: string, index: number): UIButton {
  const x = layout.inset + index * (layout.buttonWidth + layout.buttonGap)
  return (
    <UIButton
      frame={CGRectMake(x, layout.buttonTop, layout.buttonWidth, layout.buttonHeight)}
      title={title}
      titleColor={UIColor.whiteColor()}
      backgroundColor={index === 0 ? UIColor.systemBlueColor() : UIColor.systemOrangeColor()}
      layer={{ cornerRadius: 14 }}
    />
  ) as UIButton
}

function createMapIcon(): UIImageView {
  return (
    <UIImageView
      frame={CGRectMake(18, 18, 28, 28)}
      image={UIImage.systemImageNamed('map.fill')}
      tintColor={UIColor.systemBlueColor()}
      contentMode={1}
    />
  ) as UIImageView
}

function createCameraIcon(): UIImageView {
  return (
    <UIImageView
      frame={CGRectMake(18, 18, 28, 28)}
      image={UIImage.systemImageNamed('camera.viewfinder')}
      tintColor={UIColor.systemOrangeColor()}
      contentMode={1}
    />
  ) as UIImageView
}

function createCameraPreviewHost(layout: CameraLayout): UIView {
  return (
    <UIView
      frame={CGRectMake(0, layout.previewTop, layout.width, layout.previewHeight)}
      backgroundColor={UIColor.blackColor()}
      clipsToBounds={true}
    />
  ) as UIView
}

function createTopCameraHud(
  layout: CameraLayout,
  closeButton: UIButton,
  flashButton: UIButton,
  resolutionButton: UIButton,
  optionsButton: UIButton,
  qualityButton: UIButton,
  gridButton: UIButton,
  statusLabel: UILabel,
): UIView {
  return (
    <UIView
      frame={CGRectMake(0, 0, layout.width, layout.topBarHeight)}
      backgroundColor={UIColor.blackColor()}
    >
      {closeButton}
      {flashButton}
      {resolutionButton}
      {optionsButton}
      {qualityButton}
      {gridButton}
      {statusLabel}
    </UIView>
  ) as UIView
}

function createTopIconButton(layout: CameraLayout, x: number, iconName: string, accessibilityLabel: string): UIButton {
  const button = (
    <UIButton
      frame={CGRectMake(x, layout.safeTop + 6, 42, 42)}
      title=""
      titleColor={UIColor.whiteColor()}
      backgroundColor={UIColor.colorWithRedGreenBlueAlpha(1, 1, 1, 0.1)}
      layer={{ cornerRadius: 14 }}
    >
      <UIImageView
        frame={CGRectMake(10, 10, 22, 22)}
        image={UIImage.systemImageNamed(iconName)}
        tintColor={UIColor.whiteColor()}
        contentMode={1}
      />
    </UIButton>
  ) as UIButton
  button.accessibilityLabel = accessibilityLabel
  return button
}

function createTopBadgeButton(
  layout: CameraLayout,
  x: number,
  width: number,
  primaryLabel: UILabel,
  secondaryLabel: UILabel,
  accessibilityLabel: string,
): UIButton {
  const button = (
    <UIButton
      frame={CGRectMake(x, layout.safeTop + 8, width, 40)}
      title=""
      titleColor={UIColor.whiteColor()}
      backgroundColor={UIColor.colorWithRedGreenBlueAlpha(1, 1, 1, 0.08)}
      layer={{ cornerRadius: 14 }}
    >
      {primaryLabel}
      {secondaryLabel}
    </UIButton>
  ) as UIButton
  button.accessibilityLabel = accessibilityLabel
  return button
}

function createTopBadgePrimaryLabel(width: number, text: string): UILabel {
  return (
    <UILabel
      frame={CGRectMake(0, 5, width, 15)}
      text={text}
      textColor={UIColor.whiteColor()}
      font={UIFont.boldSystemFontOfSize(12)}
      textAlignment={1}
      numberOfLines={1}
    />
  ) as UILabel
}

function createTopBadgeSecondaryLabel(width: number, text: string): UILabel {
  return (
    <UILabel
      frame={CGRectMake(0, 20, width, 14)}
      text={text}
      textColor={UIColor.colorWithRedGreenBlueAlpha(1, 1, 1, 0.74)}
      font={UIFont.systemFontOfSize(9)}
      textAlignment={1}
      numberOfLines={1}
    />
  ) as UILabel
}

function createCameraOptionsButton(layout: CameraLayout): UIButton {
  const button = (
    <UIButton
      frame={CGRectMake((layout.width - 50) / 2, layout.safeTop + 8, 50, 40)}
      title=""
      titleColor={UIColor.whiteColor()}
      backgroundColor={UIColor.colorWithRedGreenBlueAlpha(1, 1, 1, 0.08)}
      layer={{ cornerRadius: 20 }}
    >
      <UIImageView
        frame={CGRectMake(13, 8, 24, 24)}
        image={UIImage.systemImageNamed('chevron.down')}
        tintColor={UIColor.whiteColor()}
        contentMode={1}
      />
    </UIButton>
  ) as UIButton
  button.accessibilityLabel = 'Camera Options'
  return button
}

function createCameraCloseButton(layout: CameraLayout): UIButton {
  const button = (
    <UIButton
      frame={CGRectMake(layout.controlInset, layout.safeTop + 6, 42, 42)}
      title=""
      titleColor={UIColor.whiteColor()}
      backgroundColor={UIColor.colorWithRedGreenBlueAlpha(1, 1, 1, 0.12)}
      layer={{ cornerRadius: 14 }}
    >
      <UIImageView
        frame={CGRectMake(10, 10, 22, 22)}
        image={UIImage.systemImageNamed('xmark')}
        tintColor={UIColor.whiteColor()}
        contentMode={1}
      />
    </UIButton>
  ) as UIButton
  button.accessibilityLabel = 'Close'
  return button
}

function createCameraStatusLabel(layout: CameraLayout, text: string): UILabel {
  return (
    <UILabel
      frame={CGRectMake((layout.width - 170) / 2, layout.safeTop + 66, 170, 18)}
      text={text}
      textColor={UIColor.colorWithRedGreenBlueAlpha(0.25, 1, 0.42, 1)}
      font={UIFont.boldSystemFontOfSize(10)}
      textAlignment={1}
      numberOfLines={1}
    />
  ) as UILabel
}

function createCameraGrid(layout: CameraLayout): UIView {
  const thirdWidth = layout.width / 3
  const thirdHeight = layout.previewHeight / 3
  const lineColor = UIColor.colorWithRedGreenBlueAlpha(1, 1, 1, 0.28)
  return (
    <UIView frame={CGRectMake(0, layout.previewTop, layout.width, layout.previewHeight)}>
      <UIView frame={CGRectMake(thirdWidth, 0, 1, layout.previewHeight)} backgroundColor={lineColor} />
      <UIView frame={CGRectMake(thirdWidth * 2, 0, 1, layout.previewHeight)} backgroundColor={lineColor} />
      <UIView frame={CGRectMake(0, thirdHeight, layout.width, 1)} backgroundColor={lineColor} />
      <UIView frame={CGRectMake(0, thirdHeight * 2, layout.width, 1)} backgroundColor={lineColor} />
    </UIView>
  ) as UIView
}

function createFocusTapLayer(
  layout: CameraLayout,
  cameraDevice: AVCaptureDevice | null,
  statusLabel: UILabel,
  focusReticle: UIView,
  focusValueLabel: UILabel,
): UIView {
  const cellWidth = layout.width / 3
  const cellHeight = layout.previewHeight / 3
  return (
    <UIView frame={CGRectMake(0, layout.previewTop, layout.width, layout.previewHeight)}>
      {createFocusZoneButton(layout, cameraDevice, statusLabel, focusReticle, focusValueLabel, 0, 0, cellWidth, cellHeight)}
      {createFocusZoneButton(layout, cameraDevice, statusLabel, focusReticle, focusValueLabel, 1, 0, cellWidth, cellHeight)}
      {createFocusZoneButton(layout, cameraDevice, statusLabel, focusReticle, focusValueLabel, 2, 0, cellWidth, cellHeight)}
      {createFocusZoneButton(layout, cameraDevice, statusLabel, focusReticle, focusValueLabel, 0, 1, cellWidth, cellHeight)}
      {createFocusZoneButton(layout, cameraDevice, statusLabel, focusReticle, focusValueLabel, 1, 1, cellWidth, cellHeight)}
      {createFocusZoneButton(layout, cameraDevice, statusLabel, focusReticle, focusValueLabel, 2, 1, cellWidth, cellHeight)}
      {createFocusZoneButton(layout, cameraDevice, statusLabel, focusReticle, focusValueLabel, 0, 2, cellWidth, cellHeight)}
      {createFocusZoneButton(layout, cameraDevice, statusLabel, focusReticle, focusValueLabel, 1, 2, cellWidth, cellHeight)}
      {createFocusZoneButton(layout, cameraDevice, statusLabel, focusReticle, focusValueLabel, 2, 2, cellWidth, cellHeight)}
    </UIView>
  ) as UIView
}

function createFocusZoneButton(
  layout: CameraLayout,
  cameraDevice: AVCaptureDevice | null,
  statusLabel: UILabel,
  focusReticle: UIView,
  focusValueLabel: UILabel,
  col: number,
  row: number,
  cellWidth: number,
  cellHeight: number,
): UIButton {
  const xNorm = (col + 0.5) / 3
  const yNorm = (row + 0.5) / 3
  const button = (
    <UIButton
      frame={CGRectMake(col * cellWidth, row * cellHeight, cellWidth, cellHeight)}
      title=""
      titleColor={UIColor.whiteColor()}
      backgroundColor={UIColor.colorWithRedGreenBlueAlpha(0, 0, 0, 0)}
    />
  ) as UIButton
  button.accessibilityLabel = 'Focus point'
  button.addAction(UIAction.actionWithHandler(() => {
    moveFocusReticle(layout, focusReticle, xNorm, yNorm)
    focusValueLabel.text = 'AE/AF'
    if (cameraDevice) applyAutoExposureAndFocusAtPoint(cameraDevice, xNorm, yNorm, statusLabel)
    else statusLabel.text = cameraFocusUpdated
  }), UIControlEventTouchUpInside)
  return button
}

function moveFocusReticle(layout: CameraLayout, focusReticle: UIView, xNorm: number, yNorm: number): void {
  const size = 86
  const x = xNorm * layout.width - size / 2
  const y = layout.previewTop + yNorm * layout.previewHeight - size / 2
  focusReticle.frame = CGRectMake(x, y, size, size)
  focusReticle.hidden = false
}

function createBottomCameraPanel(
  layout: CameraLayout,
  metricsTray: UIView,
  photosButton: UIButton,
  focusButton: UIButton,
  shutterButton: UIButton,
  modeStrip: UIView,
): UIView {
  return (
    <UIView
      frame={CGRectMake(0, layout.bottomPanelTop, layout.width, layout.bottomPanelHeight)}
      backgroundColor={UIColor.colorWithRedGreenBlueAlpha(0, 0, 0, 0)}
    >
      {metricsTray}
      {focusButton}
      {shutterButton}
      {photosButton}
      {modeStrip}
    </UIView>
  ) as UIView
}

function createCameraMetricsTray(
  layout: CameraLayout,
  isoButton: UIButton,
  shutterButton: UIButton,
  evButton: UIButton,
  focusButton: UIButton,
  wbButton: UIButton,
): UIView {
  return (
    <UIView
      frame={CGRectMake(layout.controlInset, 22, layout.controlWidth, layout.metricsTrayHeight)}
      backgroundColor={UIColor.colorWithRedGreenBlueAlpha(0.03, 0.03, 0.03, 0.84)}
      layer={{ cornerRadius: 28 }}
    >
      {isoButton}
      {shutterButton}
      {evButton}
      {focusButton}
      {wbButton}
    </UIView>
  ) as UIView
}

function createMetricButton(layout: CameraLayout, index: number, label: string, valueLabel: UILabel): UIButton {
  const x = index * layout.metricWidth
  const button = (
    <UIButton
      frame={CGRectMake(x, 16, layout.metricWidth, 58)}
      title=""
      titleColor={UIColor.whiteColor()}
      backgroundColor={UIColor.colorWithRedGreenBlueAlpha(1, 1, 1, 0)}
    >
      <UILabel
        frame={CGRectMake(0, 0, layout.metricWidth, 16)}
        text={label}
        textColor={UIColor.colorWithRedGreenBlueAlpha(1, 1, 1, 0.72)}
        font={UIFont.systemFontOfSize(11)}
        textAlignment={1}
      />
      {valueLabel}
    </UIButton>
  ) as UIButton
  button.accessibilityLabel = label
  return button
}

function createMetricValueLabel(layout: CameraLayout, value: string, highlighted: boolean): UILabel {
  return (
    <UILabel
      frame={CGRectMake(0, 22, layout.metricWidth, 24)}
      text={value}
      textColor={highlighted ? UIColor.colorWithRedGreenBlueAlpha(1, 0.84, 0, 1) : UIColor.whiteColor()}
      font={UIFont.systemFontOfSize(17)}
      textAlignment={1}
    />
  ) as UILabel
}

function createModeStrip(
  layout: CameraLayout,
  photoModeButton: UIButton,
  portraitModeButton: UIButton,
  streetModeButton: UIButton,
  videoModeButton: UIButton,
  proModeButton: UIButton,
  modeMarker: UIView,
): UIView {
  const y = layout.modeStripTop - layout.bottomPanelTop
  return (
    <UIView frame={CGRectMake(0, y, layout.width, 62)} backgroundColor={UIColor.blackColor()}>
      {photoModeButton}
      {portraitModeButton}
      {streetModeButton}
      {videoModeButton}
      {proModeButton}
      {modeMarker}
      <UIView
        frame={CGRectMake((layout.width - 136) / 2, 52, 136, 4)}
        backgroundColor={UIColor.colorWithRedGreenBlueAlpha(1, 1, 1, 0.88)}
        layer={{ cornerRadius: 2 }}
      />
    </UIView>
  ) as UIView
}

function createModeButton(layout: CameraLayout, index: number, title: string): UIButton {
  const itemWidth = layout.width / 5
  return (
    <UIButton
      frame={CGRectMake(index * itemWidth, 4, itemWidth, 38)}
      title={title}
      titleColor={index === 0 ? UIColor.colorWithRedGreenBlueAlpha(1, 0.84, 0, 1) : UIColor.colorWithRedGreenBlueAlpha(1, 1, 1, 0.72)}
      backgroundColor={UIColor.colorWithRedGreenBlueAlpha(0, 0, 0, 0)}
    />
  ) as UIButton
}

function createModeMarker(layout: CameraLayout, index: number): UIView {
  const itemWidth = layout.width / 5
  return (
    <UIView
      frame={CGRectMake(index * itemWidth + (itemWidth - 5) / 2, 36, 5, 5)}
      backgroundColor={UIColor.colorWithRedGreenBlueAlpha(1, 0.84, 0, 1)}
      layer={{ cornerRadius: 2.5 }}
    />
  ) as UIView
}

function createLensButton(layout: CameraLayout, lensModel: CameraLensModel, index: number): UIButton {
  return createZoomTick(layout, lensModel, index)
}

function createZoomTick(layout: CameraLayout, lensModel: CameraLensModel, index: number): UIButton {
  const x = 12 + index * (layout.lensButtonWidth + layout.lensButtonGap)
  const zoom = lensZoomAt(lensModel, index)
  const button = (
    <UIButton
      frame={CGRectMake(x, 8, layout.lensButtonWidth, 44)}
      title={cameraZoomTickText(zoom, lensModel)}
      titleColor={UIColor.whiteColor()}
      backgroundColor={UIColor.colorWithRedGreenBlueAlpha(1, 1, 1, 0.06)}
      hidden={index >= lensModel.count}
      layer={{ cornerRadius: 22 }}
    />
  ) as UIButton
  button.accessibilityLabel = cameraZoomText(zoom, lensModel)
  return button
}

function createLensRail(
  layout: CameraLayout,
  lensModel: CameraLensModel,
  lens0Button: UIButton,
  lens1Button: UIButton,
  lens2Button: UIButton,
  lens3Button: UIButton,
  lens4Button: UIButton,
): UIView {
  const totalWidth = lensModel.count * layout.lensButtonWidth + (lensModel.count - 1) * layout.lensButtonGap
  const railWidth = totalWidth + 24
  return (
    <UIView
      frame={CGRectMake((layout.width - railWidth) / 2, layout.lensRailTop, railWidth, 60)}
      backgroundColor={UIColor.colorWithRedGreenBlueAlpha(0, 0, 0, 0.72)}
      layer={{ cornerRadius: 30 }}
    >
      {lens0Button}
      {lens1Button}
      {lens2Button}
      {lens3Button}
      {lens4Button}
    </UIView>
  ) as UIView
}

function createCameraUtilityButton(layout: CameraLayout): UIButton {
  const size = 58
  const y = layout.shutterRowTop - layout.bottomPanelTop
  const button = (
    <UIButton
      frame={CGRectMake(layout.width - layout.controlInset - 112, y, size, size)}
      title=""
      titleColor={UIColor.whiteColor()}
      backgroundColor={UIColor.colorWithRedGreenBlueAlpha(1, 1, 1, 0.07)}
      layer={{ cornerRadius: size / 2 }}
    >
      <UIImageView
        frame={CGRectMake(16, 16, 26, 26)}
        image={UIImage.systemImageNamed('viewfinder')}
        tintColor={UIColor.whiteColor()}
        contentMode={1}
      />
    </UIButton>
  ) as UIButton
  button.accessibilityLabel = 'AE/AF Center'
  return button
}

function createShutterButton(layout: CameraLayout): UIButton {
  const y = layout.shutterRowTop - layout.bottomPanelTop - 6
  const button = (
    <UIButton
      frame={CGRectMake((layout.width - layout.shutterSize) / 2, y, layout.shutterSize, layout.shutterSize)}
      title=""
      titleColor={UIColor.whiteColor()}
      backgroundColor={UIColor.whiteColor()}
      layer={{ cornerRadius: layout.shutterSize / 2 }}
    />
  ) as UIButton
  button.accessibilityLabel = 'Shutter'
  return button
}

function createCaptureSaveButton(layout: CameraLayout): UIButton {
  const y = layout.shutterRowTop - layout.bottomPanelTop + 2
  const button = (
    <UIButton
      frame={CGRectMake(layout.controlInset + 22, y, 54, 54)}
      title=""
      titleColor={UIColor.whiteColor()}
      backgroundColor={UIColor.colorWithRedGreenBlueAlpha(1, 1, 1, 0.1)}
      clipsToBounds={true}
      layer={{ cornerRadius: 27 }}
    >
      <UIImageView
        frame={CGRectMake(13, 9, 28, 28)}
        image={UIImage.systemImageNamed('photo')}
        tintColor={UIColor.whiteColor()}
        contentMode={1}
      />
      <UILabel
        frame={CGRectMake(0, 34, 54, 16)}
        text="Photos"
        textColor={UIColor.whiteColor()}
        font={UIFont.boldSystemFontOfSize(8)}
        textAlignment={1}
      />
    </UIButton>
  ) as UIButton
  button.accessibilityLabel = 'Photos'
  return button
}

function createCaptureFlashOverlay(layout: CameraLayout): UIView {
  return (
    <UIView
      frame={CGRectMake(0, layout.previewTop, layout.width, layout.previewHeight)}
      backgroundColor={UIColor.colorWithRedGreenBlueAlpha(1, 1, 1, 0.82)}
      hidden={true}
    />
  ) as UIView
}

function createFocusReticle(layout: CameraLayout): UIView {
  const size = 86
  const x = (layout.width - size) / 2
  const y = layout.previewTop + (layout.previewHeight - size) / 2
  return (
    <UIView
      frame={CGRectMake(x, y, size, size)}
      backgroundColor={UIColor.colorWithRedGreenBlueAlpha(1, 0.58, 0.08, 0.14)}
      hidden={true}
      layer={{ cornerRadius: size / 2 }}
    >
      <UIView frame={CGRectMake(36, 0, 14, 3)} backgroundColor={UIColor.systemOrangeColor()} layer={{ cornerRadius: 1.5 }} />
      <UIView frame={CGRectMake(36, 83, 14, 3)} backgroundColor={UIColor.systemOrangeColor()} layer={{ cornerRadius: 1.5 }} />
      <UIView frame={CGRectMake(0, 36, 3, 14)} backgroundColor={UIColor.systemOrangeColor()} layer={{ cornerRadius: 1.5 }} />
      <UIView frame={CGRectMake(83, 36, 3, 14)} backgroundColor={UIColor.systemOrangeColor()} layer={{ cornerRadius: 1.5 }} />
    </UIView>
  ) as UIView
}
