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
import { addXP, damageBoss, updateStreakRecoveryQuest } from '../db/queries/gamification.queries'

export function registerHabitsIpc(): void {
  ipcMain.handle('habits:list', () => {
    const db = getDb()
    return listHabits(db)
  })

  ipcMain.handle('habits:create', (_event, data) => {
    const db = getDb()
    const habit = createHabit(db, data)
    addXP(db, 'habit_created', habit.id, 5)
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
    const completion = completeHabit(db, data)

    // Get streak for XP multiplier
    const streak = getHabitStreak(db, data.habit_id)
    const streakBonus = Math.min(50, streak * 2)
    const xpAmount = 15 + streakBonus
    addXP(db, 'habit', data.habit_id, xpAmount)

    // Damage the weekly boss
    damageBoss(db, 25)

    // Update streak recovery quest progress if one exists today
    const completedToday = getTodayCompletedCount(db)
    updateStreakRecoveryQuest(db, completedToday)

    return { ...completion, xpAwarded: xpAmount, streak }
  })

  ipcMain.handle('habits:uncomplete', (_event, data) => {
    const db = getDb()
    uncompleteHabit(db, data.habitId, data.date)
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
