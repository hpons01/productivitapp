import { ipcMain } from 'electron'
import { getDb } from '../db'
import {
  listHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  completeHabit,
  uncompleteHabit,
  getHabitStreak,
  getCompletions,
  getTodayCompletedCount,
  createHabitLapseReflection,
  getHabitLapseReflectionsForDate,
  graduateTinyHabit,
  createHabitMicroCheckin
} from '../db/queries/habits.queries'
import { awardXP, damageBoss, updateStreakRecoveryQuest, hasBrokenStreakToday } from '../db/queries/gamification.queries'
import { getSetting, setSetting } from '../db/queries/settings.queries'
import { setQuestProgressByType, incrementCatalogProgressByType, decrementCatalogProgressByType } from '../db/queries/quests.queries'
import { awardFocus } from '../db/queries/shop.queries'
import { logEvent } from '../db/queries/eventlog.queries'
import { emitQuestCompletions } from './quest-notifications'

function getTotalDailyHabits(db: ReturnType<typeof getDb>): number {
  return (
    db
      .prepare("SELECT COUNT(*) as n FROM habits WHERE archived_at IS NULL AND frequency = 'daily'")
      .get() as { n: number }
  ).n
}

export function registerHabitsIpc(): void {
  ipcMain.handle('habits:list', () => {
    const db = getDb()
    return listHabits(db)
  })

  ipcMain.handle('habits:create', (_event, data) => {
    const db = getDb()
    const habit = createHabit(db, data)
    awardXP(db, 'habit_created', habit.id, 5)
    logEvent(db, 'habit_created', 'habit', habit.id, { category: habit.category, tinyMode: habit.tiny_mode })
    return habit
  })

  ipcMain.handle('habits:update', (_event, data) => {
    const db = getDb()
    const { id, ...rest } = data
    return updateHabit(db, id, rest)
  })

  ipcMain.handle('habits:delete', (_event, id: string) => {
    const db = getDb()
    deleteHabit(db, id)
    return { success: true }
  })

  ipcMain.handle('habits:complete', (_event, data) => {
    const db = getDb()
    const completedBefore = getTodayCompletedCount(db)
    const totalHabits = getTotalDailyHabits(db)
    const required = Math.max(1, totalHabits)

    const completion = completeHabit(db, data)
    const streak = getHabitStreak(db, data.habit_id)

    // Use a per-habit-per-day key so uncomplete→recomplete cycles don't re-award.
    // completion.id changes on every recomplete (soft-delete + new insert), so it
    // cannot be the idempotency key.
    const d = new Date(data.completed_at ?? Date.now())
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const xpSourceId = `${data.habit_id}_${dateKey}`

    const alreadyRewarded = (db.prepare(
      "SELECT COUNT(*) as n FROM xp_log WHERE source = 'habit' AND source_id = ?"
    ).get(xpSourceId) as { n: number }).n > 0

    let xpAward = { finalAmount: 0, baseAmount: 0, multiplier: 1 }
    let focusAwarded = 0

    if (!alreadyRewarded) {
      const streakBonus = Math.min(50, streak * 2)
      const baseXP = 15 + streakBonus
      const result = awardXP(db, 'habit', xpSourceId, baseXP)
      xpAward = { finalAmount: result.finalAmount, baseAmount: result.baseAmount, multiplier: result.multiplier }

      const focusAmount = streak >= 30 ? 5 : streak >= 14 ? 3 : streak >= 7 ? 2 : 1
      const focusResult = awardFocus(db, 'habit_completion', `habit_focus_${xpSourceId}`, focusAmount)
      focusAwarded = focusResult.awarded

      damageBoss(db, 25)

      logEvent(db, 'habit_completed', 'habit', data.habit_id, {
        streak,
        baseXP,
        xpAwarded: result.finalAmount,
        focusAwarded
      })
    }

    // Quest progress is idempotent (sets to current count) — always run.
    const completedToday = getTodayCompletedCount(db)
    updateStreakRecoveryQuest(db, completedToday)
    emitQuestCompletions(setQuestProgressByType(db, 'streak_recovery', completedToday), 'streak_recovery')
    emitQuestCompletions(setQuestProgressByType(db, 'habits_all', completedToday >= required ? 1 : 0), 'habits_all')

    if (completedBefore < required && completedToday >= required) {
      incrementCatalogProgressByType(db, 'habits_all', 1)
    }

    return {
      ...completion,
      xpAwarded: xpAward.finalAmount,
      baseXP: xpAward.baseAmount,
      multiplier: xpAward.multiplier,
      streak,
      focusAwarded
    }
  })

  ipcMain.handle('habits:uncomplete', (_event, data) => {
    const db = getDb()
    const completedBefore = getTodayCompletedCount(db)
    const totalHabits = getTotalDailyHabits(db)
    const required = Math.max(1, totalHabits)

    uncompleteHabit(db, data.habitId, data.date)

    const completedToday = getTodayCompletedCount(db)
    updateStreakRecoveryQuest(db, completedToday)
    setQuestProgressByType(db, 'streak_recovery', completedToday)
    setQuestProgressByType(db, 'habits_all', completedToday >= required ? 1 : 0)

    // Revert catalog habits_all progress when crossing from complete -> incomplete.
    if (completedBefore >= required && completedToday < required) {
      decrementCatalogProgressByType(db, 'habits_all', 1)
    }

    return { success: true }
  })

  ipcMain.handle('habits:getStreak', (_event, id: string) => {
    const db = getDb()
    return getHabitStreak(db, id)
  })

  ipcMain.handle('habits:getCompletions', (_event, habitId: string, from: number, to: number) => {
    const db = getDb()
    return getCompletions(db, habitId, from, to)
  })

  ipcMain.handle('habits:lapsePromptStatus', () => {
    const db = getDb()
    const rawBroken = hasBrokenStreakToday(db)

    // Streak Shield: absorb one streak break
    let brokenStreak = rawBroken
    if (rawBroken) {
      const rawPowerup = getSetting(db, 'active_powerup')
      if (rawPowerup) {
        try {
          const pu = JSON.parse(rawPowerup) as { type: string; uses_left: number | null }
          if (pu.type === 'streak_shield' && pu.uses_left !== null && pu.uses_left > 0) {
            setSetting(db, 'active_powerup', JSON.stringify({ ...pu, uses_left: 0 }))
            brokenStreak = false
          }
        } catch {}
      }
    }

    const reflections = getHabitLapseReflectionsForDate(db, Date.now())
    return {
      brokenStreak,
      alreadyReflected: reflections.length > 0,
      latestReflection: reflections[0] ?? null
    }
  })

  ipcMain.handle('habits:lapseReflect', (_event, data: { id: string; reasonCode: string; note?: string | null }) => {
    const db = getDb()
    const promptStatus = {
      brokenStreak: hasBrokenStreakToday(db),
      reflections: getHabitLapseReflectionsForDate(db, Date.now())
    }

    if (!promptStatus.brokenStreak) {
      return { success: false, message: 'No broken streak detected today.' }
    }

    if (promptStatus.reflections.length > 0) {
      return { success: true, reflection: promptStatus.reflections[0], alreadyExists: true }
    }

    const suggestionByReason: Record<string, string> = {
      environment: 'Reduce friction: prep your habit tools the night before.',
      motivation: 'Shrink today\'s target to a two-minute restart version.',
      skill: 'Make the behavior simpler and add a clear cue reminder.',
      memory: 'Attach a visible trigger and set a backup reminder alarm.'
    }

    const reasonCode = data.reasonCode in suggestionByReason ? data.reasonCode : 'environment'
    const reflection = createHabitLapseReflection(db, {
      id: data.id,
      lapse_date: Date.now(),
      reason_code: reasonCode,
      note: data.note?.trim() ? data.note.trim() : null,
      suggested_action: suggestionByReason[reasonCode],
      created_at: Date.now()
    })

    logEvent(db, 'habit_lapse_reflection_saved', 'habit', null, {
      reasonCode,
      hasNote: Boolean(reflection.note)
    })

    return { success: true, reflection, alreadyExists: false }
  })

  ipcMain.handle('habits:graduateTiny', (_event, habitId: string) => {
    const db = getDb()
    if (!habitId) throw new Error('habitId is required')
    const updated = graduateTinyHabit(db, habitId)
    logEvent(db, 'tiny_habit_graduated', 'habit', habitId, null)
    return updated
  })

  ipcMain.handle('habits:microCheckin', (_event, data: {
    id: string
    habitId: string
    completedAt: number
    difficulty: number
    focusEffort: number
  }) => {
    const db = getDb()
    if (!data.habitId) throw new Error('habitId is required')

    const difficulty = Math.max(1, Math.min(5, Math.floor(data.difficulty)))
    const focusEffort = Math.max(1, Math.min(5, Math.floor(data.focusEffort)))

    const row = createHabitMicroCheckin(db, {
      id: data.id,
      habit_id: data.habitId,
      completed_at: data.completedAt,
      difficulty,
      focus_effort: focusEffort,
      created_at: Date.now()
    })

    logEvent(db, 'habit_micro_checkin_saved', 'habit', data.habitId, {
      difficulty,
      focusEffort
    })

    return row
  })
}
