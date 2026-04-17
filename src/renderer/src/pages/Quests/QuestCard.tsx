import { useState } from 'react'
import { Clock3, Swords, Trophy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Modal } from '../../components/ui/modal'
import { cn } from '../../lib/utils'
import { DailyQuestItem, QuestStatus, formatRemaining } from './questTypes'
import { QuestRewardBadges, buildQuestRewardBadges } from './QuestRewardBadges'

const STATUS_LABELS: Record<QuestStatus, string> = {
  available: 'Available',
  enrolled: 'Enrolled',
  active: 'Active',
  completed: 'Completed',
  failed: 'Failed',
  expired: 'Expired',
  abandoned: 'Abandoned'
}

const STATUS_STYLES: Record<QuestStatus, string> = {
  available: 'text-surface-300 border-surface-500 bg-surface-700/60',
  enrolled: 'text-blue-300 border-blue-500/40 bg-blue-500/10',
  active: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  completed: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
  failed: 'text-red-300 border-red-500/40 bg-red-500/10',
  expired: 'text-red-300 border-red-500/40 bg-red-500/10',
  abandoned: 'text-orange-300 border-orange-500/40 bg-orange-500/10'
}

interface QuestCardProps {
  quest: DailyQuestItem
  activeCount: number
  busyId: string | null
  onEnroll: (id: string) => void
  onAbandon: (id: string) => void
}

export function QuestCard({ quest, activeCount, busyId, onEnroll, onAbandon }: QuestCardProps) {
  const [confirmEnrollOpen, setConfirmEnrollOpen] = useState(false)
  const [confirmAbandonOpen, setConfirmAbandonOpen] = useState(false)

  const progress = quest.target > 0 ? Math.min(100, Math.round((quest.progress / quest.target) * 100)) : 0
  const isActive = quest.status === 'enrolled' || quest.status === 'active'
  const canEnroll = quest.status === 'available' && activeCount < 3
  const sanctionPreview = Math.max(20, Math.min(250, Math.round(quest.xp_reward * 0.75)))
  const rewardBadges = buildQuestRewardBadges({ eggRewardTier: quest.egg_reward_tier, focusReward: quest.focus_reward })

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold text-[color:var(--app-interactive-fg-default)] truncate">{quest.description}</CardTitle>
          <span
            className={cn(
              'text-[10px] uppercase tracking-wide px-2 py-1 rounded-md border font-semibold shrink-0',
              STATUS_STYLES[quest.status]
            )}
          >
            {STATUS_LABELS[quest.status]}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <QuestRewardBadges rewards={rewardBadges} />

        <div className="flex items-center gap-4 text-xs text-surface-300 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <Swords size={12} /> {quest.progress}/{quest.target}
          </span>
          <span className="inline-flex items-center gap-1">
            <Trophy size={12} /> +{quest.xp_reward} XP
          </span>
          {quest.sanction_xp > 0 && (
            <span className="text-red-300">Penalty: -{quest.sanction_xp} XP</span>
          )}
          {isActive && (
            <span className="inline-flex items-center gap-1 text-amber-300">
              <Clock3 size={12} /> {formatRemaining(quest.deadline_at)}
            </span>
          )}
        </div>

        <div className="h-2 rounded-full bg-surface-700 overflow-hidden">
          <div
            className={cn(
              'h-full transition-all',
              quest.status === 'completed' ? 'bg-emerald-400' : 'bg-primary-500'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center gap-2">
          {canEnroll && (
            <Button
              size="sm"
              variant="amber"
              loading={busyId === quest.id}
              onClick={() => setConfirmEnrollOpen(true)}
            >
              Enroll
            </Button>
          )}

          {isActive && (
            <Button
              size="sm"
              variant="danger"
              loading={busyId === quest.id}
              onClick={() => setConfirmAbandonOpen(true)}
            >
              Abandon
            </Button>
          )}

          {quest.status === 'available' && activeCount >= 3 && (
            <p className="text-xs text-surface-500">Max active quests reached.</p>
          )}
        </div>
      </CardContent>

      <Modal open={confirmEnrollOpen} onClose={() => setConfirmEnrollOpen(false)} title="Enroll in Quest" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-surface-300">
            Start <span className="text-[color:var(--app-interactive-fg-default)] font-semibold">{quest.description}</span> now?
          </p>
          <p className="text-xs text-surface-400">
            You can keep up to 3 daily quests active at once. This quest gives <span className="text-amber-300 font-semibold">+{quest.xp_reward} XP</span>{quest.focus_reward > 0 && <span> and <span className="text-cyan-300 font-semibold">+{quest.focus_reward} Focus 💎</span></span>} on completion.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmEnrollOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="amber"
              className="flex-1"
              loading={busyId === quest.id}
              onClick={() => {
                setConfirmEnrollOpen(false)
                onEnroll(quest.id)
              }}
            >
              Confirm Enroll
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={confirmAbandonOpen} onClose={() => setConfirmAbandonOpen(false)} title="Abandon Quest" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-surface-300">
            Abandon <span className="text-[color:var(--app-interactive-fg-default)] font-semibold">{quest.description}</span>?
          </p>
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200 space-y-1">
            <p>You will lose current progress: <span className="font-semibold">{quest.progress}/{quest.target}</span>.</p>
            <p>Estimated XP sanction on abandon: <span className="font-semibold">-{sanctionPreview} XP</span>.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmAbandonOpen(false)}>
              Keep Quest
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              loading={busyId === quest.id}
              onClick={() => {
                setConfirmAbandonOpen(false)
                onAbandon(quest.id)
              }}
            >
              Confirm Abandon
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  )
}
