/**
 * XP Economy
 * Implements the Progress Principle (Amabile & Kramer) and variable-ratio schedules
 */

export const XP_REWARDS = {
  HABIT_BASE: 15,
  HABIT_STREAK_PER_DAY: 2, // Up to 50 bonus
  HABIT_STREAK_MAX_BONUS: 50,
  POMODORO_BASE: 40,
  POMODORO_BASE_DURATION_MINS: 25,
  POMODORO_INTERRUPTION_PENALTY: 0.2,
  MORNING_RITUAL: 25,
  EVENING_REFLECTION: 20,
  TASK_NORMAL: 10,
  TASK_TWO_MIN: 5,
  ENERGY_LOG: 5,
  BADGE_MULTIPLIERS: { common: 1, uncommon: 2, rare: 4, epic: 8, legendary: 20 } as const
}

/** Level from total XP — sqrt curve for early dopamine, slower at high levels */
export function levelFromXP(totalXP: number): number {
  return Math.max(1, Math.floor(Math.sqrt(totalXP / 10)))
}

/** XP required to reach a given level */
export function xpForLevel(level: number): number {
  return level * level * 10
}

/** XP multiplier based on streak length */
export function streakMultiplier(streak: number): number {
  if (streak >= 30) return 3
  if (streak >= 14) return 2
  if (streak >= 7) return 1.5
  return 1
}

/** Calculate habit completion XP */
export function habitXP(streak: number): number {
  const bonus = Math.min(XP_REWARDS.HABIT_STREAK_MAX_BONUS, streak * XP_REWARDS.HABIT_STREAK_PER_DAY)
  return Math.round((XP_REWARDS.HABIT_BASE + bonus) * streakMultiplier(streak))
}

/** Calculate pomodoro XP */
export function pomodoroXP(durationMins: number, interruptions = 0): number {
  const baseXP = (Math.max(1, durationMins) / XP_REWARDS.POMODORO_BASE_DURATION_MINS) * XP_REWARDS.POMODORO_BASE
  const penalty = interruptions > 0 ? 1 - XP_REWARDS.POMODORO_INTERRUPTION_PENALTY : 1
  return Math.round(baseXP * penalty)
}

/** Progress to next level (0–1) */
export function levelProgress(totalXP: number): number {
  const level = levelFromXP(totalXP)
  const current = xpForLevel(level)
  const next = xpForLevel(level + 1)
  return Math.min(1, (totalXP - current) / (next - current))
}

/** XP remaining to next level */
export function xpToNextLevel(totalXP: number): number {
  const level = levelFromXP(totalXP)
  return Math.max(0, xpForLevel(level + 1) - totalXP)
}

/** Legendary Grind mode (streak >= 30) */
export function isLegendaryGrind(streak: number): boolean {
  return streak >= 30
}
