import { useMemo } from 'react'
import { Button } from './button'
import { useSyncStore } from '../../stores/sync.store'

export function SyncStatusBadge() {
  const { inProgress, lastSyncedAt, error, triggerSync } = useSyncStore()

  const label = useMemo(() => {
    if (inProgress) return 'Syncing...'
    if (error) return 'Sync error'
    if (!lastSyncedAt) return 'Never synced'

    return `Last synced ${new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(lastSyncedAt))}`
  }, [error, inProgress, lastSyncedAt])

  const toneClass = error
    ? 'border-red-500/30 bg-red-900/20 text-red-300'
    : inProgress
      ? 'border-primary-500/30 bg-primary-600/10 text-primary-300'
      : 'border-surface-600/60 bg-surface-700/60 text-surface-200'

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-sm border px-3 py-2 ${toneClass}`}>
      <p className="text-xs font-medium">{label}</p>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => void triggerSync()}
        disabled={inProgress}
      >
        {inProgress ? 'Syncing...' : 'Sync now'}
      </Button>
    </div>
  )
}
