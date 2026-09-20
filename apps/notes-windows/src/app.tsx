// geaNotes for Windows — the notes app written declaratively over real Win32
// controls through @geastack/windows/Controls. The same structure as the macOS
// notes-native app (a three-pane split view under a title-bar toolbar), with
// the AppKit classes swapped for their Windows counterparts: WinSplitView /
// WinStackView / WinLabel / WinTextField / WinTextView / WinBox.

import {
  installRootView,
  installToolbar,
  setWindowAppearance,
  setWindowBackgroundColor,
  setWindowTitle,
  WinBox,
  WinCallback,
  WinColor,
  WinFont,
  WinImage,
  WinImageView,
  WinLabel,
  WinScrollView,
  WinSplitView,
  WinStackView,
  WinTextField,
  WinTextView,
  WinToolbar,
  WinView,
  AlignmentCenter,
  AlignmentFill,
  AlignmentLeading,
  DistributionFill,
  DistributionGravityAreas,
  FontWeightSemibold,
  LineBreakTruncateTail,
  OrientationHorizontal,
  OrientationVertical,
  PaneRoleDetail,
  PaneRoleList,
  PaneRoleSidebar,
} from '@geastack/windows/Controls'
import { folders, notes, Note } from './data'

// --- colors (the same palette as the macOS reference, sRGB) --------------------
function color(r: number, g: number, b: number): WinColor {
  return WinColor.rgb(r, g, b)
}
const WINDOW_BG = color(29, 29, 31) // #1d1d1f
const SIDEBAR_BG = color(40, 40, 42)
const LIST_BG = color(33, 33, 35)
const TEXT_PRIMARY = color(245, 245, 247) // #f5f5f7
const TEXT_MUTED = color(138, 138, 142) // #8a8a8e
const ICON_TINT = color(224, 167, 44) // #e0a72c
const SIDEBAR_SELECTED = color(72, 72, 74) // #48484a
const LIST_SELECTED = color(214, 160, 21) // #d6a015
const DATE_UNSEL = color(199, 199, 204) // #c7c7cc
const DATE_SEL = color(249, 241, 220) // #f9f1dc
const PREVIEW_SEL = color(242, 226, 184) // #f2e2b8
const EDITOR_BODY = color(214, 214, 218) // #d6d6da
const CLEAR = WinColor.clear()

// --- module-scope state + per-row references ------------------------------------
// Selection is tracked by ARRAY INDEX (a number), never by note.id, exactly as
// the macOS app does: the data field `id` would collide with a native binding
// property of the same name in the native compile path.
let selectedFolder = 'All Notes'
let selectedIndex = 0

interface FolderRowRef {
  name: string
  box: WinBox
}
interface NoteRowRef {
  note: Note
  box: WinBox
  titleField: WinLabel
  dateField: WinLabel
  previewField: WinLabel
}
const folderRows: FolderRowRef[] = []
const noteRows: NoteRowRef[] = []

let listDocStack: WinStackView
let nextNoteId = 1

let editorDate: WinLabel
let editorTitle: WinTextField
let editorBody: WinTextView

let listTitle: WinLabel
let listCount: WinLabel

// --- small builders ---------------------------------------------------------------
function label(text: string, size: number, weight: number, c: WinColor): WinLabel {
  const field = new WinLabel()
  field.text = text
  field.font = weight === 0 ? WinFont.system(size) : WinFont.systemWeight(size, weight)
  field.textColor = c
  return field
}

// A rounded selection-highlight fill wrapping a content view.
function selectionBox(content: WinView, padTop: number, padSide: number): WinBox {
  const box = new WinBox()
  box.cornerRadius = 7
  box.fillColor = CLEAR
  box.contentView = content
  box.setContentInsets(padTop, padSide, padTop, padSide)
  return box
}

function onClick(view: WinView, handler: () => void): void {
  view.onClick(WinCallback.create(handler))
}

// --- per-folder counts -------------------------------------------------------------
function folderCount(name: string): number {
  if (name === 'All Notes') return notes.length
  let n = 0
  for (let i = 0; i < notes.length; i++) {
    if (notes[i].folder === name) n = n + 1
  }
  return n
}

