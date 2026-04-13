import { ipcMain } from 'electron'
import { getDb } from '../db'
import { getDashboardStats, getHeatmapData } from '../db/queries/analytics.queries'
import { getBadges, unlockBadge, addXP, getOrCreateDailyQuests } from '../db/queries/gamification.queries'

export function registerAnalyticsIpc(): void {
  ipcMain.handle('analytics:dashboard', () => {
    const db = getDb()
    // Ensure daily quests exist
    getOrCreateDailyQuests(db)
    return getDashboardStats(db)
  })

  ipcMain.handle('analytics:heatmap', (_event, year: number) => {
    const db = getDb()
    return getHeatmapData(db, year)
  })

  ipcMain.handle('analytics:badges', () => {
    const db = getDb()
    return getBadges(db)
  })

  ipcMain.handle('analytics:xpLog', (_event, limit?: number) => {
    const db = getDb()
    return db
      .prepare('SELECT * FROM xp_log ORDER BY logged_at DESC LIMIT ?')
      .all(limit || 50)
  })

  ipcMain.handle('analytics:unlockBadge', (_event, code: string) => {
    const db = getDb()
    return unlockBadge(db, code)
  })

  ipcMain.handle('analytics:addXp', (_event, source: string, sourceId: string, amount: number) => {
    const db = getDb()
    addXP(db, source, sourceId, amount)
    return { success: true }
  })
}
