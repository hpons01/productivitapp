import { ipcMain } from 'electron'
import { getDb } from '../db'
import {
  startSession,
  completeSession,
  abandonSession,
  listSessions,
  getTodayStats
} from '../db/queries/pomodoro.queries'
import { addXP, damageBoss } from '../db/queries/gamification.queries'
import { sendNotification } from '../notifications'

export function registerPomodoroIpc(): void {
  ipcMain.handle('pomodoro:start', (_event, data) => {
    const db = getDb()
    return startSession(db, data)
  })

  ipcMain.handle('pomodoro:complete', (_event, data) => {
    const db = getDb()
    const { id, interruptions = 0 } = data

    // XP: base 30 + bonus for zero interruptions
    const xpAmount = interruptions === 0 ? 40 : 30
    const session = completeSession(db, id, Date.now(), interruptions, xpAmount)
    addXP(db, 'pomodoro', id, xpAmount)

    // Damage boss
    try {
      damageBoss(db, 50)
    } catch {}

    // Send break notification
    sendNotification('🍅 Pomodoro Complete!', 'Great work! Time for a well-deserved break.')

    return { ...session, xpAwarded: xpAmount }
  })

  ipcMain.handle('pomodoro:abandon', (_event, id: string) => {
    const db = getDb()
    abandonSession(db, id)
    return { success: true }
  })

  ipcMain.handle('pomodoro:list', (_event, date?: string) => {
    const db = getDb()
    return listSessions(db, date)
  })

  ipcMain.handle('pomodoro:todayStats', () => {
    const db = getDb()
    return getTodayStats(db)
  })
}
