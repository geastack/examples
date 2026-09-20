export function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <div class="settings-row">
      <span class="settings-row-label">{label}</span>
      <span class="settings-row-value">{value}</span>
    </div>
  )
}
