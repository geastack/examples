import {
  AVCaptureDevice,
  AVCaptureDevicePositionBack,
  AVCaptureDeviceTypeBuiltInDualCamera,
  AVCaptureDeviceTypeBuiltInDualWideCamera,
  AVCaptureDeviceTypeBuiltInTripleCamera,
  AVCaptureDeviceTypeBuiltInWideAngleCamera,
  AVCaptureDeviceInput,
  AVCaptureExposureModeCustom,
  AVCaptureExposureModeContinuousAutoExposure,
  AVCaptureExposureModeLocked,
  AVCaptureFlashModeOff,
  AVCaptureFocusModeContinuousAutoFocus,
  AVCaptureFocusModeLocked,
  AVCapturePhotoOutput,
  AVCapturePhotoQualityPrioritizationQuality,
  AVCapturePhotoQualityPrioritizationSpeed,
  AVCapturePhotoSettings,
  AVCaptureSession,
  AVCaptureSessionPresetHigh,
  AVCaptureSessionPresetMedium,
  AVCaptureSessionPresetPhoto,
  AVCaptureVideoPreviewLayer,
  AVCaptureWhiteBalanceModeContinuousAutoWhiteBalance,
  AVCaptureWhiteBalanceModeLocked,
  AVLayerVideoGravityResizeAspectFill,
  AVMediaTypeVideo,
} from '@geastack/apple/AVFoundation'
import { CMTimeMakeWithSeconds } from '@geastack/apple/CoreMedia'
import { CGPointMake } from '@geastack/apple/CoreGraphics'
import { dispatchAsyncGlobal, dispatchAsyncMain } from '@geastack/apple/Dispatch'
import type { NSData } from '@geastack/apple/Foundation'
import {
  CLLocationCoordinate2DMake,
  CLLocationManager,
  kCLLocationAccuracyBest,
} from '@geastack/apple/CoreLocation'
import {
  MKCoordinateRegionMakeWithDistance,
  MKMapTypeStandard,
  MKMapView,
  MKUserTrackingModeFollow,
} from '@geastack/apple/MapKit'
import { PHPhotoLibrary } from '@geastack/apple/Photos'
import { UIButton, UILabel, UIView } from '@geastack/apple/UIKit'
import {
  cameraCaptured,
  cameraCaptureFailed,
  cameraCapturing,
  cameraInputUnavailable,
  cameraOutputUnavailable,
  cameraReady,
  cameraSaveFailed,
  cameraSaved,
  cameraFocusUpdated,
  cameraConfigurationUnavailable,
  cameraRunning,
  cameraUnavailable,
  cameraZoomUpdated,
  locationRequested,
  locationUpdated,
} from './content'

export interface CameraLensModel {
  count: number
  displayDivisor: number
  z0: number
  z1: number
  z2: number
  z3: number
  z4: number
  minZoom: number
  maxZoom: number
}

export function configureMap(mapView: MKMapView, locationManager: CLLocationManager): void {
  const fallbackCoordinate = CLLocationCoordinate2DMake(37.3349, -122.009)
  locationManager.desiredAccuracy = kCLLocationAccuracyBest
  locationManager.distanceFilter = 10
  mapView.mapType = MKMapTypeStandard
  mapView.showsUserLocation = true
  mapView.userTrackingMode = MKUserTrackingModeFollow
  mapView.setRegionAnimated(MKCoordinateRegionMakeWithDistance(fallbackCoordinate, 1800, 1800), false)
}

export function refreshLocation(
  mapView: MKMapView,
  locationManager: CLLocationManager,
  statusLabel: UILabel,
): void {
  locationManager.requestWhenInUseAuthorization()
  locationManager.startUpdatingLocation()
  const location = locationManager.location
  if (!location) {
    statusLabel.text = locationRequested
    return
  }
  mapView.setRegionAnimated(MKCoordinateRegionMakeWithDistance(location.coordinate, 900, 900), true)
  statusLabel.text = locationUpdated
}

