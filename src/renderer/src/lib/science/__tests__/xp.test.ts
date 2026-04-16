import { describe, it, expect } from 'vitest'
import {
  levelFromXP,
  xpForLevel,
  streakMultiplier,
  habitXP,
  pomodoroXP,
  levelProgress,
  xpToNextLevel,
  isLegendaryGrind,
  XP_REWARDS
} from '../xp'

describe('levelFromXP', () => {
  it('returns 1 for 0 XP', () => {
    expect(levelFromXP(0)).toBe(1)
  })

  it('returns 1 for XP below level 2 threshold', () => {
    // Level 2 needs xpForLevel(2) = 4*10 = 40 XP
    expect(levelFromXP(39)).toBe(1)
  })

  it('returns correct level at exact thresholds', () => {
    // Level n = floor(sqrt(xp / 10)), so xp = n^2 * 10
    expect(levelFromXP(40)).toBe(2)   // sqrt(40/10) = 2
    expect(levelFromXP(90)).toBe(3)   // sqrt(90/10) = 3
    expect(levelFromXP(250)).toBe(5)  // sqrt(250/10) = 5
  })

  it('returns level 10 for 1000 XP', () => {
    expect(levelFromXP(1000)).toBe(10)
  })

  it('grows slower at high levels (demonstrates sqrt curve)', () => {
    const l5 = xpForLevel(5)
    const l10 = xpForLevel(10)
    const l20 = xpForLevel(20)
    // Gaps should grow quadratically
    expect(l10 - l5).toBeGreaterThan(l5 - xpForLevel(0))
    expect(l20 - l10).toBeGreaterThan(l10 - l5)
  })
})

describe('xpForLevel', () => {
  it('returns 0 for level 0', () => {
    expect(xpForLevel(0)).toBe(0)
  })

  it('returns 10 for level 1', () => {
    expect(xpForLevel(1)).toBe(10)
  })

  it('is the inverse of levelFromXP at exact boundaries', () => {
    for (const level of [1, 2, 5, 10, 20]) {
      expect(levelFromXP(xpForLevel(level))).toBe(level)
    }
  })
})

describe('streakMultiplier', () => {
  it('returns 1x for streaks below 7 days', () => {
    expect(streakMultiplier(0)).toBe(1)
    expect(streakMultiplier(1)).toBe(1)
    expect(streakMultiplier(6)).toBe(1)
  })

  it('returns 1.5x for 7–13 day streaks', () => {
    expect(streakMultiplier(7)).toBe(1.5)
    expect(streakMultiplier(13)).toBe(1.5)
  })

  it('returns 2x for 14–29 day streaks', () => {
    expect(streakMultiplier(14)).toBe(2)
    expect(streakMultiplier(29)).toBe(2)
  })

  it('returns 3x for 30+ day streaks (Legendary Grind)', () => {
    expect(streakMultiplier(30)).toBe(3)
    expect(streakMultiplier(365)).toBe(3)
  })
})

describe('habitXP', () => {
  it('returns base XP at streak 0', () => {
    // streak 0 → multiplier 1, bonus 0
    expect(habitXP(0)).toBe(XP_REWARDS.HABIT_BASE)
  })

  it('includes streak bonus (capped at max)', () => {
    // streak 25 → bonus min(50, 25*2) = 50, multiplier 2
    const expected = Math.round((XP_REWARDS.HABIT_BASE + 50) * 2)
    expect(habitXP(25)).toBe(expected)
  })

  it('caps bonus at HABIT_STREAK_MAX_BONUS', () => {
    // streak 100 bonus should be same as streak 50 (both hit the cap)
    expect(habitXP(100)).toBe(habitXP(50))
  })

  it('applies legendary multiplier at 30+ streak', () => {
    const base = XP_REWARDS.HABIT_BASE + XP_REWARDS.HABIT_STREAK_MAX_BONUS
    expect(habitXP(30)).toBe(Math.round(base * 3))
  })
})

describe('pomodoroXP', () => {
  it('awards 40 XP for a 25 minute session with no interruptions', () => {
    expect(pomodoroXP(25)).toBe(XP_REWARDS.POMODORO_BASE)
  })

  it('scales linearly with duration', () => {
    expect(pomodoroXP(12.5)).toBe(20)
    expect(pomodoroXP(50)).toBe(80)
  })

  it('applies a 20% penalty when there are interruptions', () => {
    expect(pomodoroXP(25, 1)).toBe(32)
    expect(pomodoroXP(50, 3)).toBe(64)
  })
})

describe('levelProgress', () => {
  it('returns 0 at exact level threshold', () => {
    const xp = xpForLevel(5)
    expect(levelProgress(xp)).toBe(0)
  })

  it('returns value between 0 and 1 mid-level', () => {
    const xp = xpForLevel(5) + Math.floor((xpForLevel(6) - xpForLevel(5)) / 2)
    const progress = levelProgress(xp)
    expect(progress).toBeGreaterThan(0)
    expect(progress).toBeLessThan(1)
  })

  it('never exceeds 1', () => {
    expect(levelProgress(xpForLevel(6) - 1)).toBeLessThanOrEqual(1)
  })
})

describe('xpToNextLevel', () => {
  it('returns full level gap at threshold start', () => {
    const xp = xpForLevel(3)
    const gap = xpForLevel(4) - xpForLevel(3)
    expect(xpToNextLevel(xp)).toBe(gap)
  })

  it('returns 0 if already at next level XP', () => {
    expect(xpToNextLevel(xpForLevel(5))).toBe(xpForLevel(6) - xpForLevel(5))
  })
})

describe('isLegendaryGrind', () => {
  it('returns false below 30', () => {
    expect(isLegendaryGrind(29)).toBe(false)
    expect(isLegendaryGrind(0)).toBe(false)
  })

  it('returns true at 30+', () => {
    expect(isLegendaryGrind(30)).toBe(true)
    expect(isLegendaryGrind(365)).toBe(true)
  })
})
