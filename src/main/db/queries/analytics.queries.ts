import Database from 'better-sqlite3'
import { startOfDay, endOfDay, startOfYear, eachDayOfInterval, format, subDays } from 'date-fns'
import { CHARACTER_CLASSES, CHARACTER_CLASSES_BY_ID, getEvolutionForXp } from '../../domain/classes'
import { getSelectedCharacterClassId } from './gamification.queries'

export interface ClassProgressEntry {
  classId: string
  masteryXp: number
  currentEvolutionTitle: string
  currentEvolutionIndex: number
  nextEvolutionTitle: string | null
  nextEvolutionXp: number | null
  progressPct: number
}

export interface RecentBonusGain {
  source: string
  amount: number
  baseAmount: number
  bonusAmount: number
  multiplier: number
  classIdApplied: string
  loggedAt: number
}

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
  selectedClassId: string
  selectedClassIcon: string
  selectedClassDescription: string
  classBonusSource: string | null
  classBonusMultiplier: number
  classMasteryXp: number
  classEvolutionTitle: string
  classEvolutionIndex: number
  classEvolutionNextTitle: string | null
  classEvolutionNextXp: number | null
  classEvolutionProgressPct: number
  playstyleClass: string
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

  const totalActivityXP = pomodoroXP.total + habitXP.total + journalXP.total + energyXP.total

  // Prevent a single early action from instantly maxing a stat.
  // Stats ramp up as the 30-day activity sample grows.
  const activityConfidence = Math.min(1, totalActivityXP / 300)
  const scaledStat = (sourceXp: number): number => {
    if (totalActivityXP <= 0) return 0
    const share = sourceXp / totalActivityXP
    return Math.min(100, Math.round(share * 100 * activityConfidence))
  }

  const focusPower = scaledStat(pomodoroXP.total)
  const discipline = scaledStat(habitXP.total)
  const vitality = scaledStat(energyXP.total)
  const wisdom = scaledStat(journalXP.total)

  // Determine class
  const stats = { focusPower, discipline, vitality, wisdom }
  const maxStat = Math.max(...Object.values(stats))
  let playstyleClass = 'Apprentice'
  if (level >= 5) {
    if (focusPower === maxStat) playstyleClass = 'Time Mage'
    else if (discipline === maxStat) playstyleClass = 'Iron Warrior'
    else if (vitality === maxStat) playstyleClass = 'Zen Master'
    else if (wisdom === maxStat) playstyleClass = 'Arcane Scholar'
    else playstyleClass = 'Grand Tactician'
  }

  const selectedClassId = getSelectedCharacterClassId(db)
  const selectedClass = CHARACTER_CLASSES_BY_ID[selectedClassId]
  const selectedClassMasteryResult = db.prepare(`
    SELECT COALESCE(SUM(base_amount), 0) as total
    FROM xp_log
    WHERE class_id_applied = ?
  `).get(selectedClassId) as { total: number }
  const classMasteryXp = selectedClassMasteryResult.total || 0
  const selectedEvolution = getEvolutionForXp(selectedClass, classMasteryXp)

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
    characterClass: selectedClass.name,
    selectedClassId,
    selectedClassIcon: selectedClass.icon,
    selectedClassDescription: selectedClass.description,
    classBonusSource: selectedClass.boostedSource,
    classBonusMultiplier: selectedClass.multiplier,
    classMasteryXp,
    classEvolutionTitle: selectedEvolution.currentTitle,
    classEvolutionIndex: selectedEvolution.currentIndex,
    classEvolutionNextTitle: selectedEvolution.nextTitle,
    classEvolutionNextXp: selectedEvolution.nextMinXp,
    classEvolutionProgressPct: selectedEvolution.progressPct,
    playstyleClass,
    dailyQuests,
    weeklyBoss: bossResult || null
  }
}

export function getClassProgressData(db: Database.Database): {
  classes: ClassProgressEntry[]
  recentBonusGains: RecentBonusGain[]
} {
  const masteryRows = db.prepare(`
    SELECT class_id_applied as classId, COALESCE(SUM(base_amount), 0) as masteryXp
    FROM xp_log
    WHERE class_id_applied IS NOT NULL
    GROUP BY class_id_applied
  `).all() as Array<{ classId: string; masteryXp: number }>

  const masteryMap = new Map<string, number>()
  for (const row of masteryRows) {
    masteryMap.set(row.classId, row.masteryXp || 0)
  }

  const classes: ClassProgressEntry[] = CHARACTER_CLASSES.map((classDef) => {
    const masteryXp = masteryMap.get(classDef.id) || 0
    const evo = getEvolutionForXp(classDef, masteryXp)
    return {
      classId: classDef.id,
      masteryXp,
      currentEvolutionTitle: evo.currentTitle,
      currentEvolutionIndex: evo.currentIndex,
      nextEvolutionTitle: evo.nextTitle,
      nextEvolutionXp: evo.nextMinXp,
      progressPct: evo.progressPct
    }
  })

  const recentBonusRows = db.prepare(`
    SELECT source, amount, COALESCE(base_amount, amount) as base_amount, COALESCE(multiplier, 1) as multiplier, class_id_applied, logged_at
    FROM xp_log
    WHERE COALESCE(multiplier, 1) > 1 AND class_id_applied IS NOT NULL
    ORDER BY logged_at DESC
    LIMIT 8
  `).all() as Array<{ source: string; amount: number; base_amount: number; multiplier: number; class_id_applied: string; logged_at: number }>

  const recentBonusGains: RecentBonusGain[] = recentBonusRows.map((row) => ({
    source: row.source,
    amount: row.amount,
    baseAmount: row.base_amount,
    bonusAmount: Math.max(0, row.amount - row.base_amount),
    multiplier: row.multiplier,
    classIdApplied: row.class_id_applied,
    loggedAt: row.logged_at
  }))

  return { classes, recentBonusGains }
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
