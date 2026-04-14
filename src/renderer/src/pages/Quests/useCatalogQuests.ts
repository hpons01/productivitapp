import { useCallback, useEffect, useState } from 'react'
import { CatalogQuestItem } from './questTypes'

export function useCatalogQuests() {
  const [quests, setQuests] = useState<CatalogQuestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await window.api.quests.catalog()
      setQuests(data as CatalogQuestItem[])
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
    async (definitionId: string) => {
      setBusyId(definitionId)
      try {
        await window.api.quests.catalogEnroll(definitionId)
        await load()
      } finally {
        setBusyId(null)
      }
    },
    [load]
  )

  const abandon = useCallback(
    async (enrollmentId: string) => {
      setBusyId(enrollmentId)
      try {
        await window.api.quests.catalogAbandon(enrollmentId)
        await load()
      } finally {
        setBusyId(null)
      }
    },
    [load]
  )

  return { quests, loading, busyId, enroll, abandon, reload: load }
}
