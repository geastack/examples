// geaNotes — a real macOS Notes clone written as JSX over real AppKit classes.

import {
  installRootViewController,
  installToolbar,
  setScrollDocumentTopAligned,
  NSBox,
  NSClickGestureRecognizer,
  NSColor,
  NSFont,
  NSImage,
  NSImageView,
  NSScrollView,
  NSSplitViewController,
  NSSplitViewItem,
  NSStackView,
  NSTextField,
  NSTextView,
  NSView,
  NSViewController,
  ObjCTarget,
  ObjCTargetAction,
  NSBoxCustom,
  NSStackViewDistributionFill,
  NSStackViewDistributionGravityAreas,
  NSLayoutAttributeLeading,
  NSLayoutAttributeCenterY,
  NSUserInterfaceLayoutOrientationHorizontal,
  NSUserInterfaceLayoutOrientationVertical,
  NSLineBreakByTruncatingTail
} from '@geastack/apple/AppKit'
import type { NSObject } from '@geastack/apple/Foundation'
import { folders, notes, Note } from './data'

// --- colors (the style pipeline / reference CSS uses sRGB, no alpha) ----------
function color(r: number, g: number, b: number): NSColor {
  return NSColor.colorWithSRGBRedGreenBlueAlpha(r / 255, g / 255, b / 255, 1)
}
const TEXT_PRIMARY = color(245, 245, 247) // #f5f5f7
const TEXT_MUTED = color(138, 138, 142) // #8a8a8e
const ICON_TINT = color(224, 167, 44) // #e0a72c
const SIDEBAR_SELECTED = color(72, 72, 74) // #48484a
const LIST_SELECTED = color(214, 160, 21) // #d6a015
const DATE_UNSEL = color(199, 199, 204) // #c7c7cc
const DATE_SEL = color(249, 241, 220) // #f9f1dc
const PREVIEW_SEL = color(242, 226, 184) // #f2e2b8
const EDITOR_BODY = color(214, 214, 218) // #d6d6da
const CLEAR = NSColor.clearColor()

// --- retain pool: AppKit holds gesture/control targets weakly. Keep every
// ObjCTarget + gesture recognizer (and the mutated views) alive forever. -------
const retained: NSObject[] = []

// --- module-scope state + per-row references ----------------------------------
// Selection is tracked by ARRAY INDEX (a number), never by note.id: the data
// field `id` collides with a native binding property of the same name and the
// C++ emitter would mis-resolve `note.id` to that binding. Indexing sidesteps it.
let selectedFolder = 'All Notes'
let selectedIndex = 0

interface FolderRowRef {
  name: string
  box: NSBox
}
interface NoteRowRef {
  note: Note
  box: NSBox
  titleField: NSTextField
  dateField: NSTextField
  previewField: NSTextField
}
const folderRows: FolderRowRef[] = []
const noteRows: NoteRowRef[] = []

// The note list's scrollable row stack + a counter for ids of notes created at
// runtime — module-scope so the New Note toolbar action can insert a row.
let listDocStack: NSStackView
let nextNoteId = 1

// Editor refs (mutated on selection).
let editorDate: NSTextField
let editorTitle: NSTextField
let editorBody: NSTextView

// List header refs (mutated on folder change).
let listTitle: NSTextField
let listCount: NSTextField

// --- small builders -----------------------------------------------------------
function label(text: string, size: number, weight: number, c: NSColor): NSTextField {
  const f = new NSTextField()
  f.stringValue = text
  f.editable = false
  f.selectable = false
  f.bezeled = false
  f.bordered = false
  f.drawsBackground = false
  f.font = weight === 0 ? NSFont.systemFontOfSize(size) : NSFont.systemFontOfSizeWeight(size, weight)
  f.textColor = c
  return f
}

// Pin a child to fill its parent edge-to-edge (used inside NSBox content / rows).
function pinFill(child: NSView, parent: NSView, inset: number): void {
  child.translatesAutoresizingMaskIntoConstraints = false
  child.leadingAnchor.constraintEqualToAnchorConstant(parent.leadingAnchor, inset).active = true
  child.trailingAnchor.constraintEqualToAnchorConstant(parent.trailingAnchor, -inset).active = true
  child.topAnchor.constraintEqualToAnchorConstant(parent.topAnchor, inset).active = true
  child.bottomAnchor.constraintEqualToAnchorConstant(parent.bottomAnchor, -inset).active = true
}

