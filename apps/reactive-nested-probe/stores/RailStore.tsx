import { Store } from '@geastack/core'

export interface RailItem {
  id: number
  label: string
}

export class RailStore extends Store {
  items: RailItem[] = [
    { id: 1, label: 'alpha' },
    { id: 2, label: 'beta' },
    { id: 3, label: 'gamma' },
  ]
  active = 1

  setActive(id: number) {
    this.active = id
  }
}

export const rail = new RailStore()
