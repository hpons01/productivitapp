import { useCallback, useEffect, useMemo, useState } from 'react'
import { DailyQuestItem } from './questTypes'

export function useDailyQuests() {
  const [quests, setQuests] = useState<DailyQuestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      await window.api.quests.refresh()
      const data = await window.api.quests.list()
      setQuests(data as DailyQuestItem[])
    } catch {
      setQuests([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const enroll = useCallback(
    async (questId: string) => {
      setBusyId(questId)
      try {
        await window.api.quests.enroll(questId)
        await load()
      } finally {
        setBusyId(null)
      }
    },
    [load]
  )

  const abandon = useCallback(
    async (questId: string) => {
      setBusyId(questId)
      try {
        await window.api.quests.abandon(questId)
        await load()
      } finally {
        setBusyId(null)
      }
    },
    [load]
  )

  const activeCount = useMemo(
    () => quests.filter((q) => q.status === 'enrolled' || q.status === 'active').length,
    [quests]
  )

  return { quests, loading, busyId, enroll, abandon, activeCount, reload: load }
}