// A rounded selection-highlight fill wrapping a content view. boxType=Custom
// lets fillColor + cornerRadius take effect; titlePosition=0 (NSNoTitle) hides
// the title; borderWidth=0 removes the frame.
function selectionBox(content: NSView, padTop: number, padSide: number): NSBox {
  const box = new NSBox()
  box.boxType = NSBoxCustom
  box.titlePosition = 0
  box.borderWidth = 0
  box.cornerRadius = 7
  box.fillColor = CLEAR
  box.contentView = content
  // Pad the content inside the box (vertical / horizontal).
  content.translatesAutoresizingMaskIntoConstraints = false
  content.leadingAnchor.constraintEqualToAnchorConstant(box.leadingAnchor, padSide).active = true
  content.trailingAnchor.constraintEqualToAnchorConstant(box.trailingAnchor, -padSide).active = true
  content.topAnchor.constraintEqualToAnchorConstant(box.topAnchor, padTop).active = true
  content.bottomAnchor.constraintEqualToAnchorConstant(box.bottomAnchor, -padTop).active = true
  retained.push(box)
  return box
}

function onClick(view: NSView, handler: () => void): void {
  const target = ObjCTarget.create(handler)
  const click = new NSClickGestureRecognizer(target, ObjCTargetAction)
  view.addGestureRecognizer(click)
  retained.push(target)
  retained.push(click)
}

// --- per-folder counts (mirror NotesStore.init) -------------------------------
function folderCount(name: string): number {
  if (name === 'All Notes') return notes.length
  let n = 0
  for (let i = 0; i < notes.length; i++) {
    if (notes[i].folder === name) n = n + 1
  }
  return n
}

// --- sidebar ------------------------------------------------------------------
function buildSidebar(): NSStackView {
  const stack = (
    <NSStackView
      orientation={NSUserInterfaceLayoutOrientationVertical}
      spacing={2}
      alignment={NSLayoutAttributeLeading}
      distribution={NSStackViewDistributionGravityAreas}
    />
  ) as NSStackView

  // "iCloud" section title, ~18px left padding.
  const title = label('iCloud', 11, 0, TEXT_MUTED)
  const titleWrap = new NSView()
  titleWrap.addSubview(title)
  title.translatesAutoresizingMaskIntoConstraints = false
  title.leadingAnchor.constraintEqualToAnchorConstant(titleWrap.leadingAnchor, 18).active = true
  title.topAnchor.constraintEqualToAnchorConstant(titleWrap.topAnchor, 4).active = true
  title.bottomAnchor.constraintEqualToAnchorConstant(titleWrap.bottomAnchor, -6).active = true
  stack.addArrangedSubview(titleWrap)
  pinLeadingTrailing(titleWrap, stack, 0)

  for (let i = 0; i < folders.length; i++) {
    const folder = folders[i]
    const count = folderCount(folder.name)

    const row = (
      <NSStackView
        orientation={NSUserInterfaceLayoutOrientationHorizontal}
        spacing={8}
        alignment={NSLayoutAttributeCenterY}
        distribution={NSStackViewDistributionFill}
      />
    ) as NSStackView

    // SF Symbol icon, 17x15, tinted.
    const icon = new NSImageView()
    const img = NSImage.imageWithSystemSymbolNameAccessibilityDescription(folder.symbol, '')
    icon.image = img
    icon.contentTintColor = ICON_TINT
    icon.translatesAutoresizingMaskIntoConstraints = false
    icon.widthAnchor.constraintEqualToConstant(17).active = true
    icon.heightAnchor.constraintEqualToConstant(15).active = true
    row.addArrangedSubview(icon)

    // Folder name.
    const name = label(folder.name, 13, 0, TEXT_PRIMARY)
    row.addArrangedSubview(name)

    // A flexible spacer (no intrinsic size) stretches under Fill distribution,
    // pushing the count to the trailing edge. This is the proven full-width
    // recipe and avoids setContentHuggingPriority (whose enum arg mis-codegens).
    const spacer = new NSView()
    row.addArrangedSubview(spacer)

    // Count — sits at its intrinsic width on the trailing edge.
    const cnt = label('' + count, 12, 0, TEXT_MUTED)
    row.addArrangedSubview(cnt)

    const box = selectionBox(row, 5, 12)
    stack.addArrangedSubview(box)
    pinLeadingTrailing(box, stack, 8)

    const folderName = folder.name
    onClick(box, () => selectFolder(folderName))
    folderRows.push({ name: folderName, box })
  }

  return stack
}

