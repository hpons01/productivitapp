import { useCallback, useEffect, useMemo, useState } from 'react'
import { DailyQuestItem } from './questTypes'

export function useDailyQuests() {
  const [quests, setQuests] = useState<DailyQuestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rerollCount, setRerollCount] = useState(0)
  const [rerolling, setRerolling] = useState(false)

  const loadRerollCount = useCallback(async () => {
    try {
      const items = await window.api.loot.list() as Array<{ type: string; payload: string; used_at: number | null }>
      const available = items.filter((item) => {
        if (item.used_at) return false
        if (item.type !== 'power_up') return false
        try {
          const payload = JSON.parse(item.payload) as { effectType?: string }
          return payload.effectType === 'quest_reroll'
        } catch {
          return false
        }
      })
      setRerollCount(available.length)
    } catch {
      setRerollCount(0)
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      await window.api.quests.refresh()
      const [data] = await Promise.all([
        window.api.quests.list(),
        loadRerollCount()
      ])
      setQuests(data as DailyQuestItem[])
    } catch {
      setQuests([])
    } finally {
      setLoading(false)
    }
  }, [loadRerollCount])

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

  const reroll = useCallback(async () => {
    if (rerolling) return
    setRerolling(true)
    try {
      const items = await window.api.loot.list() as Array<{ id: string; type: string; payload: string; used_at: number | null }>
      const nextItem = items.find((item) => {
        if (item.used_at) return false
        if (item.type !== 'power_up') return false
        try {
          const payload = JSON.parse(item.payload) as { effectType?: string }
          return payload.effectType === 'quest_reroll'
        } catch {
          return false
        }
      })
      if (!nextItem) return

      await window.api.quests.reroll()
      await window.api.loot.activate(nextItem.id)
      await load()
    } finally {
      setRerolling(false)
    }
  }, [load, rerolling])

  return { quests, loading, busyId, enroll, abandon, activeCount, reload: load, rerollCount, rerolling, reroll }
}