export function configureCamera(
  session: AVCaptureSession,
  previewHost: UIView,
  photoOutput: AVCapturePhotoOutput,
  statusLabel: UILabel,
): AVCaptureDevice | null {
  session.beginConfiguration()
  if (session.canSetSessionPreset(AVCaptureSessionPresetPhoto)) {
    session.sessionPreset = AVCaptureSessionPresetPhoto
  }
  const device = selectBackVideoDevice()
  if (!device) {
    session.commitConfiguration()
    statusLabel.text = cameraUnavailable
    return null
  }
  const input = AVCaptureDeviceInput.deviceInputWithDevice(device)
  if (!input) {
    session.commitConfiguration()
    statusLabel.text = cameraInputUnavailable
    return null
  }
  if (session.canAddInput(input)) {
    session.addInput(input)
  }
  if (session.canAddOutput(photoOutput)) {
    session.addOutput(photoOutput)
    photoOutput.maxPhotoQualityPrioritization = AVCapturePhotoQualityPrioritizationQuality
  } else {
    session.commitConfiguration()
    statusLabel.text = cameraOutputUnavailable
    return null
  }
  const previewLayer = AVCaptureVideoPreviewLayer.layerWithSession(session)
  previewLayer.frame = previewHost.bounds
  previewLayer.videoGravity = AVLayerVideoGravityResizeAspectFill
  previewHost.layer.addSublayer(previewLayer)
  session.commitConfiguration()
  statusLabel.text = cameraReady
  return device
}

export function applyCameraSessionPreset(
  session: AVCaptureSession,
  preset: string,
  statusLabel: UILabel,
): boolean {
  session.beginConfiguration()
  if (!session.canSetSessionPreset(preset)) {
    session.commitConfiguration()
    statusLabel.text = cameraConfigurationUnavailable
    return false
  }
  session.sessionPreset = preset
  session.commitConfiguration()
  if (preset === AVCaptureSessionPresetPhoto) statusLabel.text = 'PHOTO MAX'
  else if (preset === AVCaptureSessionPresetHigh) statusLabel.text = 'HIGH RES'
  else if (preset === AVCaptureSessionPresetMedium) statusLabel.text = 'MEDIUM RES'
  else statusLabel.text = 'RESOLUTION'
  return true
}

export function capturePhotoToLibrary(
  cameraDevice: AVCaptureDevice,
  photoOutput: AVCapturePhotoOutput,
  statusLabel: UILabel,
  shutterButton: UIButton,
  flashOverlay: UIView,
  libraryButton: UIButton,
  flashMode: number,
  photoQuality: number,
  completion: (success: boolean) => void,
): void {
  if (shutterButton.alpha < 1) return
  statusLabel.text = cameraCapturing
  libraryButton.tag = 1
  shutterButton.alpha = 0.55
  flashOverlay.hidden = false
  libraryButton.alpha = 0.55
  const settings = AVCapturePhotoSettings.photoSettings()
  settings.flashMode = supportedCaptureFlashMode(cameraDevice, flashMode)
  settings.photoQualityPrioritization = supportedPhotoQuality(photoQuality)
  photoOutput.capturePhotoWithSettingsHandler(settings, (data: NSData, error: string) => {
    if (error.length > 0) {
      statusLabel.text = cameraCaptureFailed
      libraryButton.tag = 3
      shutterButton.alpha = 1
      flashOverlay.hidden = true
      libraryButton.alpha = 1
      completion(false)
      return
    }
    statusLabel.text = cameraCaptured
    PHPhotoLibrary.saveImageData(data, (success: boolean, saveError: string) => {
      shutterButton.alpha = 1
      flashOverlay.hidden = true
      libraryButton.alpha = 1
      if (success) {
        statusLabel.text = cameraSaved
        libraryButton.tag = 2
        completion(true)
        return
      }
      libraryButton.tag = 3
      if (saveError.length > 0) {
        statusLabel.text = cameraSaveFailed
        completion(false)
        return
      }
      statusLabel.text = cameraSaveFailed
      completion(false)
    })
  })
}

