import './IntroBlock.css'

export function IntroBlock() {
  return (
    <div class="typography-intro">
      <span class="typography-title">Typography</span>
      <p class="typography-intro-copy">
        A scrollable type specimen for the embedded renderer. The page uses{' '}
        <span class="typography-token-div">div</span>
        {', '}
        <span class="typography-token-span">span</span>
        {', '}
        <span class="typography-token-p">p</span>
        {' and headings as the authoring vocabulary.'}
      </p>
    </div>
  )
}
