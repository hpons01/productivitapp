import { ipcMain } from 'electron'
import { getDb } from '../db'
import {
  startSession,
  completeSession,
  abandonSession,
  markLoopCompleted,
  listSessions,
  getTodayStats,
  getLifetimeStats,
  listPresets,
  createPreset,
  deletePreset
} from '../db/queries/pomodoro.queries'
import { awardXP, damageBoss } from '../db/queries/gamification.queries'
import { getSetting, setSetting } from '../db/queries/settings.queries'
import { sendNotification } from '../notifications'
import { incrementQuestProgressByType } from '../db/queries/quests.queries'
import { logEvent } from '../db/queries/eventlog.queries'
import { emitQuestCompletions } from './quest-notifications'

export function registerPomodoroIpc(): void {
  ipcMain.handle('pomodoro:start', (_event, data) => {
    const db = getDb()
    const session = startSession(db, {
      ...data,
      endless_mode: data?.endless_mode ? 1 : 0
    })
    logEvent(db, 'pomodoro_started', 'pomodoro', session.id, { duration: session.duration_mins })
    return session
  })

  ipcMain.handle('pomodoro:complete', (_event, data) => {
    const db = getDb()
    const { id, interruptions = 0 } = data

    const session = db.prepare('SELECT duration_mins FROM pomodoro_sessions WHERE id = ?').get(id) as { duration_mins: number } | undefined
    const durationMins = Math.max(1, Number(session?.duration_mins ?? 25))

    // Check for active power-up multiplier
    let powerupBonus = 1
    const rawPowerup = getSetting(db, 'active_powerup')
    if (rawPowerup) {
      try {
        const pu = JSON.parse(rawPowerup) as { type: string; multiplier: number; expires_at: number | null; uses_left: number | null }
        const expired = pu.expires_at !== null && Date.now() > pu.expires_at
        const depleted = pu.uses_left !== null && pu.uses_left <= 0
        if (!expired && !depleted && ['focus_potion', 'double_xp', 'time_warp'].includes(pu.type)) {
          powerupBonus = pu.multiplier
          if (pu.uses_left !== null) {
            setSetting(db, 'active_powerup', JSON.stringify({ ...pu, uses_left: pu.uses_left - 1 }))
          }
        }
      } catch {}
    }

    // XP scales linearly from 40 XP per 25 minutes, then applies a 20% interruption penalty.
    const durationXP = (durationMins / 25) * 40
    const interruptedXP = interruptions > 0 ? durationXP * 0.8 : durationXP
    const baseXP = Math.round(interruptedXP * powerupBonus)
    const xpAward = awardXP(db, 'pomodoro', id, baseXP)
    const completedSession = completeSession(db, id, Date.now(), interruptions, xpAward.finalAmount)
    logEvent(db, 'pomodoro_completed', 'pomodoro', id, {
      durationMins,
      interruptions,
      baseXP,
      xpAwarded: xpAward.finalAmount
    })

    // Damage boss
    try {
      damageBoss(db, 50)
    } catch {}

    // Enrolled quest progress updates should never block session completion.
    try {
      const r = incrementQuestProgressByType(db, 'pomodoros', 1)
      emitQuestCompletions(r, 'pomodoros')
    } catch (error) {
      console.error('Failed to update pomodoros quest progress', error)
    }

    if (new Date().getHours() < 12) {
      try {
        const r = incrementQuestProgressByType(db, 'pomodoros_morning', 1)
        emitQuestCompletions(r, 'pomodoros_morning')
      } catch (error) {
        console.error('Failed to update morning pomodoro quest progress', error)
      }
    }

    if (interruptions === 0) {
      try {
        const r = incrementQuestProgressByType(db, 'deep_focus_day', 1)
        emitQuestCompletions(r, 'deep_focus_day')
      } catch (error) {
        console.error('Failed to update deep focus quest progress', error)
      }
    }

    try {
      const r = incrementQuestProgressByType(db, 'egg_hatch_prep', 1)
      emitQuestCompletions(r, 'egg_hatch_prep')
    } catch (error) {
      console.error('Failed to update egg hatch prep quest progress', error)
    }

    // Send break notification
    sendNotification('🍅 Pomodoro Complete!', 'Great work! Time for a well-deserved break.')

    return {
      ...completedSession,
      xpAwarded: xpAward.finalAmount,
      baseXP: xpAward.baseAmount,
      multiplier: xpAward.multiplier
    }
  })

  ipcMain.handle('pomodoro:abandon', (_event, id: string) => {
    const db = getDb()
    abandonSession(db, id)
    logEvent(db, 'pomodoro_abandoned', 'pomodoro', id, null)
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

  ipcMain.handle('pomodoro:loopCompleted', (_event, data: { id: string; endlessMode?: boolean }) => {
    const db = getDb()
    markLoopCompleted(db, data.id, Boolean(data.endlessMode))
    return { success: true }
  })

  ipcMain.handle('pomodoro:lifetimeStats', () => {
    const db = getDb()
    return getLifetimeStats(db)
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
