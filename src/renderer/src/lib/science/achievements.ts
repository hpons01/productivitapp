/**
 * Achievement unlock logic
 * Checks are run client-side after every major action.
 * Actual unlock is persisted via IPC to the main process.
 */

export interface AchievementCheck {
  code: string
  check: (stats: AchievementStats) => boolean
}

export interface AchievementStats {
  habitStreak: number
  totalPomodoros: number
  habitsCount: number
  tasksCompletedToday: number
  twoMinTasksTotal: number
  morningRitualConsecutive: number
  eveningRitualHour: number // hour of last evening ritual
  journalDaysStreak: number
  energyLogDaysStreak: number
  bossesDefeated: number
  pomodorosBeforeNoon: number
  journalWordCount: number
  isPerfectDay: boolean
  perfectDaysStreak: number
  currentHour: number
}

export const ACHIEVEMENT_CHECKS: AchievementCheck[] = [
  // Streak milestones
  { code: 'streak_3', check: (s) => s.habitStreak >= 3 },
  { code: 'streak_7', check: (s) => s.habitStreak >= 7 },
  { code: 'streak_14', check: (s) => s.habitStreak >= 14 },
  { code: 'streak_30', check: (s) => s.habitStreak >= 30 },
  { code: 'streak_66', check: (s) => s.habitStreak >= 66 },
  { code: 'streak_100', check: (s) => s.habitStreak >= 100 },
  { code: 'streak_365', check: (s) => s.habitStreak >= 365 },

  // Pomodoro milestones
  { code: 'pomodoro_1', check: (s) => s.totalPomodoros >= 1 },
  { code: 'pomodoro_10', check: (s) => s.totalPomodoros >= 10 },
  { code: 'pomodoro_50', check: (s) => s.totalPomodoros >= 50 },
  { code: 'pomodoro_100', check: (s) => s.totalPomodoros >= 100 },
  { code: 'pomodoro_500', check: (s) => s.totalPomodoros >= 500 },

  // Habit creation
  { code: 'first_habit', check: (s) => s.habitsCount >= 1 },
  { code: 'habit_5', check: (s) => s.habitsCount >= 5 },

  // Perfect days
  { code: 'perfect_day', check: (s) => s.isPerfectDay },
  { code: 'perfect_week', check: (s) => s.perfectDaysStreak >= 5 },

  // Journal
  { code: 'first_ritual', check: (s) => s.morningRitualConsecutive >= 1 },
  { code: 'early_bird', check: (s) => s.morningRitualConsecutive >= 3 && s.currentHour < 7 },
  { code: 'night_owl', check: (s) => s.eveningRitualHour >= 23 },
  { code: 'journaler_7', check: (s) => s.journalDaysStreak >= 7 },

  // Tasks
  { code: 'task_first', check: (s) => s.tasksCompletedToday >= 1 },
  { code: 'task_speed_runner', check: (s) => s.tasksCompletedToday >= 10 },
  { code: 'two_min_master', check: (s) => s.twoMinTasksTotal >= 20 },

  // Energy
  { code: 'energy_tracker', check: (s) => s.energyLogDaysStreak >= 7 },

  // Boss
  { code: 'boss_slayer_1', check: (s) => s.bossesDefeated >= 1 },
  { code: 'boss_slayer_5', check: (s) => s.bossesDefeated >= 5 },

  // Secret achievements (checked the same way, just displayed as ???)
  { code: 'secret_midnight', check: (s) => s.currentHour === 0 && s.totalPomodoros > 0 },
  { code: 'secret_novelist', check: (s) => s.journalWordCount >= 500 },
  { code: 'secret_consistent', check: (s) => s.habitStreak >= 30 && s.morningRitualConsecutive >= 30 }
]

/** Run all checks against current stats and return which badges to unlock */
export function checkAchievements(
  stats: AchievementStats,
  alreadyUnlocked: Set<string>
): string[] {
  return ACHIEVEMENT_CHECKS.filter(
    ({ code, check }) => !alreadyUnlocked.has(code) && check(stats)
  ).map(({ code }) => code)
}
