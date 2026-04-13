import { ipcMain } from 'electron'
import { getDb } from '../db'
import { saveJournalEntry, getTodayEntry, listEntries } from '../db/queries/journal.queries'
import { addXP } from '../db/queries/gamification.queries'

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
    const xpAmount = xpMap[data.type] || 10
    addXP(db, 'journal', entry.id, xpAmount)

    return { ...entry, xpAwarded: xpAmount }
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
