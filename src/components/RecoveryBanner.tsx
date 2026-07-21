import type { RecoveredProject } from '../persistence/recoveryRepository'

interface RecoveryBannerProps {
  readonly recovery: RecoveredProject | null
  readonly message: string | null
  readonly onRestore: () => void
  readonly onDiscard: () => void
}

export function RecoveryBanner({
  recovery,
  message,
  onRestore,
  onDiscard,
}: RecoveryBannerProps) {
  if (!recovery && !message) return null

  const recoveredLabel = recovery
    ? new Date(recovery.recoveredAt).toLocaleString()
    : null

  return (
    <section
      className="recovery-banner"
      aria-label="Crash recovery"
      aria-live="polite"
      data-testid="recovery-banner"
    >
      <div>
        <strong>{recovery ? 'Unsaved Work Was Recovered' : 'Recovery Needs Attention'}</strong>
        <span>
          {recovery
            ? `A local snapshot from ${recoveredLabel} is available.`
            : message}
        </span>
      </div>
      <div className="recovery-banner-actions">
        {recovery ? (
          <button type="button" onClick={onRestore}>
            Restore
          </button>
        ) : null}
        <button type="button" onClick={onDiscard}>
          Discard
        </button>
      </div>
    </section>
  )
}
