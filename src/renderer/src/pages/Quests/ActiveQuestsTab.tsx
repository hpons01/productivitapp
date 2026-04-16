import { useState } from 'react'
import { ScrollText, BookOpen, Clock3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Modal } from '../../components/ui/modal'
import { cn } from '../../lib/utils'
import { ActiveQuestItem, formatRemaining } from './questTypes'

interface ActiveQuestsTabProps {
  quests: ActiveQuestItem[]
  loading: boolean
  dailyBusyId: string | null
  catalogBusyId: string | null
  onAbandonDaily: (questId: string) => void
  onAbandonCatalog: (enrollmentId: string) => void
}

export function ActiveQuestsTab({
  quests,
  loading,
  dailyBusyId,
  catalogBusyId,
  onAbandonDaily,
  onAbandonCatalog
}: ActiveQuestsTabProps) {
  const [pendingAbandon, setPendingAbandon] = useState<ActiveQuestItem | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-surface-400">
          {quests.length > 0 ? `${quests.length} active quests` : 'No active quests'}
        </span>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-surface-400">Loading active quests...</CardContent>
        </Card>
      ) : quests.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-surface-400">Enroll in a daily or catalog quest to see it here.</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {quests.map((quest) => {
            const isDaily = quest.source === 'daily'
            const sourceLabel = isDaily ? 'Daily' : 'Catalog'
            const sourceIcon = isDaily ? <ScrollText size={12} /> : <BookOpen size={12} />
            const sourceStyle = isDaily
              ? 'text-amber-300 border-amber-500/40 bg-amber-500/10'
              : 'text-primary-300 border-primary-500/40 bg-primary-500/10'
            const busy = isDaily
              ? dailyBusyId === quest.questId
              : catalogBusyId === quest.enrollmentId

            return (
              <Card key={quest.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-sm font-semibold text-white">{quest.title}</CardTitle>
                    <span className={cn('inline-flex items-center gap-1 text-[10px] uppercase tracking-wide px-2 py-1 rounded-md border font-semibold', sourceStyle)}>
                      {sourceIcon}
                      {sourceLabel}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-surface-400">{quest.description}</p>

                  <div className="flex items-center gap-3 text-xs text-surface-300 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 size={12} />
                      {formatRemaining(quest.deadline_at)}
                    </span>
                    <span>
                      {quest.progress}/{quest.target}
                    </span>
                    <span className="text-amber-300">+{quest.xp_reward} XP</span>
                  </div>

                  <div className="h-2 rounded-full bg-surface-700 overflow-hidden">
                    <div
                      className={cn('h-full transition-all', isDaily ? 'bg-amber-400' : 'bg-primary-400')}
                      style={{ width: `${Math.min(100, Math.round((quest.progress / Math.max(1, quest.target)) * 100))}%` }}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={busy}
                      onClick={() => setPendingAbandon(quest)}
                    >
                      Abandon
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={pendingAbandon !== null} onClose={() => setPendingAbandon(null)} title="Abandon Quest" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-surface-300">
            Abandon <span className="text-white font-semibold">{pendingAbandon?.title}</span>?
          </p>
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200 space-y-1">
            <p>You will lose current progress: <span className="font-semibold">{pendingAbandon?.progress ?? 0}/{pendingAbandon?.target ?? 0}</span>.</p>
            <p>Estimated XP sanction on abandon: <span className="font-semibold">-{pendingAbandon ? Math.max(20, Math.min(250, Math.round(pendingAbandon.xp_reward * 0.75))) : 0} XP</span>.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setPendingAbandon(null)}>
              Keep Quest
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              loading={pendingAbandon?.source === 'daily'
                ? dailyBusyId === pendingAbandon?.questId
                : catalogBusyId === pendingAbandon?.enrollmentId}
              onClick={() => {
                if (!pendingAbandon) return
                if (pendingAbandon.source === 'daily') {
                  onAbandonDaily(pendingAbandon.questId)
                } else {
                  onAbandonCatalog(pendingAbandon.enrollmentId)
                }
                setPendingAbandon(null)
              }}
            >
              Confirm Abandon
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
