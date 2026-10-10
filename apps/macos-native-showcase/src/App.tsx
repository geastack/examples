import { Component } from '@geastack/core'
import { showcase } from './ShowcaseStore'
import './App.css'

export class App extends Component {
  template() {
    return (
      <div class={'showcase palette-' + showcase.palette}>
        <div class="page-header">
          <div class="heading-group">
            <span class="page-title">Native controls. Live motion.</span>
            <span class="page-subtitle">A hands-on Mac showcase. Edit, drag, choose and animate.</span>
          </div>
          <div class="header-actions">
            <span id="native-badge" class="native-badge">AppKit</span>
            <span class="control-label">Enable inputs</span>
            <input id="toggle-switch" class="native-switch" type="checkbox" checked={showcase.enabled} onInput={() => showcase.toggleEnabled()} aria-label="Enable inputs" />
            <button id="reset-button" class="button button-plain" onClick={() => showcase.reset()}>Reset</button>
          </div>
        </div>

        <div class="card-row">
          <div id="inputs-card" class="card">
            <div class="card-heading"><span class="card-title">Text &amp; selection</span><span class="card-number">01</span></div>
            <div class="field-row">
              <div class="field-group">
                <span class="control-label">Name</span>
                <input id="name-field" class="text-field" value={showcase.displayName} disabled={!showcase.enabled} placeholder="Your name" onInput={event => showcase.updateName(event.currentTarget.value)} aria-label="Name" />
              </div>
              <div class="field-group">
                <span class="control-label">Palette</span>
                <select id="palette-select" class="popup" value={showcase.palette} disabled={!showcase.enabled} onInput={event => showcase.selectPalette(event.currentTarget.value)} aria-label="Palette">
                  <option value="indigo">Indigo</option>
                  <option value="mint">Mint</option>
                  <option value="coral">Coral</option>
                </select>
              </div>
            </div>
            <div class="field-group">
              <span class="control-label">Email</span>
              <input id="email-field" class="text-field" value={showcase.email} disabled={!showcase.enabled} placeholder="you@example.com" onInput={event => showcase.updateEmail(event.currentTarget.value)} aria-label="Email" />
            </div>
            <textarea id="notes-field" class="notes-field" value={showcase.notes} disabled={!showcase.enabled} onInput={event => showcase.updateNotes(event.currentTarget.value)} aria-label="Notes" />
            <div class="choice-row">
              <input id="remember-checkbox" class="native-choice" type="checkbox" data-control="checkbox" checked={showcase.remember} disabled={!showcase.enabled} onInput={() => showcase.toggleRemember()} aria-label="Remember settings" />
              <span class="control-label">Remember settings</span>
            </div>
          </div>

          <div id="values-card" class="card">
            <div class="card-heading"><span class="card-title">Sliders &amp; steppers</span><span class="card-number">02</span></div>
            <div class="split-row">
              <span class="control-label">Progress</span>
              <button id="progress-button" class="button button-small" onClick={() => showcase.advanceProgress()}>{showcase.progress.toString() + '% · advance'}</button>
            </div>
            <input id="progress-slider" class="native-slider" type="range" min={0} max={100} value={showcase.progress.toString()} disabled={!showcase.enabled} onInput={event => showcase.setProgress(event.currentTarget.value)} aria-label="Progress" />
            <progress id="native-progress" class="native-progress" value={showcase.progress} max={100} />
            <div class="split-row">
              <span class="control-label">Corner radius</span>
              <span id="corner-value" class="control-value">{showcase.radius.toString() + ' px'}</span>
            </div>
            <input id="radius-slider" class="native-slider" type="range" min={0} max={32} value={showcase.radius.toString()} disabled={!showcase.enabled} onInput={event => showcase.setRadius(event.currentTarget.value)} aria-label="Corner radius" />
            <div class="split-row">
              <div class="quantity-controls">
                <span class="control-label">Quantity</span>
                <span id="quantity-value" class="quantity-value">{showcase.quantity.toString()}</span>
                <stepper id="quantity-stepper" class="native-stepper" min={1} max={12} step={1} value={showcase.quantity.toString()} disabled={!showcase.enabled} onInput={event => showcase.setQuantity(event.currentTarget.value)} aria-label="Quantity" />
              </div>
              <div id="layer-sample" class="radius-sample" style={{ borderRadius: showcase.radius }}><span class="sample-symbol">✦</span></div>
            </div>
            <div class="radio-row">
              <span class="control-label">Size</span>
              <div class="choice-row"><input id="size-small" class="native-choice" type="radio" name="size" value="small" checked={showcase.size === 'small'} disabled={!showcase.enabled} onInput={event => showcase.selectSize(event.currentTarget.value)} aria-label="Small" /><span>Small</span></div>
              <div class="choice-row"><input id="size-medium" class="native-choice" type="radio" name="size" value="medium" checked={showcase.size === 'medium'} disabled={!showcase.enabled} onInput={event => showcase.selectSize(event.currentTarget.value)} aria-label="Medium" /><span>Medium</span></div>
              <div class="choice-row"><input id="size-large" class="native-choice" type="radio" name="size" value="large" checked={showcase.size === 'large'} disabled={!showcase.enabled} onInput={event => showcase.selectSize(event.currentTarget.value)} aria-label="Large" /><span>Large</span></div>
            </div>
          </div>
        </div>

        <div class="card-row lower-row">
          <div id="buttons-card" class="card">
            <div class="card-heading"><span class="card-title">Buttons &amp; activity</span><span class="card-number">03</span></div>
            <div class="button-row">
              <button id="show-alert" class="button button-plain" onClick={() => showcase.showAlert()}>Show a message</button>
              <button id="count-button" class="button button-primary" disabled={!showcase.enabled} onClick={() => showcase.countAction()}>Add an action</button>
            </div>
            <div class="button-row">
              <button id="disabled-button" class="button button-plain" disabled={true}>Disabled button</button>
              <button id="clear-button" class="button button-plain" disabled={!showcase.enabled} onClick={() => showcase.updateNotes('')}>Clear notes</button>
            </div>
            <div class="activity-row">
              <input id="loading-switch" class="native-switch" type="checkbox" checked={showcase.loading} onInput={() => showcase.toggleLoading()} aria-label="Loading activity" />
              <span class="control-label">Loading activity</span>
              <progress id="activity-spinner" class="activity-spinner" indeterminate={true} data-style="spinner" data-running={showcase.loading} />
            </div>
            <span id="action-count" class="action-count">{'Actions: ' + showcase.actionCount.toString()}</span>
          </div>

          <div id="motion-card" class={showcase.animationsRunning ? 'card motion-card' : 'card motion-card motion-paused'}>
            <div class="card-heading">
              <span class="card-title">CSS transitions &amp; keyframes</span>
              <input id="animation-switch" class="native-switch" type="checkbox" checked={showcase.animationsRunning} onInput={() => showcase.toggleMotion()} aria-label="Play CSS animations" />
            </div>
            <div class="transition-stage">
              <button id="transition-button" class={showcase.expanded ? 'button transition-button expanded' : 'button transition-button'} onClick={() => showcase.toggleExpanded()}>{showcase.expanded ? 'Click to restore' : 'Click to morph'}</button>
            </div>
            <div class="animation-stage">
              <button id="pulse-button" class="button pulse-button" onClick={() => showcase.countAction()}>Breathing button</button>
              <div class="orbit-track"><div id="orbit-dot" class="orbit-dot" /></div>
            </div>
            <span class="motion-caption">Click to transition. Switch to pause the keyframes.</span>
          </div>
        </div>

        {showcase.alertVisible && (
          <div class="dialog-backdrop">
            <div id="showcase-dialog" class="dialog" role="dialog" aria-label="Mac showcase message">
              <span class="dialog-title">{'Hello, ' + showcase.displayName}</span>
              <span class="dialog-description">{showcase.quantity.toString() + ' items · ' + showcase.size + ' · ' + showcase.palette}</span>
              <button id="dismiss-alert" class="button button-primary dialog-button" onClick={() => showcase.dismissAlert()}>Done</button>
            </div>
          </div>
        )}
      </div>
    )
  }
}