function pinLeadingTrailing(child: NSView, parent: NSView, inset: number): void {
  child.translatesAutoresizingMaskIntoConstraints = false
  child.leadingAnchor.constraintEqualToAnchorConstant(parent.leadingAnchor, inset).active = true
  child.trailingAnchor.constraintEqualToAnchorConstant(parent.trailingAnchor, -inset).active = true
}

// --- note list ----------------------------------------------------------------
// Build one note-list row (rounded selection box wrapping title + date/preview),
// wire its click to select that note by index, and register it in noteRows. The
// caller adds the returned box to the document stack (appended during the initial
// build; inserted at the top by New Note).
function buildNoteRow(note: Note, index: number): NSBox {
  const rowStack = new NSStackView()
  rowStack.orientation = NSUserInterfaceLayoutOrientationVertical
  rowStack.spacing = 3
  rowStack.alignment = NSLayoutAttributeLeading
  rowStack.distribution = NSStackViewDistributionGravityAreas

  const titleField = label(note.heading, 13, 0, TEXT_PRIMARY)
  rowStack.addArrangedSubview(titleField)

  const meta = new NSStackView()
  meta.orientation = NSUserInterfaceLayoutOrientationHorizontal
  meta.spacing = 6
  meta.alignment = NSLayoutAttributeCenterY
  meta.distribution = NSStackViewDistributionFill
  const dateField = label(note.date, 11, 0, DATE_UNSEL)
  const previewField = label(note.preview, 11, 0, TEXT_MUTED)
  // Single line + truncate: an edited body (multi-line) shows only its first line,
  // matching the reference's one-line preview.
  previewField.maximumNumberOfLines = 1
  previewField.lineBreakMode = NSLineBreakByTruncatingTail
  meta.addArrangedSubview(dateField)
  meta.addArrangedSubview(previewField)
  rowStack.addArrangedSubview(meta)

  const box = selectionBox(rowStack, 8, 12)
  onClick(box, () => selectNote(index))
  noteRows.push({ note, box, titleField, dateField, previewField })
  return box
}

function buildList(): NSStackView {
  const root = (
    <NSStackView
      orientation={NSUserInterfaceLayoutOrientationVertical}
      spacing={0}
      alignment={NSLayoutAttributeLeading}
      distribution={NSStackViewDistributionFill}
    />
  ) as NSStackView

  // Fixed header: folder name title (22, semibold) + "{count} notes".
  const header = (
    <NSStackView
      orientation={NSUserInterfaceLayoutOrientationVertical}
      spacing={2}
      alignment={NSLayoutAttributeLeading}
      distribution={NSStackViewDistributionGravityAreas}
    />
  ) as NSStackView
  listTitle = label(selectedFolder, 22, 0.3, TEXT_PRIMARY)
  listCount = label(folderCount(selectedFolder) + ' notes', 11, 0, TEXT_MUTED)
  header.addArrangedSubview(listTitle)
  header.addArrangedSubview(listCount)
  root.addArrangedSubview(header)
  header.translatesAutoresizingMaskIntoConstraints = false
  header.leadingAnchor.constraintEqualToAnchorConstant(root.leadingAnchor, 18).active = true
  header.trailingAnchor.constraintEqualToAnchorConstant(root.trailingAnchor, -18).active = true
  header.topAnchor.constraintEqualToAnchorConstant(root.topAnchor, 10).active = true

  // Scrollable list of 50 note rows.
  const scroll = new NSScrollView()
  scroll.drawsBackground = false
  scroll.hasVerticalScroller = true
  scroll.hasHorizontalScroller = false
  scroll.automaticallyAdjustsContentInsets = false

  const docStack = new NSStackView()
  docStack.orientation = NSUserInterfaceLayoutOrientationVertical
  docStack.spacing = 2
  docStack.alignment = NSLayoutAttributeLeading
  docStack.distribution = NSStackViewDistributionGravityAreas
  docStack.detachesHiddenViews = true
  listDocStack = docStack

  for (let i = 0; i < notes.length; i++) {
    const box = buildNoteRow(notes[i], i)
    docStack.addArrangedSubview(box)
    pinLeadingTrailing(box, docStack, 8)
  }

  // Host the row stack in a flipped document container (top-left origin) so the
  // list lays out top-down and opens at the top — pinned to the clip view so it
  // tracks the width and grows vertically (scrollable) with the row count.
  setScrollDocumentTopAligned(scroll, docStack)

  root.addArrangedSubview(scroll)
  scroll.translatesAutoresizingMaskIntoConstraints = false
  scroll.leadingAnchor.constraintEqualToAnchor(root.leadingAnchor).active = true
  scroll.trailingAnchor.constraintEqualToAnchor(root.trailingAnchor).active = true
  scroll.bottomAnchor.constraintEqualToAnchor(root.bottomAnchor).active = true
  scroll.topAnchor.constraintEqualToAnchorConstant(header.bottomAnchor, 6).active = true

  return root
}

