import { ipcMain } from 'electron'
import { getDb } from '../db'
import {
  abandonQuest,
  enrollQuest,
  getQuestHistory,
  listQuestBoard,
  recordQuestProgress,
  syncExpiredEnrolledQuests
} from '../db/queries/quests.queries'

export function registerQuestsIpc(): void {
  ipcMain.handle('quests:list', () => {
    const db = getDb()
    return listQuestBoard(db)
  })

  ipcMain.handle(
    'quests:enroll',
    (_event, questId: string, options?: { timeWindowType?: 'daily' | 'weekly' | 'custom'; customDurationMins?: number }) => {
      const db = getDb()
      if (!questId) throw new Error('questId is required')
      return enrollQuest(db, questId, options)
    }
  )

  ipcMain.handle('quests:progress', (_event, questId: string, progress: number) => {
    const db = getDb()
    if (!questId) throw new Error('questId is required')
    if (!Number.isFinite(progress)) throw new Error('progress must be a number')
    return recordQuestProgress(db, questId, Math.floor(progress))
  })

  ipcMain.handle('quests:abandon', (_event, questId: string) => {
    const db = getDb()
    if (!questId) throw new Error('questId is required')
    return abandonQuest(db, questId)
  })

  ipcMain.handle('quests:history', (_event, limit?: number) => {
    const db = getDb()
    const safeLimit = Number.isInteger(limit) ? Math.max(1, Math.min(500, limit as number)) : 100
    return getQuestHistory(db, safeLimit)
  })

  ipcMain.handle('quests:refresh', () => {
    const db = getDb()
    const expiredCount = syncExpiredEnrolledQuests(db)
    return { expiredCount }
  })
}
