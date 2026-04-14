import { useEffect, useMemo, useState } from 'react'
import { ScrollText, Clock3, Trophy, Swords } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { cn } from '../../lib/utils'

type QuestStatus = 'available' | 'enrolled' | 'active' | 'completed' | 'failed' | 'expired' | 'abandoned'
type QuestWindow = 'daily' | 'weekly' | 'custom'

interface QuestItem {
  id: string
  quest_type: string
  description: string
  target: number
  progress: number
  status: QuestStatus
  xp_reward: number
  deadline_at: number | null
  sanction_xp: number
}

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

function formatRemaining(deadlineAt: number | null): string {
  if (!deadlineAt) return 'No deadline'
  const diff = deadlineAt - Date.now()
  if (diff <= 0) return 'Expired'

  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m left`
  const hours = Math.floor(mins / 60)
  const remMins = mins % 60
  if (hours < 24) return `${hours}h ${remMins}m left`
  const days = Math.floor(hours / 24)
  const remHours = hours % 24
  return `${days}d ${remHours}h left`
}

export function QuestsPage() {
  const [quests, setQuests] = useState<QuestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busyQuestId, setBusyQuestId] = useState<string | null>(null)
  const [windowTypeByQuest, setWindowTypeByQuest] = useState<Record<string, QuestWindow>>({})

  const activeCount = useMemo(
    () => quests.filter((q) => q.status === 'enrolled' || q.status === 'active').length,
    [quests]
  )

  async function loadQuests(): Promise<void> {
    setLoading(true)
    try {
      await window.api.quests.refresh()
      const data = await window.api.quests.list()
      setQuests(data as QuestItem[])
    } catch {
      setQuests([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadQuests()
  }, [])

  async function handleEnroll(questId: string): Promise<void> {
    setBusyQuestId(questId)
    try {
      const selectedWindow = windowTypeByQuest[questId] ?? 'daily'
      await window.api.quests.enroll(questId, { timeWindowType: selectedWindow })
      await loadQuests()
    } finally {
      setBusyQuestId(null)
    }
  }

  async function handleAbandon(questId: string): Promise<void> {
    setBusyQuestId(questId)
    try {
      await window.api.quests.abandon(questId)
      await loadQuests()
    } finally {
      setBusyQuestId(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ScrollText size={22} className="text-amber-400" />
            Quest Log
          </h1>
          <p className="text-sm text-surface-400 mt-1">
            Enroll in up to 3 quests at once. Completing quests gives rewards, failing them applies hard sanctions.
          </p>
        </div>
        <Card className="min-w-[160px]">
          <CardContent className="py-3 px-4">
            <p className="text-xs text-surface-400">Active Enrollments</p>
            <p className="text-xl font-bold text-white">{activeCount}/3</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-surface-400">Loading quests...</CardContent>
        </Card>
      ) : quests.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-surface-400">No quests available yet.</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {quests.map((quest) => {
            const progress = quest.target > 0 ? Math.min(100, Math.round((quest.progress / quest.target) * 100)) : 0
            const isActive = quest.status === 'enrolled' || quest.status === 'active'
            const canEnroll = quest.status === 'available' && activeCount < 3

            return (
              <Card key={quest.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-sm font-semibold text-white">{quest.description}</CardTitle>
                    <span
                      className={cn(
                        'text-[10px] uppercase tracking-wide px-2 py-1 rounded-md border font-semibold',
                        STATUS_STYLES[quest.status]
                      )}
                    >
                      {STATUS_LABELS[quest.status]}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-xs text-surface-300">
                    <span className="inline-flex items-center gap-1"><Swords size={12} /> {quest.progress}/{quest.target}</span>
                    <span className="inline-flex items-center gap-1"><Trophy size={12} /> +{quest.xp_reward} XP</span>
                    {quest.sanction_xp > 0 && <span className="text-red-300">Penalty: -{quest.sanction_xp} XP</span>}
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
                      <>
                        <select
                          value={windowTypeByQuest[quest.id] ?? 'daily'}
                          onChange={(event) =>
                            setWindowTypeByQuest((prev) => ({ ...prev, [quest.id]: event.target.value as QuestWindow }))
                          }
                          className="h-8 rounded-lg bg-surface-700 border border-surface-500 px-2 text-xs text-white"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="custom">Custom</option>
                        </select>
                        <Button
                          size="sm"
                          variant="amber"
                          loading={busyQuestId === quest.id}
                          onClick={() => void handleEnroll(quest.id)}
                        >
                          Enroll
                        </Button>
                      </>
                    )}

                    {isActive && (
                      <Button
                        size="sm"
                        variant="danger"
                        loading={busyQuestId === quest.id}
                        onClick={() => void handleAbandon(quest.id)}
                      >
                        Abandon
                      </Button>
                    )}

                    {quest.status === 'available' && activeCount >= 3 && (
                      <p className="text-xs text-surface-500">Max active quests reached.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