export function supportedCaptureFlashMode(device: AVCaptureDevice, requestedMode: number): number {
  if (requestedMode === AVCaptureFlashModeOff) return AVCaptureFlashModeOff
  if (!device.hasFlash) return AVCaptureFlashModeOff
  if (!device.isFlashModeSupported(requestedMode)) return AVCaptureFlashModeOff
  return requestedMode
}

export function supportedPhotoQuality(requestedQuality: number): number {
  let quality = requestedQuality
  if (quality < AVCapturePhotoQualityPrioritizationSpeed) quality = AVCapturePhotoQualityPrioritizationSpeed
  if (quality > AVCapturePhotoQualityPrioritizationQuality) quality = AVCapturePhotoQualityPrioritizationQuality
  return quality
}

export function createCameraLensModel(device: AVCaptureDevice): CameraLensModel {
  let minZoom = device.minAvailableVideoZoomFactor
  if (minZoom <= 0) minZoom = 1
  let displayDivisor = 1
  const switchOverFactors = device.virtualDeviceSwitchOverVideoZoomFactors
  if (minZoom >= 0.95 && switchOverFactors.length > 0 && switchOverFactors[0] >= 1.5) displayDivisor = 2
  let maxZoom = device.maxAvailableVideoZoomFactor
  const formatMaxZoom = device.activeFormat.videoMaxZoomFactor
  if (formatMaxZoom > maxZoom) maxZoom = formatMaxZoom
  const maxDisplayZoom = 8 * displayDivisor
  if (switchOverFactors.length > 0 && maxZoom < maxDisplayZoom) maxZoom = maxDisplayZoom
  if (maxZoom > maxDisplayZoom) maxZoom = maxDisplayZoom
  if (maxZoom < minZoom) maxZoom = minZoom

  const stops: number[] = []
  addDisplayLensStop(stops, 0.5, displayDivisor, minZoom, maxZoom)
  addDisplayLensStop(stops, 1, displayDivisor, minZoom, maxZoom)
  addDisplayLensStop(stops, 2, displayDivisor, minZoom, maxZoom)
  addDisplayLensStop(stops, 4, displayDivisor, minZoom, maxZoom)
  addDisplayLensStop(stops, 8, displayDivisor, minZoom, maxZoom)

  if (stops.length === 0) stops.push(1)
  let count = stops.length
  if (count > 5) count = 5
  return {
    count,
    displayDivisor,
    z0: lensStopAt(stops, 0),
    z1: lensStopAt(stops, 1),
    z2: lensStopAt(stops, 2),
    z3: lensStopAt(stops, 3),
    z4: lensStopAt(stops, 4),
    minZoom: lensStopAt(stops, 0),
    maxZoom: lensStopAt(stops, count - 1),
  }
}

export function defaultCameraLensModel(): CameraLensModel {
  return {
    count: 5,
    displayDivisor: 1,
    z0: 0.5,
    z1: 1,
    z2: 2,
    z3: 4,
    z4: 8,
    minZoom: 0.5,
    maxZoom: 8,
  }
}

export function startCamera(session: AVCaptureSession, statusLabel: UILabel): void {
  dispatchAsyncGlobal(() => {
    session.startRunning()
    dispatchAsyncMain(() => {
      const currentStatus = statusLabel.text
      if (currentStatus === 'Preparing' || currentStatus === cameraReady) {
        statusLabel.text = cameraRunning
      }
    })
  })
}

export function stopCamera(session: AVCaptureSession): void {
  dispatchAsyncGlobal(() => {
    session.stopRunning()
  })
}

export function applyCameraZoom(
  device: AVCaptureDevice,
  requestedZoom: number,
  lensModel: CameraLensModel,
  statusLabel: UILabel,
): number {
  let zoom = requestedZoom
  if (zoom < device.minAvailableVideoZoomFactor) zoom = device.minAvailableVideoZoomFactor
  let maxZoom = device.maxAvailableVideoZoomFactor
  const formatMaxZoom = device.activeFormat.videoMaxZoomFactor
  if (formatMaxZoom > maxZoom) maxZoom = formatMaxZoom
  if (lensModel.displayDivisor > 1 && maxZoom < lensModel.maxZoom) maxZoom = lensModel.maxZoom
  if (maxZoom > lensModel.maxZoom) maxZoom = lensModel.maxZoom
  if (zoom > maxZoom) zoom = maxZoom
  if (!device.lockForConfiguration()) {
    statusLabel.text = cameraZoomUpdated
    return zoom
  }
  device.videoZoomFactor = zoom
  device.unlockForConfiguration()
  statusLabel.text = cameraZoomUpdated
  return zoom
}

