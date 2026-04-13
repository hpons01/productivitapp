import Database from 'better-sqlite3'
import { startOfDay, endOfDay, startOfYear, eachDayOfInterval, format, subDays } from 'date-fns'

export interface DashboardStats {
  totalXP: number
  level: number
  xpToNextLevel: number
  currentStreak: number
  longestStreak: number
  habitsCompletedToday: number
  totalHabits: number
  pomodorosToday: number
  totalPomodoros: number
  tasksCompletedToday: number
  averageEnergy: number
  badges: Array<{ code: string; name: string; icon: string; rarity: string; unlocked_at: number | null }>
  recentXpGains: Array<{ source: string; amount: number; logged_at: number }>
  focusPower: number
  discipline: number
  vitality: number
  wisdom: number
  characterClass: string
  dailyQuests: Array<{id: string; quest_type: string; description: string; target: number; progress: number; completed: number; xp_reward: number}>
  weeklyBoss: { name: string; max_hp: number; current_hp: number; defeated: number } | null
}

export function getDashboardStats(db: Database.Database): DashboardStats {
  const now = Date.now()
  const todayStart = startOfDay(new Date()).getTime()
  const todayEnd = endOfDay(new Date()).getTime()

  // Total XP
  const xpResult = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM xp_log').get() as { total: number }
  const totalXP = xpResult.total

  // Level calculation: sqrt curve
  const level = Math.max(1, Math.floor(Math.sqrt(totalXP / 10)))
  const xpForCurrentLevel = level * level * 10
  const xpForNextLevel = (level + 1) * (level + 1) * 10
  const xpToNextLevel = xpForNextLevel - totalXP

  // Habits
  const habitsResult = db.prepare(`
    SELECT COUNT(DISTINCT habit_id) as count
    FROM habit_completions
    WHERE completed_at >= ? AND completed_at <= ?
  `).get(todayStart, todayEnd) as { count: number }
  const habitsCompletedToday = habitsResult.count

  const totalHabitsResult = db.prepare('SELECT COUNT(*) as count FROM habits WHERE archived_at IS NULL').get() as { count: number }
  const totalHabits = totalHabitsResult.count

  // Pomodoros
  const pomodoroResult = db.prepare(`
    SELECT COUNT(*) as count FROM pomodoro_sessions
    WHERE completed = 1 AND started_at >= ? AND started_at <= ?
  `).get(todayStart, todayEnd) as { count: number }
  const pomodorosToday = pomodoroResult.count

  const totalPomodorosResult = db.prepare('SELECT COUNT(*) as count FROM pomodoro_sessions WHERE completed = 1').get() as { count: number }
  const totalPomodoros = totalPomodorosResult.count

  // Tasks
  const tasksResult = db.prepare(`
    SELECT COUNT(*) as count FROM tasks WHERE completed_at >= ? AND completed_at <= ?
  `).get(todayStart, todayEnd) as { count: number }
  const tasksCompletedToday = tasksResult.count

  // Energy
  const energyResult = db.prepare(`
    SELECT AVG(energy) as avg FROM energy_logs WHERE logged_at >= ?
  `).get(subDays(new Date(), 6).getTime()) as { avg: number | null }
  const averageEnergy = energyResult.avg ? Math.round(energyResult.avg * 10) / 10 : 0

  // Badges (first 20 unlocked + any locked)
  const badges = db.prepare(`
    SELECT code, name, icon, rarity, unlocked_at FROM badges ORDER BY unlocked_at DESC NULLS LAST LIMIT 30
  `).all() as Array<{ code: string; name: string; icon: string; rarity: string; unlocked_at: number | null }>

  // Recent XP gains
  const recentXpGains = db.prepare(`
    SELECT source, amount, logged_at FROM xp_log ORDER BY logged_at DESC LIMIT 10
  `).all() as Array<{ source: string; amount: number; logged_at: number }>

  // RPG Stats (rolling 30 days)
  const last30Start = subDays(new Date(), 29).getTime()

  const pomodoroXP = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM xp_log WHERE source = 'pomodoro' AND logged_at >= ?`).get(last30Start) as { total: number }
  const habitXP = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM xp_log WHERE source = 'habit' AND logged_at >= ?`).get(last30Start) as { total: number }
  const journalXP = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM xp_log WHERE source = 'journal' AND logged_at >= ?`).get(last30Start) as { total: number }
  const energyXP = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM xp_log WHERE source = 'energy' AND logged_at >= ?`).get(last30Start) as { total: number }

  const totalActivityXP = Math.max(1, pomodoroXP.total + habitXP.total + journalXP.total + energyXP.total)
  const focusPower = Math.min(100, Math.round((pomodoroXP.total / totalActivityXP) * 100 * 2))
  const discipline = Math.min(100, Math.round((habitXP.total / totalActivityXP) * 100 * 2))
  const vitality = Math.min(100, Math.round((energyXP.total / totalActivityXP) * 100 * 2))
  const wisdom = Math.min(100, Math.round((journalXP.total / totalActivityXP) * 100 * 2))

  // Determine class
  const stats = { focusPower, discipline, vitality, wisdom }
  const maxStat = Math.max(...Object.values(stats))
  let characterClass = 'Apprentice'
  if (level >= 5) {
    if (focusPower === maxStat) characterClass = 'Time Mage'
    else if (discipline === maxStat) characterClass = 'Iron Warrior'
    else if (vitality === maxStat) characterClass = 'Zen Master'
    else if (wisdom === maxStat) characterClass = 'Arcane Scholar'
    else characterClass = 'Grand Tactician'
  }

  // Streaks
  const habits = db.prepare('SELECT id FROM habits WHERE archived_at IS NULL').all() as Array<{ id: string }>
  let maxStreak = 0
  let currentMaxStreak = 0
  for (const habit of habits) {
    const streak = getHabitStreakFast(db, habit.id)
    currentMaxStreak = Math.max(currentMaxStreak, streak)
  }

  const longestStreakResult = db.prepare(`
    SELECT MAX(streak_val) as max FROM (
      SELECT COUNT(*) as streak_val FROM habit_completions GROUP BY habit_id
    )
  `).get() as { max: number | null }
  maxStreak = longestStreakResult.max || currentMaxStreak

  // Daily quests
  const dailyQuests = db.prepare(`
    SELECT * FROM daily_quests WHERE date >= ? AND date <= ?
  `).all(todayStart, todayEnd) as Array<{id: string; quest_type: string; description: string; target: number; progress: number; completed: number; xp_reward: number}>

  // Weekly boss
  const weekStart = startOfDay(new Date())
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const bossResult = db.prepare(`
    SELECT * FROM boss_battles WHERE week_start >= ? ORDER BY week_start DESC LIMIT 1
  `).get(weekStart.getTime()) as { name: string; max_hp: number; current_hp: number; defeated: number } | undefined

  return {
    totalXP,
    level,
    xpToNextLevel,
    currentStreak: currentMaxStreak,
    longestStreak: maxStreak,
    habitsCompletedToday,
    totalHabits,
    pomodorosToday,
    totalPomodoros,
    tasksCompletedToday,
    averageEnergy,
    badges,
    recentXpGains,
    focusPower,
    discipline,
    vitality,
    wisdom,
    characterClass,
    dailyQuests,
    weeklyBoss: bossResult || null
  }
}

