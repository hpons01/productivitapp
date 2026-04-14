import { ipcMain } from 'electron'
import { getDb } from '../db'
import {
  startSession,
  completeSession,
  abandonSession,
  listSessions,
  getTodayStats,
  listPresets,
  createPreset,
  deletePreset
} from '../db/queries/pomodoro.queries'
import { awardXP, damageBoss } from '../db/queries/gamification.queries'
import { sendNotification } from '../notifications'
import { incrementQuestProgressByType } from '../db/queries/quests.queries'

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

    // Enrolled quest progress updates.
    incrementQuestProgressByType(db, 'pomodoros', 1)
    if (new Date().getHours() < 12) {
      incrementQuestProgressByType(db, 'pomodoros_morning', 1)
    }
    if (interruptions === 0) {
      incrementQuestProgressByType(db, 'deep_focus_day', 1)
    }
    incrementQuestProgressByType(db, 'egg_hatch_prep', 1)

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

  ipcMain.handle('pomodoro:presets:list', () => {
    const db = getDb()
    return listPresets(db)
  })

  ipcMain.handle('pomodoro:presets:create', (_event, data: { name?: string; work_mins: number; break_mins: number }) => {
    const db = getDb()

    const name = String(data?.name ?? '').trim()
    const workMins = Number(data?.work_mins)
    const breakMins = Number(data?.break_mins)

    if (!Number.isInteger(workMins) || workMins < 1 || workMins > 240) {
      throw new Error('Work duration must be an integer between 1 and 240 minutes')
    }

    if (!Number.isInteger(breakMins) || breakMins < 1 || breakMins > 120) {
      throw new Error('Break duration must be an integer between 1 and 120 minutes')
    }

    return createPreset(db, {
      name: name || `${workMins} / ${breakMins}`,
      work_mins: workMins,
      break_mins: breakMins,
      user_created: 1
    })
  })

  ipcMain.handle('pomodoro:presets:delete', (_event, id: string) => {
    const db = getDb()
    deletePreset(db, id)
    return { success: true }
  })
}
