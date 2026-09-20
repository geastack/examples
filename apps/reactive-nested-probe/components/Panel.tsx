import { ReactiveComponent } from '@geastack/core'

// Reactive child INSIDE a reactive parent — its own typed Signal state, its
// own typed renderer, mounted as `mount_Panel(std::make_shared<Panel>(), …)`.
// Its state must update independently of the parent's.
export class Panel extends ReactiveComponent {
  hits = 0

  poke() {
    this.hits = this.hits + 1
  }

  template() {
    return (
      <div class="panel" onClick={() => this.poke()}>
        <span class="panel-label">panel hits</span>
        <span class="panel-count">{this.hits}</span>
      </div>
    )
  }
}
