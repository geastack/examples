import './Sidebar.css'
import { notes } from '../stores/NotesStore'

// No <vibrancy> wrapper — the native sidebar split item supplies the Liquid
// Glass material behind this content, so the rows sit on transparent
// backgrounds and the desktop/glass shows through.
export function Sidebar() {
  return (
    <div class="sidebar">
      <span class="sidebar-section-title">iCloud</span>
      <div
        class={notes.selectedFolderId === 'all' ? 'sidebar-row sidebar-row-selected' : 'sidebar-row'}
        onClick={() => notes.selectFolder('all')}
      >
        <symbol class="sidebar-icon" data-symbol="tray.full" />
        <span class="sidebar-row-name">All Notes</span>
        <span class="sidebar-row-count">{notes.countAll}</span>
      </div>
      <div
        class={notes.selectedFolderId === 'personal' ? 'sidebar-row sidebar-row-selected' : 'sidebar-row'}
        onClick={() => notes.selectFolder('personal')}
      >
        <symbol class="sidebar-icon" data-symbol="folder" />
        <span class="sidebar-row-name">Personal</span>
        <span class="sidebar-row-count">{notes.countPersonal}</span>
      </div>
      <div
        class={notes.selectedFolderId === 'work' ? 'sidebar-row sidebar-row-selected' : 'sidebar-row'}
        onClick={() => notes.selectFolder('work')}
      >
        <symbol class="sidebar-icon" data-symbol="folder" />
        <span class="sidebar-row-name">Work</span>
        <span class="sidebar-row-count">{notes.countWork}</span>
      </div>
      <div
        class={notes.selectedFolderId === 'ideas' ? 'sidebar-row sidebar-row-selected' : 'sidebar-row'}
        onClick={() => notes.selectFolder('ideas')}
      >
        <symbol class="sidebar-icon" data-symbol="lightbulb" />
        <span class="sidebar-row-name">Ideas</span>
        <span class="sidebar-row-count">{notes.countIdeas}</span>
      </div>
      <div
        class={notes.selectedFolderId === 'travel' ? 'sidebar-row sidebar-row-selected' : 'sidebar-row'}
        onClick={() => notes.selectFolder('travel')}
      >
        <symbol class="sidebar-icon" data-symbol="airplane" />
        <span class="sidebar-row-name">Travel</span>
        <span class="sidebar-row-count">{notes.countTravel}</span>
      </div>
      <div
        class={notes.selectedFolderId === 'archive' ? 'sidebar-row sidebar-row-selected' : 'sidebar-row'}
        onClick={() => notes.selectFolder('archive')}
      >
        <symbol class="sidebar-icon" data-symbol="archivebox" />
        <span class="sidebar-row-name">Archive</span>
        <span class="sidebar-row-count">{notes.countArchive}</span>
      </div>
    </div>
  )
}
