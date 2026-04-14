import { ipcMain } from 'electron'
import { getDb } from '../db'
import {
  abandonQuest,
  enrollQuest,
  getQuestHistory,
  listQuestBoard,
  recordQuestProgress,
  syncExpiredEnrolledQuests,
  getCatalogQuests,
  enrollCatalogQuest,
  abandonCatalogQuest,
  recordCatalogQuestProgress,
  syncExpiredCatalogEnrollments
} from '../db/queries/quests.queries'

export function registerQuestsIpc(): void {
  ipcMain.handle('quests:list', () => {
    const db = getDb()
    return listQuestBoard(db)
  })

  ipcMain.handle('quests:enroll', (_event, questId: string) => {
    const db = getDb()
    if (!questId) throw new Error('questId is required')
    return enrollQuest(db, questId)
  })

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
    const catalogExpiredCount = syncExpiredCatalogEnrollments(db)
    return { expiredCount, catalogExpiredCount }
  })

  // ── Catalog ──────────────────────────────────────────────────────────────

  ipcMain.handle('quests:catalog', () => {
    const db = getDb()
    return getCatalogQuests(db)
  })

  ipcMain.handle('quests:catalog:enroll', (_event, definitionId: string) => {
    const db = getDb()
    if (!definitionId) throw new Error('definitionId is required')
    return enrollCatalogQuest(db, definitionId)
  })

  ipcMain.handle('quests:catalog:abandon', (_event, enrollmentId: string) => {
    const db = getDb()
    if (!enrollmentId) throw new Error('enrollmentId is required')
    return abandonCatalogQuest(db, enrollmentId)
  })

  ipcMain.handle('quests:catalog:progress', (_event, enrollmentId: string, progress: number) => {
    const db = getDb()
    if (!enrollmentId) throw new Error('enrollmentId is required')
    if (!Number.isFinite(progress)) throw new Error('progress must be a number')
    return recordCatalogQuestProgress(db, enrollmentId, Math.floor(progress))
  })
}
