import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Card, CardContent } from '../../components/ui/card'
import { cn } from '../../lib/utils'
import { DailyQuestItem } from './questTypes'
import { QuestCard } from './QuestCard'

function useCountdownToMidnight(): string {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    function update() {
      const now = new Date()
      const midnight = new Date(now)
      midnight.setHours(23, 59, 59, 999)
      const diff = midnight.getTime() - Date.now()
      if (diff <= 0) {
        setRemaining('Resetting...')
        return
      }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setRemaining(`${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  return remaining
}

interface DailyQuestsTabProps {
  quests: DailyQuestItem[]
  loading: boolean
  activeCount: number
  busyId: string | null
  onEnroll: (id: string) => void
  onAbandon: (id: string) => void
  rerollCount: number
  rerolling: boolean
  onReroll: () => void
}

export function DailyQuestsTab({ quests, loading, activeCount, busyId, onEnroll, onAbandon, rerollCount, rerolling, onReroll }: DailyQuestsTabProps) {
  const countdown = useCountdownToMidnight()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <RefreshCw size={14} className="text-surface-400" />
          <span className="text-xs text-surface-400">Resets at midnight</span>
          <span className="text-xs font-mono text-amber-400">{countdown}</span>
        </div>
        <div className="flex items-center gap-2">
          {rerollCount > 0 && (
            <button
              onClick={onReroll}
              disabled={rerolling}
              className={cn(
                'text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors',
                rerolling
                  ? 'bg-surface-700 text-surface-500 border-surface-600'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/40 ui-bg-hover'
              )}
            >
              Reroll ({rerollCount})
            </button>
          )}
          <span className="text-xs text-surface-400">Active:</span>
          <span className="text-sm font-bold text-[color:var(--app-interactive-fg-default)]">{activeCount}/3</span>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-surface-400">Loading daily quests...</CardContent>
        </Card>
      ) : quests.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-surface-400">No quests available today.</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {quests.map((quest) => (
            <QuestCard
              key={quest.id}
              quest={quest}
              activeCount={activeCount}
              busyId={busyId}
              onEnroll={onEnroll}
              onAbandon={onAbandon}
            />
          ))}
        </div>
      )}
    </div>
  )
}
