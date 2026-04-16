import { useMemo, useState } from 'react'
import { Card, CardContent } from '../../components/ui/card'
import { CatalogQuestItem, QuestCategory, QuestDifficulty } from './questTypes'
import { CatalogQuestCard } from './CatalogQuestCard'
import { cn } from '../../lib/utils'

const CATEGORIES: Array<{ value: QuestCategory | 'all'; label: string; icon: string }> = [
  { value: 'all', label: 'All', icon: '📜' },
  { value: 'focus', label: 'Focus', icon: '⏱️' },
  { value: 'discipline', label: 'Discipline', icon: '⚔️' },
  { value: 'reflection', label: 'Reflection', icon: '📔' },
  { value: 'vitality', label: 'Vitality', icon: '⚡' },
  { value: 'mastery', label: 'Mastery', icon: '🌟' },
  { value: 'legendary', label: 'Legendary', icon: '👑' }
]

const DIFFICULTIES: Array<{ value: QuestDifficulty | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'legendary', label: 'Legendary' }
]

interface CatalogTabProps {
  quests: CatalogQuestItem[]
  loading: boolean
  busyId: string | null
  onEnroll: (definitionId: string) => void
  onAbandon: (enrollmentId: string) => void
}

export function CatalogTab({ quests, loading, busyId, onEnroll, onAbandon }: CatalogTabProps) {
  const [categoryFilter, setCategoryFilter] = useState<QuestCategory | 'all'>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<QuestDifficulty | 'all'>('all')

  const filtered = useMemo(() => {
    const result = quests.filter((q) => {
      const catMatch = categoryFilter === 'all' || q.category === categoryFilter
      const diffMatch = difficultyFilter === 'all' || q.difficulty === difficultyFilter
      return catMatch && diffMatch
    })

    // Sort: active/enrolled first, then by sort order (locked last-ish is handled by opacity in card)
    return [...result].sort((a, b) => {
      const aActive = a.enrollment?.status === 'enrolled' || a.enrollment?.status === 'active' ? 0 : 1
      const bActive = b.enrollment?.status === 'enrolled' || b.enrollment?.status === 'active' ? 0 : 1
      if (aActive !== bActive) return aActive - bActive
      return 0
    })
  }, [quests, categoryFilter, difficultyFilter])

  const enrolledCount = useMemo(
    () => quests.filter((q) => q.enrollment?.status === 'enrolled' || q.enrollment?.status === 'active').length,
    [quests]
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-surface-400">
          {enrolledCount > 0 ? `${enrolledCount} active` : 'No active catalog quests'}
        </span>
        <span className="text-xs text-surface-500">{filtered.length} quests shown</span>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategoryFilter(cat.value)}
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
              categoryFilter === cat.value
                ? 'bg-primary-600 text-white'
                : 'bg-surface-700 text-surface-300 hover:bg-surface-600'
            )}
          >
            <span>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Difficulty filter */}
      <div className="flex gap-1.5">
        {DIFFICULTIES.map((diff) => (
          <button
            key={diff.value}
            onClick={() => setDifficultyFilter(diff.value)}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
              difficultyFilter === diff.value
                ? 'bg-surface-500 text-white'
                : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
            )}
          >
            {diff.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-surface-400">Loading catalog...</CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-surface-400">No quests match your filters.</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((quest) => (
            <CatalogQuestCard
              key={quest.id}
              quest={quest}
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