// --- sidebar ---------------------------------------------------------------------------
function buildSidebar(): WinStackView {
  const stack = (
    <WinStackView orientation={OrientationVertical} spacing={2} alignment={AlignmentFill} distribution={DistributionGravityAreas} />
  ) as WinStackView
  stack.setPadding(8, 0, 12, 0)

  const title = label('iCloud', 11, 0, TEXT_MUTED)
  const titleWrap = new WinStackView()
  titleWrap.orientation = OrientationHorizontal
  titleWrap.setPadding(4, 18, 6, 18)
  titleWrap.addArrangedSubview(title)
  stack.addArrangedSubview(titleWrap)

  for (let i = 0; i < folders.length; i++) {
    const folder = folders[i]
    const count = folderCount(folder.name)

    const row = (
      <WinStackView orientation={OrientationHorizontal} spacing={8} alignment={AlignmentCenter} distribution={DistributionFill} />
    ) as WinStackView

    // Folder glyph (Segoe Fluent Icons via the shared symbol names), tinted.
    const icon = new WinImageView()
    icon.image = WinImage.symbol(folder.symbol)
    icon.tintColor = ICON_TINT
    icon.setSize(17, 15)
    row.addArrangedSubview(icon)

    const name = label(folder.name, 13, 0, TEXT_PRIMARY)
    row.addArrangedSubview(name)

    // A flexible spacer stretches under Fill distribution and pushes the count
    // to the trailing edge.
    const spacer = new WinView()
    row.addArrangedSubview(spacer)

    const cnt = label('' + count, 12, 0, TEXT_MUTED)
    row.addArrangedSubview(cnt)

    const box = selectionBox(row, 5, 12)
    const rowWrap = new WinStackView()
    rowWrap.orientation = OrientationVertical
    rowWrap.alignment = AlignmentFill
    rowWrap.setPadding(0, 8, 0, 8)
    rowWrap.addArrangedSubview(box)
    stack.addArrangedSubview(rowWrap)

    const folderName = folder.name
    onClick(box, () => selectFolder(folderName))
    folderRows.push({ name: folderName, box })
  }

  return stack
}

// --- note list ------------------------------------------------------------------------------
function buildNoteRow(note: Note, index: number): WinBox {
  const rowStack = new WinStackView()
  rowStack.orientation = OrientationVertical
  rowStack.spacing = 3
  rowStack.alignment = AlignmentFill
  rowStack.distribution = DistributionGravityAreas

  const titleField = label(note.heading, 13, 0, TEXT_PRIMARY)
  titleField.maximumNumberOfLines = 1
  titleField.lineBreakMode = LineBreakTruncateTail
  rowStack.addArrangedSubview(titleField)

  const meta = new WinStackView()
  meta.orientation = OrientationHorizontal
  meta.spacing = 6
  meta.alignment = AlignmentCenter
  meta.distribution = DistributionGravityAreas
  const dateField = label(note.date, 11, 0, DATE_UNSEL)
  const previewField = label(note.preview, 11, 0, TEXT_MUTED)
  previewField.maximumNumberOfLines = 1
  previewField.lineBreakMode = LineBreakTruncateTail
  meta.addArrangedSubview(dateField)
  meta.addArrangedSubview(previewField)
  rowStack.addArrangedSubview(meta)

  const box = selectionBox(rowStack, 8, 12)
  onClick(box, () => selectNote(index))
  noteRows.push({ note, box, titleField, dateField, previewField })
  return box
}

function wrapRow(box: WinBox): WinStackView {
  const wrap = new WinStackView()
  wrap.orientation = OrientationVertical
  wrap.alignment = AlignmentFill
  wrap.setPadding(0, 8, 2, 8)
  wrap.addArrangedSubview(box)
  return wrap
}

function buildList(): WinStackView {
  const root = (
    <WinStackView orientation={OrientationVertical} spacing={0} alignment={AlignmentFill} distribution={DistributionFill} />
  ) as WinStackView

  // Fixed header: folder name title (22, semibold) + "{count} notes".
  const header = (
    <WinStackView orientation={OrientationVertical} spacing={2} alignment={AlignmentLeading} distribution={DistributionGravityAreas} />
  ) as WinStackView
  header.setPadding(10, 18, 8, 18)
  listTitle = label(selectedFolder, 22, FontWeightSemibold, TEXT_PRIMARY)
  listCount = label(folderCount(selectedFolder) + ' notes', 11, 0, TEXT_MUTED)
  header.addArrangedSubview(listTitle)
  header.addArrangedSubview(listCount)
  root.addArrangedSubview(header)

  // Scrollable list of note rows; the stack is the scroll view's document and
  // grows with the row count.
  const scroll = new WinScrollView()
  scroll.drawsBackground = false
  scroll.hasVerticalScroller = true
  scroll.hasHorizontalScroller = false

  const docStack = new WinStackView()
  docStack.orientation = OrientationVertical
  docStack.spacing = 0
  docStack.alignment = AlignmentFill
  docStack.distribution = DistributionGravityAreas
  docStack.detachesHiddenViews = true
  listDocStack = docStack

  for (let i = 0; i < notes.length; i++) {
    docStack.addArrangedSubview(wrapRow(buildNoteRow(notes[i], i)))
  }
  scroll.documentView = docStack
  root.addArrangedSubview(scroll)

  return root
}

