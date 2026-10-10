import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

export function retainedCaptureIdentity(report) {
  if (
    report.framework !== 'gea' ||
    !report.gea_defines?.includes('GEA_EMBEDDED_COMPARISON_BENCHMARK=1')
  ) {
    throw new Error('Capture requires the retained diagnostic artifact with physical output clamps')
  }

  const image = readFileSync(report.app_image.path)
  const sha256 = createHash('sha256').update(image).digest('hex')

  if (sha256 !== report.app_image.sha256 || image.length !== report.app_image.bytes) {
    throw new Error('Retained firmware artifact no longer matches its recorded identity')
  }

  return {
    firmwareBinarySha256: sha256,
    firmwareBinaryBytes: image.length,
    firmwareArtifactPath: report.app_image.path,
    firmwareVariant: report.variant,
    artifactRecordedAt: report.recorded_at,
    firmwareIdentityAuthority:
      'Hash-verified retained binary; device identity comes from root exclusive flash/handoff, not a device self-reported SHA',
  }
}
