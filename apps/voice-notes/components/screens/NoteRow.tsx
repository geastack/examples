import { Component, type GeaElement } from "@geastack/core";import './NoteRow.css';
import type { VoiceNoteRow as VoiceNoteRowModel } from '../../shared/notes';export class NoteRow extends Component<GeaElement, {row: VoiceNoteRowModel;}> {template(

  { row }: {row: VoiceNoteRowModel;}) {
    return (
      <div class={{ 'vn-note-row': true, 'is-active': row.selected }}>
      <div class="vn-note-topline">
        <span class="vn-note-num">{row.label}</span>
        <span class="vn-note-tag">{row.tagName}</span>
      </div>
      <span class="vn-note-preview">{row.preview}</span>
    </div>);}}
