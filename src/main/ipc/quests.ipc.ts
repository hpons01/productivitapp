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
import { logEvent } from '../db/queries/eventlog.queries'

export function registerQuestsIpc(): void {
  ipcMain.handle('quests:list', () => {
    const db = getDb()
    return listQuestBoard(db)
  })

  ipcMain.handle('quests:enroll', (_event, questId: string) => {
    const db = getDb()
    if (!questId) throw new Error('questId is required')
    const quest = enrollQuest(db, questId)
    logEvent(db, 'quest_enrolled', 'quest', questId, { type: 'daily' })
    return quest
  })

  ipcMain.handle('quests:progress', (_event, questId: string, progress: number) => {
    const db = getDb()
    if (!questId) throw new Error('questId is required')
    if (!Number.isFinite(progress)) throw new Error('progress must be a number')
    const nextProgress = Math.floor(progress)
    const current = db
      .prepare('SELECT progress, target, status FROM daily_quests WHERE id = ?')
      .get(questId) as { progress: number; target: number; status: string } | undefined
    if (!current) throw new Error('Quest not found.')
    if (nextProgress <= current.progress) {
      return {
        questId,
        status: current.status,
        progress: current.progress,
        target: current.target,
        milestoneXpAwarded: 0,
        completionXpAwarded: 0,
        penaltyApplied: 0
      }
    }

    const result = recordQuestProgress(db, questId, nextProgress)
    logEvent(db, 'quest_progress_updated', 'quest', questId, {
      progress: result.progress,
      target: result.target,
      status: result.status
    })
    return result
  })

  ipcMain.handle('quests:abandon', (_event, questId: string) => {
    const db = getDb()
    if (!questId) throw new Error('questId is required')
    const result = abandonQuest(db, questId)
    logEvent(db, 'quest_abandoned', 'quest', questId, { penalty: result.penaltyApplied })
    return result
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
    const enrollment = enrollCatalogQuest(db, definitionId)
    logEvent(db, 'quest_catalog_enrolled', 'catalog_quest', definitionId, { enrollmentId: enrollment.id })
    return enrollment
  })

  ipcMain.handle('quests:catalog:abandon', (_event, enrollmentId: string) => {
    const db = getDb()
    if (!enrollmentId) throw new Error('enrollmentId is required')
    const result = abandonCatalogQuest(db, enrollmentId)
    logEvent(db, 'quest_catalog_abandoned', 'catalog_enrollment', enrollmentId, { penalty: result.penaltyApplied })
    return result
  })

  ipcMain.handle('quests:catalog:progress', (_event, enrollmentId: string, progress: number) => {
    const db = getDb()
    if (!enrollmentId) throw new Error('enrollmentId is required')
    if (!Number.isFinite(progress)) throw new Error('progress must be a number')
    const nextProgress = Math.floor(progress)
    const current = db
      .prepare(`
        SELECT e.progress, e.status, d.target_count as target
        FROM catalog_enrollments e
        JOIN quest_definitions d ON d.id = e.definition_id
        WHERE e.id = ?
      `)
      .get(enrollmentId) as { progress: number; status: string; target: number } | undefined
    if (!current) throw new Error('Catalog enrollment not found.')
    if (nextProgress <= current.progress) {
      return {
        questId: enrollmentId,
        status: current.status,
        progress: current.progress,
        target: current.target,
        milestoneXpAwarded: 0,
        completionXpAwarded: 0,
        penaltyApplied: 0
      }
    }

    const result = recordCatalogQuestProgress(db, enrollmentId, nextProgress)
    logEvent(db, 'quest_catalog_progress_updated', 'catalog_enrollment', enrollmentId, {
      progress: result.progress,
      target: result.target,
      status: result.status
    })
    return result
  })
}