function getHabitStreakFast(db: Database.Database, habitId: string): number {
  const completions = db.prepare(`
    SELECT completed_at FROM habit_completions WHERE habit_id = ? ORDER BY completed_at DESC LIMIT 400
  `).all(habitId) as Array<{ completed_at: number }>

  if (!completions.length) return 0

  let streak = 0
  let checkDate = startOfDay(new Date())

  const todayEnd = endOfDay(new Date()).getTime()
  const completedToday = completions.some(
    (c) => c.completed_at >= checkDate.getTime() && c.completed_at <= todayEnd
  )
  if (!completedToday) checkDate = subDays(checkDate, 1)

  for (let i = 0; i < 365; i++) {
    const dayStart = startOfDay(checkDate).getTime()
    const dayEnd = endOfDay(checkDate).getTime()
    if (completions.some((c) => c.completed_at >= dayStart && c.completed_at <= dayEnd)) {
      streak++
      checkDate = subDays(checkDate, 1)
    } else {
      break
    }
  }

  return streak
}

export function getHeatmapData(
  db: Database.Database,
  year: number
): Array<{ date: string; count: number }> {
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year, 11, 31)
  const days = eachDayOfInterval({ start: yearStart, end: yearEnd })

  return days.map((day) => {
    const from = startOfDay(day).getTime()
    const to = endOfDay(day).getTime()
    const result = db.prepare(`
      SELECT COUNT(DISTINCT habit_id) as count FROM habit_completions
      WHERE completed_at >= ? AND completed_at <= ?
    `).get(from, to) as { count: number }
    return { date: format(day, 'yyyy-MM-dd'), count: result.count }
  })
}
