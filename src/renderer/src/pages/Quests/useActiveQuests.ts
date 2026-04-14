import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActiveQuestItem,
  CatalogQuestItem,
  DailyQuestItem
} from './questTypes'

function toTitleCase(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function useActiveQuests() {
  const [quests, setQuests] = useState<ActiveQuestItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      await window.api.quests.refresh()
      const [dailyData, catalogData] = await Promise.all([
        window.api.quests.list(),
        window.api.quests.catalog()
      ])

      const dailyActive = (dailyData as DailyQuestItem[])
        .filter((quest) => quest.status === 'enrolled' || quest.status === 'active')
        .map((quest) => ({
          source: 'daily' as const,
          id: `daily:${quest.id}`,
          questId: quest.id,
          title: toTitleCase(quest.quest_type),
          description: quest.description,
          status: quest.status,
          progress: quest.progress,
          target: quest.target,
          deadline_at: quest.deadline_at,
          xp_reward: quest.xp_reward
        }))

      const catalogActive = (catalogData as CatalogQuestItem[])
        .filter((quest) => quest.enrollment && (quest.enrollment.status === 'enrolled' || quest.enrollment.status === 'active'))
        .map((quest) => ({
          source: 'catalog' as const,
          id: `catalog:${quest.enrollment!.id}`,
          enrollmentId: quest.enrollment!.id,
          definitionId: quest.id,
          title: quest.title,
          description: quest.description,
          status: quest.enrollment!.status,
          progress: quest.enrollment!.progress,
          target: quest.target_count,
          deadline_at: quest.enrollment!.deadline_at,
          xp_reward: quest.scaled_xp_reward,
          difficulty: quest.difficulty
        }))

      const merged = [...dailyActive, ...catalogActive].sort((a, b) => {
        if (a.deadline_at === null && b.deadline_at === null) return 0
        if (a.deadline_at === null) return 1
        if (b.deadline_at === null) return -1
        return a.deadline_at - b.deadline_at
      })

      setQuests(merged)
    } catch {
      setQuests([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const activeCount = useMemo(() => quests.length, [quests])

  return { quests, loading, activeCount, reload: load }
}
