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
  getTodayCompletedCount
} from '../db/queries/habits.queries'
import { awardXP, damageBoss, updateStreakRecoveryQuest } from '../db/queries/gamification.queries'
import { setQuestProgressByType, incrementCatalogProgressByType, decrementCatalogProgressByType } from '../db/queries/quests.queries'

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
}