export function applyCenterAutoExposureAndFocus(device: AVCaptureDevice, statusLabel: UILabel): void {
  applyAutoExposureAndFocusAtPoint(device, 0.5, 0.5, statusLabel)
}

export function applyAutoExposureAndFocusAtPoint(
  device: AVCaptureDevice,
  x: number,
  y: number,
  statusLabel: UILabel,
): void {
  if (!device.lockForConfiguration()) {
    statusLabel.text = cameraFocusUpdated
    return
  }
  const focusPoint = CGPointMake(clampUnit(x), clampUnit(y))
  if (device.isFocusPointOfInterestSupported) {
    device.focusPointOfInterest = focusPoint
    if (device.isFocusModeSupported(AVCaptureFocusModeContinuousAutoFocus)) {
      device.focusMode = AVCaptureFocusModeContinuousAutoFocus
    }
  }
  if (device.isExposurePointOfInterestSupported) {
    device.exposurePointOfInterest = focusPoint
    if (device.isExposureModeSupported(AVCaptureExposureModeContinuousAutoExposure)) {
      device.exposureMode = AVCaptureExposureModeContinuousAutoExposure
    }
  }
  device.unlockForConfiguration()
  statusLabel.text = cameraFocusUpdated
}

export function applyLockedFocus(device: AVCaptureDevice, statusLabel: UILabel): boolean {
  if (!device.lockForConfiguration()) {
    statusLabel.text = cameraConfigurationUnavailable
    return false
  }
  if (device.isFocusModeSupported(AVCaptureFocusModeLocked)) {
    device.focusMode = AVCaptureFocusModeLocked
  }
  if (device.isExposureModeSupported(AVCaptureExposureModeLocked)) {
    device.exposureMode = AVCaptureExposureModeLocked
  }
  device.unlockForConfiguration()
  statusLabel.text = 'FOCUS LOCKED'
  return true
}

export function applyContinuousFocus(device: AVCaptureDevice, statusLabel: UILabel): boolean {
  if (!device.lockForConfiguration()) {
    statusLabel.text = cameraConfigurationUnavailable
    return false
  }
  if (device.isFocusModeSupported(AVCaptureFocusModeContinuousAutoFocus)) {
    device.focusMode = AVCaptureFocusModeContinuousAutoFocus
  }
  if (device.isExposureModeSupported(AVCaptureExposureModeContinuousAutoExposure)) {
    device.exposureMode = AVCaptureExposureModeContinuousAutoExposure
  }
  device.unlockForConfiguration()
  statusLabel.text = 'FOCUS AF-C'
  return true
}

export function applyExposureBias(device: AVCaptureDevice, bias: number, statusLabel: UILabel): number {
  let value = bias
  if (value < device.minExposureTargetBias) value = device.minExposureTargetBias
  if (value > device.maxExposureTargetBias) value = device.maxExposureTargetBias
  if (!device.lockForConfiguration()) {
    statusLabel.text = cameraConfigurationUnavailable
    return value
  }
  device.setExposureTargetBiasCompletionHandler(value, () => {})
  device.unlockForConfiguration()
  statusLabel.text = 'EV ' + signedDecimalText(value)
  return value
}

export function applyManualExposure(
  device: AVCaptureDevice,
  iso: number,
  shutterSeconds: number,
  statusLabel: UILabel,
): number {
  let appliedIso = iso
  if (!device.isExposureModeSupported(AVCaptureExposureModeCustom)) {
    statusLabel.text = 'EXPOSURE AUTO'
    return appliedIso
  }
  const format = device.activeFormat
  if (appliedIso < format.minISO) appliedIso = format.minISO
  if (appliedIso > format.maxISO) appliedIso = format.maxISO
  if (!device.lockForConfiguration()) {
    statusLabel.text = cameraConfigurationUnavailable
    return appliedIso
  }
  device.setExposureModeCustomWithDurationISOCompletionHandler(CMTimeMakeWithSeconds(shutterSeconds, 1000000000), appliedIso, () => {})
  device.unlockForConfiguration()
  statusLabel.text = 'MANUAL EXPOSURE'
  return appliedIso
}

