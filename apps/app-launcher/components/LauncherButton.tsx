import './LauncherButton.css'
import { Apps } from '@geastack/core'

export function LauncherButton({
  appId,
  title,
  detail,
  iconSrc,
  accent
}: {
  appId: string
  title: string
  detail: string
  iconSrc: string
  accent: string
}) {
  return (
    <div class="launcher-card" style={{ borderColor: accent }} onClick={() => Apps.launch(appId)}>
      <img class="launcher-card-icon" src={iconSrc} />
      <div class="launcher-card-copy">
        <span class="launcher-card-title">{title}</span>
        <span class="launcher-card-description">{detail}</span>
      </div>
    </div>
  )
}
