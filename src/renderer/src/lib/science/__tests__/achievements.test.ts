import { describe, it, expect } from 'vitest'
import { checkAchievements, ACHIEVEMENT_CHECKS, type AchievementStats } from '../achievements'

function baseStats(overrides: Partial<AchievementStats> = {}): AchievementStats {
  return {
    habitStreak: 0,
    totalPomodoros: 0,
    endlessLoopsCompleted: 0,
    habitsCount: 0,
    tasksCompletedToday: 0,
    twoMinTasksTotal: 0,
    morningRitualConsecutive: 0,
    eveningRitualHour: 0,
    journalDaysStreak: 0,
    energyLogDaysStreak: 0,
    bossesDefeated: 0,
    pomodorosBeforeNoon: 0,
    journalWordCount: 0,
    isPerfectDay: false,
    perfectDaysStreak: 0,
    currentHour: 12,
    ...overrides
  }
}

describe('checkAchievements', () => {
  it('returns empty array when no conditions are met', () => {
    const result = checkAchievements(baseStats(), new Set())
    expect(result).toEqual([])
  })

  it('unlocks first_habit when habitsCount >= 1', () => {
    const result = checkAchievements(baseStats({ habitsCount: 1 }), new Set())
    expect(result).toContain('first_habit')
  })

  it('unlocks pomodoro_1 when totalPomodoros >= 1', () => {
    const result = checkAchievements(baseStats({ totalPomodoros: 1 }), new Set())
    expect(result).toContain('pomodoro_1')
  })

  it('unlocks endless_5 when endlessLoopsCompleted >= 5', () => {
    const result = checkAchievements(baseStats({ endlessLoopsCompleted: 5 }), new Set())
    expect(result).toContain('endless_5')
  })

  it('unlocks endless_10 when endlessLoopsCompleted >= 10', () => {
    const result = checkAchievements(baseStats({ endlessLoopsCompleted: 10 }), new Set())
    expect(result).toContain('endless_10')
    expect(result).toContain('endless_5')
  })

  it('unlocks streak_7 when habitStreak >= 7', () => {
    const result = checkAchievements(baseStats({ habitStreak: 7 }), new Set())
    expect(result).toContain('streak_7')
  })

  it('unlocks multiple streak achievements at once', () => {
    const result = checkAchievements(baseStats({ habitStreak: 14 }), new Set())
    expect(result).toContain('streak_3')
    expect(result).toContain('streak_7')
    expect(result).toContain('streak_14')
  })

  it('does not unlock already-unlocked achievements', () => {
    const alreadyUnlocked = new Set(['streak_7', 'first_habit'])
    const result = checkAchievements(
      baseStats({ habitStreak: 7, habitsCount: 1 }),
      alreadyUnlocked
    )
    expect(result).not.toContain('streak_7')
    expect(result).not.toContain('first_habit')
  })

  it('unlocks perfect_day when isPerfectDay is true', () => {
    const result = checkAchievements(baseStats({ isPerfectDay: true }), new Set())
    expect(result).toContain('perfect_day')
  })

  it('unlocks task_first when tasksCompletedToday >= 1', () => {
    const result = checkAchievements(baseStats({ tasksCompletedToday: 1 }), new Set())
    expect(result).toContain('task_first')
  })

  it('unlocks task_speed_runner when tasksCompletedToday >= 10', () => {
    const result = checkAchievements(baseStats({ tasksCompletedToday: 10 }), new Set())
    expect(result).toContain('task_speed_runner')
  })

  it('unlocks boss_slayer_1 when bossesDefeated >= 1', () => {
    const result = checkAchievements(baseStats({ bossesDefeated: 1 }), new Set())
    expect(result).toContain('boss_slayer_1')
  })

  it('unlocks secret_midnight at hour 0 with pomodoros', () => {
    const result = checkAchievements(
      baseStats({ currentHour: 0, totalPomodoros: 1 }),
      new Set()
    )
    expect(result).toContain('secret_midnight')
  })

  it('does NOT unlock secret_midnight during daytime', () => {
    const result = checkAchievements(
      baseStats({ currentHour: 12, totalPomodoros: 5 }),
      new Set()
    )
    expect(result).not.toContain('secret_midnight')
  })

  it('unlocks secret_novelist with journalWordCount >= 500', () => {
    const result = checkAchievements(baseStats({ journalWordCount: 500 }), new Set())
    expect(result).toContain('secret_novelist')
  })

  it('does not unlock secret_novelist below 500 words', () => {
    const result = checkAchievements(baseStats({ journalWordCount: 499 }), new Set())
    expect(result).not.toContain('secret_novelist')
  })

  it('unlocks early_bird with 3+ morning rituals before 7am', () => {
    const result = checkAchievements(
      baseStats({ morningRitualConsecutive: 3, currentHour: 6 }),
      new Set()
    )
    expect(result).toContain('early_bird')
  })

  it('does NOT unlock early_bird if hour >= 7', () => {
    const result = checkAchievements(
      baseStats({ morningRitualConsecutive: 3, currentHour: 7 }),
      new Set()
    )
    expect(result).not.toContain('early_bird')
  })
})

describe('ACHIEVEMENT_CHECKS', () => {
  it('has unique codes', () => {
    const codes = ACHIEVEMENT_CHECKS.map((a) => a.code)
    const unique = new Set(codes)
    expect(unique.size).toBe(codes.length)
  })

  it('has at least 20 achievement definitions', () => {
    expect(ACHIEVEMENT_CHECKS.length).toBeGreaterThanOrEqual(20)
  })

  it('every check function is callable and returns a boolean', () => {
    const stats = baseStats()
    for (const { code, check } of ACHIEVEMENT_CHECKS) {
      const result = check(stats)
      expect(typeof result).toBe('boolean')
    }
  })
})
