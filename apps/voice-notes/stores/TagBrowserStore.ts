import { Store } from '@geastack/core'
import { plural } from '../shared/noteText'
import { countForTag } from '../shared/noteQueries'
import { BROWSE_TAGS, browseTagIdAt, browseTagNameAt } from '../shared/tags'
import type { VoiceNote } from '../shared/notes'

export const BROWSE_TAG_BACK = BROWSE_TAGS.length

function nextBrowseTagIndex(index: number): number {
  const next = index + 1
  if (next > BROWSE_TAG_BACK) return 0
  return next
}

export class VoiceNotesTagBrowserStore extends Store {
  browseTagIndex = 0
  browseTagNameText = 'All'
  browseTagCountText = '0 notes'

  reset(notes: VoiceNote[]) {
    this.browseTagIndex = 0
    this.refresh(notes)
  }

  next(notes: VoiceNote[]) {
    this.browseTagIndex = nextBrowseTagIndex(this.browseTagIndex)
    this.refresh(notes)
  }

  browseTagId(): string {
    return browseTagIdAt(this.browseTagIndex)
  }

  refresh(notes: VoiceNote[]) {
    if (this.browseTagIndex == BROWSE_TAG_BACK) {
      this.browseTagNameText = 'Back'
      this.browseTagCountText = 'menu'
      return
    }
    this.browseTagNameText = browseTagNameAt(this.browseTagIndex)
    this.browseTagCountText = plural(countForTag(notes, this.browseTagId()), 'note', 'notes')
  }
}

export const voiceNotesTagBrowser = new VoiceNotesTagBrowserStore()
