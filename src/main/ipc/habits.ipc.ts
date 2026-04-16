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
import { setQuestProgressByType, incrementCatalogProgressByType, decrementCatalogProgressByType } from '../db/queries/quests.queries'
import { logEvent } from '../db/queries/eventlog.queries'

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

    // Get streak for XP multiplier
    const streak = getHabitStreak(db, data.habit_id)
    const streakBonus = Math.min(50, streak * 2)
    const baseXP = 15 + streakBonus
    const xpAward = awardXP(db, 'habit', data.habit_id, baseXP)
    logEvent(db, 'habit_completed', 'habit', data.habit_id, {
      streak,
      baseXP,
      xpAwarded: xpAward.finalAmount
    })

    // Damage the weekly boss
    damageBoss(db, 25)

    // Update streak recovery quest progress if one exists today
    const completedToday = getTodayCompletedCount(db)
    updateStreakRecoveryQuest(db, completedToday)

    // Enrolled quest progress updates (new lifecycle engine).
    setQuestProgressByType(db, 'streak_recovery', completedToday)
    setQuestProgressByType(db, 'habits_all', completedToday >= required ? 1 : 0)

    // Catalog habits_all should count once per day when crossing from incomplete -> complete.
    if (completedBefore < required && completedToday >= required) {
      incrementCatalogProgressByType(db, 'habits_all', 1)
    }

    return {
      ...completion,
      xpAwarded: xpAward.finalAmount,
      baseXP: xpAward.baseAmount,
      multiplier: xpAward.multiplier,
      streak
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
    const brokenStreak = hasBrokenStreakToday(db)
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