// --- editor -----------------------------------------------------------------------------------
function buildDetail(): WinStackView {
  const note = notes[0]
  const root = (
    <WinStackView orientation={OrientationVertical} spacing={0} alignment={AlignmentFill} distribution={DistributionFill} />
  ) as WinStackView
  root.setPadding(8, 22, 16, 22)

  // Date — centered, muted.
  editorDate = label(note.date, 11, 0, TEXT_MUTED)
  editorDate.alignment = 1
  root.addArrangedSubview(editorDate)

  const dateGap = new WinView()
  dateGap.setSize(0, 8)
  root.addArrangedSubview(dateGap)

  // Editable title — borderless, transparent, like the reference's input.
  editorTitle = new WinTextField()
  editorTitle.text = note.heading
  editorTitle.editable = true
  editorTitle.bordered = false
  editorTitle.font = WinFont.systemWeight(22, FontWeightSemibold)
  editorTitle.textColor = TEXT_PRIMARY
  root.addArrangedSubview(editorTitle)

  const titleGap = new WinView()
  titleGap.setSize(0, 10)
  root.addArrangedSubview(titleGap)

  // Editable body, filling the remaining height.
  editorBody = new WinTextView()
  editorBody.text = note.body
  editorBody.editable = true
  editorBody.drawsBackground = false
  editorBody.font = WinFont.system(14)
  editorBody.textColor = EDITOR_BODY
  root.addArrangedSubview(editorBody)

  // Live write-back: every keystroke updates the selected note and its row.
  const editObserver = WinCallback.create(() => writeSelectedFromEditor())
  editorTitle.setOnChange(editObserver)
  editorBody.setOnChange(editObserver)

  return root
}

// --- interactivity -----------------------------------------------------------------------------
function selectFolder(name: string): void {
  selectedFolder = name
  let count = 0
  let firstVisibleIndex = -1
  for (let i = 0; i < noteRows.length; i++) {
    const inFolder = name === 'All Notes' || noteRows[i].note.folder === name
    noteRows[i].box.hidden = !inFolder
    if (inFolder) {
      count = count + 1
      if (firstVisibleIndex === -1) firstVisibleIndex = i
    }
  }
  listTitle.text = name
  listCount.text = count + ' notes'
  for (let i = 0; i < folderRows.length; i++) {
    folderRows[i].box.fillColor = folderRows[i].name === name ? SIDEBAR_SELECTED : CLEAR
  }
  if (firstVisibleIndex !== -1) selectNote(firstVisibleIndex)
}

function selectNote(index: number): void {
  selectedIndex = index
  for (let i = 0; i < noteRows.length; i++) {
    const row = noteRows[i]
    const isSel = i === index
    row.box.fillColor = isSel ? LIST_SELECTED : CLEAR
    row.dateField.textColor = isSel ? DATE_SEL : DATE_UNSEL
    row.previewField.textColor = isSel ? PREVIEW_SEL : TEXT_MUTED
    if (isSel) {
      editorDate.text = row.note.date
      editorTitle.text = row.note.heading
      editorBody.text = row.note.body
    }
  }
}

function writeSelectedFromEditor(): void {
  for (let i = 0; i < noteRows.length; i++) {
    if (i === selectedIndex) {
      const row = noteRows[i]
      const t = editorTitle.text
      const b = editorBody.text
      row.note.heading = t
      row.note.body = b
      row.titleField.text = t
      row.previewField.text = b.split('\n')[0] ?? ''
    }
  }
}

// New Note toolbar action: prepend a blank note, insert its row at the top of
// the list, and select it so the editor opens on it.
function newNote(): void {
  const note: Note = {
    id: 'new-' + nextNoteId,
    folder: 'Personal',
    heading: 'New Note',
    date: 'Now',
    preview: 'No additional text',
    body: '',
  }
  nextNoteId = nextNoteId + 1
  const index = noteRows.length
  const box = buildNoteRow(note, index)
  listDocStack.insertArrangedSubviewAtIndex(wrapRow(box), 0)
  selectNote(index)
}

function pane(content: WinStackView, background: WinColor): WinView {
  const container = new WinView()
  container.backgroundColor = background
  container.addSubview(content)
  content.anchorFill(0)
  return container
}

export function mountNotes(): void {
  setWindowTitle('geaNotes')
  setWindowAppearance('dark')
  setWindowBackgroundColor(WINDOW_BG)

  const sidebar = buildSidebar()
  const list = buildList()
  const detail = buildDetail()

  // A three-pane split: the sidebar collapses from the toolbar, each pane keeps
  // its own resizable range.
  const split = new WinSplitView()
  split.addPane(pane(sidebar, SIDEBAR_BG), PaneRoleSidebar, 180, 320, true)
  split.addPane(pane(list, LIST_BG), PaneRoleList, 240, 460, false)
  split.addPane(pane(detail, WINDOW_BG), PaneRoleDetail, 320, 100000, false)
  installRootView(split)

  // Title-bar toolbar: sidebar toggle, flexible space, the compose / format /
  // checklist / table / share items and a trailing search field.
  const toolbar = new WinToolbar()
  toolbar.addSidebarToggle(split)
  toolbar.addSpace()
  toolbar.addItem('square.and.pencil', 'New Note', WinCallback.create(() => newNote()))
  toolbar.addItem('textformat', 'Format', WinCallback.create(() => {}))
  toolbar.addItem('checklist', 'Checklist', WinCallback.create(() => {}))
  toolbar.addItem('tablecells', 'Table', WinCallback.create(() => {}))
  toolbar.addItem('square.and.arrow.up', 'Share', WinCallback.create(() => {}))
  toolbar.addSearchField('Search', WinCallback.create(() => {}))
  installToolbar(toolbar)

  selectFolder(selectedFolder)
}