export function applyWhiteBalanceMode(device: AVCaptureDevice, locked: boolean, statusLabel: UILabel): boolean {
  const mode = locked ? AVCaptureWhiteBalanceModeLocked : AVCaptureWhiteBalanceModeContinuousAutoWhiteBalance
  if (!device.isWhiteBalanceModeSupported(mode)) {
    statusLabel.text = cameraConfigurationUnavailable
    return false
  }
  if (!device.lockForConfiguration()) {
    statusLabel.text = cameraConfigurationUnavailable
    return false
  }
  device.whiteBalanceMode = mode
  device.unlockForConfiguration()
  statusLabel.text = locked ? 'WB LOCKED' : 'WB AUTO'
  return true
}

export function cameraZoomText(nativeZoom: number, lensModel: CameraLensModel): string {
  let displayZoom = nativeZoom / lensModel.displayDivisor
  if (displayZoom < 0.75) return '0.5x'
  if (displayZoom < 1.5) return '1x'
  if (displayZoom < 3) return '2x'
  if (displayZoom < 6) return '4x'
  return '8x'
}

function clampUnit(value: number): number {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function signedDecimalText(value: number): string {
  if (value > 0.05) return '+1.0'
  if (value < -0.05) return '-1.0'
  return '0.0'
}

export function lensZoomAt(lensModel: CameraLensModel, index: number): number {
  if (index === 0) return lensModel.z0
  if (index === 1) return lensModel.z1
  if (index === 2) return lensModel.z2
  if (index === 3) return lensModel.z3
  return lensModel.z4
}

export function defaultCameraFlashMode(): number {
  return AVCaptureFlashModeOff
}

function selectBackVideoDevice(): AVCaptureDevice | null {
  let device = AVCaptureDevice.defaultDeviceWithDeviceTypeMediaTypePosition(
    AVCaptureDeviceTypeBuiltInTripleCamera,
    AVMediaTypeVideo,
    AVCaptureDevicePositionBack,
  )
  if (device) return device
  device = AVCaptureDevice.defaultDeviceWithDeviceTypeMediaTypePosition(
    AVCaptureDeviceTypeBuiltInDualWideCamera,
    AVMediaTypeVideo,
    AVCaptureDevicePositionBack,
  )
  if (device) return device
  device = AVCaptureDevice.defaultDeviceWithDeviceTypeMediaTypePosition(
    AVCaptureDeviceTypeBuiltInDualCamera,
    AVMediaTypeVideo,
    AVCaptureDevicePositionBack,
  )
  if (device) return device
  device = AVCaptureDevice.defaultDeviceWithDeviceTypeMediaTypePosition(
    AVCaptureDeviceTypeBuiltInWideAngleCamera,
    AVMediaTypeVideo,
    AVCaptureDevicePositionBack,
  )
  if (device) return device
  return AVCaptureDevice.defaultDeviceWithMediaType(AVMediaTypeVideo)
}

function addLensStop(stops: number[], zoom: number, minZoom: number, maxZoom: number): void {
  if (zoom < minZoom - 0.01 || zoom > maxZoom + 0.01) return
  for (let i = 0; i < stops.length; i++) {
    const existing = stops[i]
    if (zoom > existing - 0.05 && zoom < existing + 0.05) return
  }
  stops.push(zoom)
}

function addDisplayLensStop(stops: number[], displayZoom: number, displayDivisor: number, minZoom: number, maxZoom: number): void {
  addLensStop(stops, displayZoom * displayDivisor, minZoom, maxZoom)
}

function lensStopAt(stops: number[], index: number): number {
  if (index < stops.length) return stops[index]
  if (stops.length === 0) return 1
  return stops[stops.length - 1]
}