// --- editor -------------------------------------------------------------------
function buildDetail(): NSStackView {
  const note = notes[0]
  const root = (
    <NSStackView
      orientation={NSUserInterfaceLayoutOrientationVertical}
      spacing={0}
      alignment={NSLayoutAttributeLeading}
      distribution={NSStackViewDistributionFill}
    />
  ) as NSStackView

  // Date — centered (via centerX constraint below), muted.
  editorDate = label(note.date, 11, 0, TEXT_MUTED)
  root.addArrangedSubview(editorDate)
  editorDate.translatesAutoresizingMaskIntoConstraints = false
  editorDate.centerXAnchor.constraintEqualToAnchor(root.centerXAnchor).active = true
  editorDate.topAnchor.constraintEqualToAnchorConstant(root.topAnchor, 8).active = true

  // Editable title — borderless, transparent (like the reference's input). The
  // window clears its first responder after install (see macos_main.mm) so this
  // doesn't draw a launch focus ring; a click focuses it for editing.
  editorTitle = new NSTextField()
  editorTitle.stringValue = note.heading
  editorTitle.editable = true
  editorTitle.selectable = true
  editorTitle.bezeled = false
  editorTitle.bordered = false
  editorTitle.drawsBackground = false
  editorTitle.font = NSFont.systemFontOfSizeWeight(22, 0.3)
  editorTitle.textColor = TEXT_PRIMARY
  retained.push(editorTitle)
  root.addArrangedSubview(editorTitle)
  editorTitle.translatesAutoresizingMaskIntoConstraints = false
  editorTitle.leadingAnchor.constraintEqualToAnchorConstant(root.leadingAnchor, 22).active = true
  editorTitle.trailingAnchor.constraintEqualToAnchorConstant(root.trailingAnchor, -22).active = true
  editorTitle.topAnchor.constraintEqualToAnchorConstant(editorDate.bottomAnchor, 8).active = true

  // Editable body inside a scroll view, filling the remaining height.
  const bodyScroll = new NSScrollView()
  bodyScroll.drawsBackground = false
  bodyScroll.hasVerticalScroller = true
  bodyScroll.hasHorizontalScroller = false
  bodyScroll.automaticallyAdjustsContentInsets = false

  editorBody = new NSTextView()
  editorBody.string = note.body
  editorBody.editable = true
  editorBody.selectable = true
  editorBody.drawsBackground = false
  editorBody.font = NSFont.systemFontOfSize(14)
  editorBody.textColor = EDITOR_BODY
  retained.push(editorBody)
  bodyScroll.documentView = editorBody

  root.addArrangedSubview(bodyScroll)
  bodyScroll.translatesAutoresizingMaskIntoConstraints = false
  bodyScroll.leadingAnchor.constraintEqualToAnchorConstant(root.leadingAnchor, 22).active = true
  bodyScroll.trailingAnchor.constraintEqualToAnchorConstant(root.trailingAnchor, -22).active = true
  bodyScroll.topAnchor.constraintEqualToAnchorConstant(editorTitle.bottomAnchor, 10).active = true
  bodyScroll.bottomAnchor.constraintEqualToAnchorConstant(root.bottomAnchor, -16).active = true

  // One ObjCTarget doubles as the text-change delegate for both fields: AppKit
  // sends controlTextDidChange:/textDidChange: to it on every edit, which writes
  // the live title/body back into the selected note + its list row.
  const editObserver = ObjCTarget.create(() => writeSelectedFromEditor())
  editorTitle.attachTextDelegate(editObserver)
  editorBody.attachTextDelegate(editObserver)
  retained.push(editObserver)

  return root
}

// --- interactivity (mirror NotesStore.selectFolder / selectNote) --------------
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
  // Header text.
  listTitle.stringValue = name
  listCount.stringValue = count + ' notes'
  // Folder row fills.
  for (let i = 0; i < folderRows.length; i++) {
    folderRows[i].box.fillColor = folderRows[i].name === name ? SIDEBAR_SELECTED : CLEAR
  }
  // Select the first visible note in the new folder.
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
      editorDate.stringValue = row.note.date
      editorTitle.stringValue = row.note.heading
      editorBody.string = row.note.body
    }
  }
}

