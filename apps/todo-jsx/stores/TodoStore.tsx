import { Store } from '@geastack/core'

export class TodoStore extends Store {
  count = 0
  draft = ''
  status = ''
  todo1 = ''
  todo2 = ''
  todo3 = ''
  todo4 = ''
  done1 = 0
  done2 = 0
  done3 = 0
  done4 = 0

  init() {
    this.count = 3
    this.draft = ''
    this.status = 'Tap a task to complete it'
    this.todo1 = 'Build counter'
    this.todo2 = 'Try stopwatch laps'
    this.todo3 = 'Add a todo'
    this.todo4 = ''
    this.done1 = 1
    this.done2 = 0
    this.done3 = 0
    this.done4 = 0
  }

  updateDraft(value: string) {
    this.draft = value
  }

  keydown(code: number) {
    if (code == 13) this.add()
  }

  add() {
    if (this.draft.length == 0) {
      this.status = 'Type a todo first'
      return
    }

    if (this.count >= 4) {
      this.status = 'Four todos fit this screen'
      return
    }

    if (this.count == 0) {
      this.todo1 = this.draft
      this.done1 = 0
    } else if (this.count == 1) {
      this.todo2 = this.draft
      this.done2 = 0
    } else if (this.count == 2) {
      this.todo3 = this.draft
      this.done3 = 0
    } else {
      this.todo4 = this.draft
      this.done4 = 0
    }

    this.count = this.count + 1
    this.draft = ''
    this.status = 'Todo added'
  }

  toggle(index: number) {
    if (index == 1 && this.count >= 1) this.done1 = this.done1 ? 0 : 1
    else if (index == 2 && this.count >= 2) this.done2 = this.done2 ? 0 : 1
    else if (index == 3 && this.count >= 3) this.done3 = this.done3 ? 0 : 1
    else if (index == 4 && this.count >= 4) this.done4 = this.done4 ? 0 : 1
    this.status = 'Todo updated'
  }

  remove(index: number) {
    if (index < 1 || index > this.count) return

    if (index == 1) {
      this.todo1 = this.todo2
      this.done1 = this.done2
      this.todo2 = this.todo3
      this.done2 = this.done3
      this.todo3 = this.todo4
      this.done3 = this.done4
    } else if (index == 2) {
      this.todo2 = this.todo3
      this.done2 = this.done3
      this.todo3 = this.todo4
      this.done3 = this.done4
    } else if (index == 3) {
      this.todo3 = this.todo4
      this.done3 = this.done4
    }

    this.count = this.count - 1
    if (this.count < 4) {
      this.todo4 = ''
      this.done4 = 0
    }
    if (this.count < 3) {
      this.todo3 = ''
      this.done3 = 0
    }
    if (this.count < 2) {
      this.todo2 = ''
      this.done2 = 0
    }
    if (this.count < 1) {
      this.todo1 = ''
      this.done1 = 0
    }
    this.status = 'Todo removed'
  }

  reset() {
    this.init()
  }
}

export const todo = new TodoStore()
