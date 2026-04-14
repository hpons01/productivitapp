import { ipcMain } from 'electron'
import { getDb } from '../db'
import { saveJournalEntry, getTodayEntry, listEntries } from '../db/queries/journal.queries'
import { awardXP } from '../db/queries/gamification.queries'
import { setQuestProgressByType } from '../db/queries/quests.queries'

export function registerJournalIpc(): void {
  ipcMain.handle('journal:save', (_event, data) => {
    const db = getDb()
    const entry = saveJournalEntry(db, data)

    // Award XP based on type
    const xpMap: Record<string, number> = {
      morning: 25,
      evening: 20,
      visualization: 15
    }
    const baseXP = xpMap[data.type] || 10
    const xpAward = awardXP(db, 'journal', entry.id, baseXP)

    if (data.type === 'morning') {
      setQuestProgressByType(db, 'morning_ritual', 1)
    }
    if (data.type === 'evening') {
      setQuestProgressByType(db, 'evening_ritual', 1)
    }

    return {
      ...entry,
      xpAwarded: xpAward.finalAmount,
      baseXP: xpAward.baseAmount,
      multiplier: xpAward.multiplier
    }
  })

  ipcMain.handle('journal:today', (_event, type: string) => {
    const db = getDb()
    return getTodayEntry(db, type) || null
  })

  ipcMain.handle('journal:list', (_event, limit?: number) => {
    const db = getDb()
    return listEntries(db, limit)
  })
}