// Live two-way binding (mirrors the reference's updateTitle/updateBody): on every
// keystroke in the editor, write the current title/body back to the selected note
// and its list row — heading -> row title, first body line -> row preview.
function writeSelectedFromEditor(): void {
  for (let i = 0; i < noteRows.length; i++) {
    if (i === selectedIndex) {
      const row = noteRows[i]
      const t = editorTitle.stringValue
      const b = editorBody.string
      row.note.heading = t
      row.note.body = b
      row.titleField.stringValue = t
      row.previewField.stringValue = b.split('\n')[0] ?? ''
    }
  }
}

// New Note toolbar action (mirrors the reference's NotesStore.newNote): prepend a
// blank note, build its row, insert it at the top of the list, and select it so
// the editor opens on the new note ready for typing (live write-back then keeps
// the row in sync).
function newNote(): void {
  const note: Note = {
    id: 'new-' + nextNoteId,
    folder: 'Personal',
    heading: 'New Note',
    date: 'Now',
    preview: 'No additional text',
    body: ''
  }
  nextNoteId = nextNoteId + 1
  // Append to noteRows (stable index for the click handler) but insert the box at
  // the visual top of the document stack.
  const index = noteRows.length
  const box = buildNoteRow(note, index)
  listDocStack.insertArrangedSubviewAtIndex(box, 0)
  pinLeadingTrailing(box, listDocStack, 8)
  selectNote(index)
}

function paneController(content: NSStackView): NSViewController {
  const vc = new NSViewController()
  // Wrap the content in a plain container. The split item's background (the
  // sidebar's Liquid Glass, the content/detail fill) covers the whole pane —
  // up behind the unified toolbar and traffic lights — while the actual content
  // is inset below the toolbar via the safe-area layout guide, exactly like a
  // native sidebar app. (Pinning content straight to the view top would slide it
  // under the toolbar once fullSizeContentView extends the content to the top.)
  const container = new NSView()
  container.addSubview(content)
  content.translatesAutoresizingMaskIntoConstraints = false
  content.topAnchor.constraintEqualToAnchor(container.safeAreaLayoutGuide.topAnchor).active = true
  content.leadingAnchor.constraintEqualToAnchor(container.leadingAnchor).active = true
  content.trailingAnchor.constraintEqualToAnchor(container.trailingAnchor).active = true
  content.bottomAnchor.constraintEqualToAnchor(container.bottomAnchor).active = true
  vc.view = container
  return vc
}

export function mountNotes(): void {
  const sidebar = buildSidebar()
  const list = buildList()
  const detail = buildDetail()

  // NSSplitViewController + NSSplitViewItem is exactly what real Notes uses: the
  // sidebar item gets the system Liquid Glass material + collapse animation, and
  // each item enforces its own min/max width.
  // Min/max thickness per item gives each pane a resizable range; we deliberately
  // do NOT set preferredThicknessFraction — it makes the split view re-apply the
  // preferred fraction on every layout, which snaps a dragged divider back and
  // makes the panes feel non-resizable. Initial widths come from the system
  // sidebar/content-list defaults, matching the reference.
  const sidebarItem = NSSplitViewItem.sidebarWithViewController(paneController(sidebar))
  sidebarItem.minimumThickness = 180
  sidebarItem.maximumThickness = 320
  sidebarItem.canCollapse = true

  const listItem = NSSplitViewItem.contentListWithViewController(paneController(list))
  listItem.minimumThickness = 240
  listItem.maximumThickness = 460

  const detailItem = NSSplitViewItem.splitViewItemWithViewController(paneController(detail))
  detailItem.minimumThickness = 320

  const split = new NSSplitViewController()
  split.addSplitViewItem(sidebarItem)
  split.addSplitViewItem(listItem)
  split.addSplitViewItem(detailItem)
  installRootViewController(split)

  // Real unified-title-bar NSToolbar, matching the reference: sidebar toggle,
  // flexible space, then the compose/format/checklist/table/share SF Symbols and
  // a trailing search field. The compose item invokes newNote.
  const newNoteTarget = ObjCTarget.create(() => newNote())
  retained.push(newNoteTarget)
  installToolbar(
    'sidebar.left,space,square.and.pencil,textformat,checklist,tablecells,square.and.arrow.up,search',
    newNoteTarget
  )

  // Set initial selection state (All Notes + n1) so the default highlights and
  // editor content render exactly like the reference's init.
  selectFolder(selectedFolder)
}
