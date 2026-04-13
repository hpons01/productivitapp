import { ipcMain } from 'electron'
import { getDb } from '../db'
import {
  startSession,
  completeSession,
  abandonSession,
  listSessions,
  getTodayStats
} from '../db/queries/pomodoro.queries'
import { awardXP, damageBoss } from '../db/queries/gamification.queries'
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
    const baseXP = interruptions === 0 ? 40 : 30
    const xpAward = awardXP(db, 'pomodoro', id, baseXP)
    const session = completeSession(db, id, Date.now(), interruptions, xpAward.finalAmount)

    // Damage boss
    try {
      damageBoss(db, 50)
    } catch {}

    // Send break notification
    sendNotification('🍅 Pomodoro Complete!', 'Great work! Time for a well-deserved break.')

    return {
      ...session,
      xpAwarded: xpAward.finalAmount,
      baseXP: xpAward.baseAmount,
      multiplier: xpAward.multiplier
    }
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
