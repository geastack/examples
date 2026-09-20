export interface VoiceTag {
  index: number
  id: string
  name: string
}

export const TAG_ALL = 'all'
export const TAG_NOTE = 'note'
export const TAG_WORK = 'work'
export const TAG_IDEA = 'idea'
export const TAG_BUY = 'buy'
export const TAG_PRIVATE = 'private'

export const RECORDING_TAGS: VoiceTag[] = [
  { index: 0, id: TAG_NOTE, name: 'Note' },
  { index: 1, id: TAG_WORK, name: 'Work' },
  { index: 2, id: TAG_IDEA, name: 'Idea' },
  { index: 3, id: TAG_BUY, name: 'Buy' },
  { index: 4, id: TAG_PRIVATE, name: 'Private' }
]

export const BROWSE_TAGS: VoiceTag[] = [
  { index: 0, id: TAG_ALL, name: 'All' },
  { index: 1, id: TAG_NOTE, name: 'Note' },
  { index: 2, id: TAG_WORK, name: 'Work' },
  { index: 3, id: TAG_IDEA, name: 'Idea' },
  { index: 4, id: TAG_BUY, name: 'Buy' },
  { index: 5, id: TAG_PRIVATE, name: 'Private' }
]

export function tagName(tagId: string): string {
  for (let i = 0; i < BROWSE_TAGS.length; i++) {
    if (BROWSE_TAGS[i].id == tagId) return BROWSE_TAGS[i].name
  }
  return 'Note'
}

export function recordingTagIdAt(index: number): string {
  if (index == 1) return TAG_WORK
  if (index == 2) return TAG_IDEA
  if (index == 3) return TAG_BUY
  if (index == 4) return TAG_PRIVATE
  return TAG_NOTE
}

export function browseTagIdAt(index: number): string {
  if (index == 1) return TAG_NOTE
  if (index == 2) return TAG_WORK
  if (index == 3) return TAG_IDEA
  if (index == 4) return TAG_BUY
  if (index == 5) return TAG_PRIVATE
  return TAG_ALL
}

export function browseTagNameAt(index: number): string {
  return tagName(browseTagIdAt(index))
}
