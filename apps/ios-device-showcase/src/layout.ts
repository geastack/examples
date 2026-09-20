import { UIScreen } from '@geastack/apple/UIKit'

export interface OverviewLayout {
  width: number
  height: number
  inset: number
  contentWidth: number
  cardRadius: number
  titleTop: number
  mapTop: number
  mapHeight: number
  cameraTop: number
  cameraHeight: number
  statusTop: number
  statusHeight: number
  buttonTop: number
  buttonHeight: number
  buttonGap: number
  buttonWidth: number
}

export interface CameraLayout {
  width: number
  height: number
  safeTop: number
  topBarHeight: number
  previewTop: number
  previewBottom: number
  previewHeight: number
  lensRailTop: number
  metricsTrayTop: number
  metricsTrayHeight: number
  shutterRowTop: number
  modeStripTop: number
  bottomPanelTop: number
  bottomPanelHeight: number
  controlInset: number
  controlWidth: number
  metricWidth: number
  lensButtonWidth: number
  lensButtonGap: number
  shutterSize: number
}

export function createOverviewLayout(): OverviewLayout {
  const screen = UIScreen.mainScreen().bounds
  const width = screen.size.width
  const height = screen.size.height
  const inset = width >= 430 ? 24 : 18
  const contentWidth = width - inset * 2
  const titleTop = height >= 900 ? 72 : 56
  const buttonHeight = height >= 900 ? 52 : 46
  const bottomInset = height >= 900 ? 34 : 16
  const buttonTop = height - bottomInset - buttonHeight
  const buttonGap = 12
  const buttonWidth = (contentWidth - buttonGap) / 2
  const statusHeight = height >= 900 ? 128 : 112
  const cameraHeight = height >= 900 ? 118 : 104
  const statusTop = buttonTop - 16 - statusHeight
  const cameraTop = statusTop - 14 - cameraHeight
  const mapTop = titleTop + 96
  let mapHeight = cameraTop - mapTop - 18
  if (mapHeight < 250) mapHeight = 250
  return {
    width,
    height,
    inset,
    contentWidth,
    cardRadius: 22,
    titleTop,
    mapTop,
    mapHeight,
    cameraTop,
    cameraHeight,
    statusTop,
    statusHeight,
    buttonTop,
    buttonHeight,
    buttonGap,
    buttonWidth,
  }
}

export function createCameraLayout(): CameraLayout {
  const screen = UIScreen.mainScreen().bounds
  const width = screen.size.width
  const height = screen.size.height
  const controlInset = width >= 430 ? 24 : 18
  const safeTop = height >= 900 ? 60 : 44
  const topBarHeight = safeTop + 104
  const bottomPanelHeight = height >= 900 ? 300 : 276
  const bottomPanelTop = height - bottomPanelHeight
  const controlWidth = width - controlInset * 2
  const previewTop = topBarHeight
  const modeStripTop = height - (height >= 900 ? 96 : 84)
  const previewBottom = modeStripTop - 8
  const previewHeight = previewBottom - previewTop
  const metricsTrayTop = bottomPanelTop + 22
  const metricsTrayHeight = height >= 900 ? 152 : 140
  const shutterRowTop = metricsTrayTop + 72
  return {
    width,
    height,
    safeTop,
    topBarHeight,
    previewTop,
    previewBottom,
    previewHeight,
    lensRailTop: bottomPanelTop - 68,
    metricsTrayTop,
    metricsTrayHeight,
    shutterRowTop,
    modeStripTop,
    bottomPanelTop,
    bottomPanelHeight,
    controlInset,
    controlWidth,
    metricWidth: controlWidth / 5,
    lensButtonWidth: width >= 430 ? 54 : 50,
    lensButtonGap: width >= 430 ? 9 : 7,
    shutterSize: height >= 900 ? 78 : 70,
  }
}
