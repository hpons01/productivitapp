import { useState } from 'react'
import { Lock, Clock3, Trophy, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Modal } from '../../components/ui/modal'
import { cn } from '../../lib/utils'
import { CatalogQuestItem, QuestDifficulty, QuestCategory, formatRemaining } from './questTypes'

const DIFFICULTY_STYLES: Record<QuestDifficulty, { badge: string; bar: string }> = {
  easy: { badge: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10', bar: 'bg-emerald-400' },
  medium: { badge: 'text-amber-300 border-amber-500/40 bg-amber-500/10', bar: 'bg-amber-400' },
  hard: { badge: 'text-red-300 border-red-500/40 bg-red-500/10', bar: 'bg-red-400' },
  legendary: { badge: 'text-yellow-300 border-yellow-500/40 bg-yellow-500/10', bar: 'bg-yellow-400' }
}

const DIFFICULTY_LABELS: Record<QuestDifficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  legendary: 'Legendary'
}

const CATEGORY_ICONS: Record<QuestCategory, string> = {
  focus: '⏱️',
  discipline: '⚔️',
  reflection: '📔',
  vitality: '⚡',
  mastery: '🌟',
  legendary: '👑'
}

interface CatalogQuestCardProps {
  quest: CatalogQuestItem
  busyId: string | null
  onEnroll: (definitionId: string) => void
  onAbandon: (enrollmentId: string) => void
}

export function CatalogQuestCard({ quest, busyId, onEnroll, onAbandon }: CatalogQuestCardProps) {
  const [confirmEnrollOpen, setConfirmEnrollOpen] = useState(false)
  const [confirmAbandonOpen, setConfirmAbandonOpen] = useState(false)

  const enrollment = quest.enrollment
  const status = enrollment?.status ?? null
  const isActive = status === 'enrolled' || status === 'active'
  const isCompleted = status === 'completed'
  const isFailed = status === 'failed'
  const canEnroll = !quest.is_locked && !isActive && !isCompleted
  const sanctionPreview = Math.max(20, Math.min(250, Math.round(quest.scaled_xp_reward * 0.75)))

  const progress = isActive && quest.target_count > 0
    ? Math.min(100, Math.round(((enrollment?.progress ?? 0) / quest.target_count) * 100))
    : 0

  const diffStyle = DIFFICULTY_STYLES[quest.difficulty]

  return (
    <Card className={cn('relative overflow-hidden', quest.is_locked && 'opacity-60')}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="shrink-0">{CATEGORY_ICONS[quest.category]}</span>
            <CardTitle className="text-sm font-semibold text-white truncate">{quest.title}</CardTitle>
            {quest.egg_reward_tier && (
              <span className="text-sm shrink-0" title="Egg reward">🥚</span>
            )}
            {quest.loot_reward_tier && (
              <span className="text-sm shrink-0" title="Loot reward">✨</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={cn('text-[10px] uppercase tracking-wide px-2 py-1 rounded-md border font-semibold', diffStyle.badge)}>
              {DIFFICULTY_LABELS[quest.difficulty]}
            </span>
            {isCompleted && (
              <CheckCircle2 size={16} className="text-emerald-400" />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-xs text-surface-400">{quest.description}</p>

        {quest.flavor_text && !isActive && !isCompleted && (
          <p className="text-[11px] text-surface-500 italic">"{quest.flavor_text}"</p>
        )}

        <div className="flex items-center gap-3 text-xs text-surface-300 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <Trophy size={12} /> +{quest.scaled_xp_reward} XP
          </span>
          {!isActive && !isCompleted && (
            <span className="text-surface-200 border border-surface-500 bg-surface-600/30 rounded px-1.5 py-0.5 font-medium">
              {quest.duration_days}d window
            </span>
          )}
          {isActive && enrollment && (
            <span className="inline-flex items-center gap-1 text-amber-300">
              <Clock3 size={12} /> {formatRemaining(enrollment.deadline_at)}
            </span>
          )}
          {isActive && (
            <span className="text-surface-300">
              {enrollment?.progress ?? 0}/{quest.target_count}
            </span>
          )}
          {isFailed && enrollment && enrollment.sanction_xp > 0 && (
            <span className="text-red-400">-{enrollment.sanction_xp} XP penalty</span>
          )}
          {isCompleted && enrollment?.completed_at && (
            <span className="text-emerald-400">
              Completed {new Date(enrollment.completed_at).toLocaleDateString()}
            </span>
          )}
        </div>

        {isActive && (
          <div className="h-2 rounded-full bg-surface-700 overflow-hidden">
            <div
              className={cn('h-full transition-all', diffStyle.bar)}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          {quest.is_locked && (
            <div className="inline-flex items-center gap-1.5 text-xs text-amber-200 border border-amber-500/40 bg-amber-500/10 rounded-md px-2 py-1">
              <Lock size={12} className="text-amber-300" />
              <span className="font-medium">Unlocks at Level {quest.min_level_required}</span>
            </div>
          )}

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

          {isActive && enrollment && (
            <Button
              size="sm"
              variant="secondary"
              loading={busyId === enrollment.id}
              onClick={() => setConfirmAbandonOpen(true)}
            >
              Abandon
            </Button>
          )}

          {isFailed && (
            <Button
              size="sm"
              variant="amber"
              loading={busyId === quest.id}
              onClick={() => setConfirmEnrollOpen(true)}
            >
              Re-enroll
            </Button>
          )}

          {isCompleted && (
            <span className="text-xs text-emerald-400 font-semibold">Quest Complete!</span>
          )}
        </div>
      </CardContent>

      <Modal open={confirmEnrollOpen} onClose={() => setConfirmEnrollOpen(false)} title="Enroll in Quest" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-surface-300">
            Enroll in <span className="text-white font-semibold">{quest.title}</span>?
          </p>
          <p className="text-xs text-surface-400">
            Time window: <span className="text-surface-200 font-semibold">{quest.duration_days} days</span>. Completion reward: <span className="text-amber-300 font-semibold">+{quest.scaled_xp_reward} XP</span>.
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
            Abandon <span className="text-white font-semibold">{quest.title}</span>?
          </p>
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200 space-y-1">
            <p>You will lose current progress: <span className="font-semibold">{enrollment?.progress ?? 0}/{quest.target_count}</span>.</p>
            <p>Estimated XP sanction on abandon: <span className="font-semibold">-{sanctionPreview} XP</span>.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmAbandonOpen(false)}>
              Keep Quest
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              loading={busyId === enrollment?.id}
              onClick={() => {
                if (!enrollment) return
                setConfirmAbandonOpen(false)
                onAbandon(enrollment.id)
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
