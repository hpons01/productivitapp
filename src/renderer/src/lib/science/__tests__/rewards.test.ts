import { describe, it, expect } from 'vitest'
import {
  shouldReward,
  rollLootTier,
  rollLoot,
  isStreakMilestone,
  TIER_COLORS,
  STREAK_MILESTONES,
  type LootTier
} from '../rewards'

const VALID_TIERS: LootTier[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']

describe('shouldReward', () => {
  it('always rewards on first_ever context', () => {
    for (let i = 0; i < 20; i++) {
      expect(shouldReward('first_ever')).toBe(true)
    }
  })

  it('always rewards on streak_milestone context', () => {
    for (let i = 0; i < 20; i++) {
      expect(shouldReward('streak_milestone')).toBe(true)
    }
  })

  it('always rewards on perfect_day context', () => {
    for (let i = 0; i < 20; i++) {
      expect(shouldReward('perfect_day')).toBe(true)
    }
  })

  it('returns a boolean for probabilistic contexts', () => {
    const result = shouldReward('pomodoro')
    expect(typeof result).toBe('boolean')
  })

  it('returns a boolean for unknown contexts (uses default probability)', () => {
    const result = shouldReward('unknown_context')
    expect(typeof result).toBe('boolean')
  })
})

describe('rollLootTier', () => {
  it('returns a valid tier', () => {
    for (let i = 0; i < 50; i++) {
      expect(VALID_TIERS).toContain(rollLootTier())
    }
  })

  it('has common as the most frequent tier over many rolls', () => {
    const counts: Record<string, number> = {}
    const ROLLS = 1000
    for (let i = 0; i < ROLLS; i++) {
      const tier = rollLootTier()
      counts[tier] = (counts[tier] || 0) + 1
    }
    // Common should be most frequent (55% weight)
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    expect(sorted[0][0]).toBe('common')
  })

  it('legendary is rarer than common over many rolls', () => {
    const counts: Record<string, number> = { common: 0, legendary: 0 }
    for (let i = 0; i < 500; i++) {
      const tier = rollLootTier()
      if (tier === 'common' || tier === 'legendary') counts[tier]++
    }
    expect(counts.common).toBeGreaterThan(counts.legendary)
  })
})

describe('rollLoot', () => {
  it('returns an item with required fields', () => {
    const item = rollLoot()
    expect(item).toHaveProperty('tier')
    expect(item).toHaveProperty('type')
    expect(item).toHaveProperty('name')
    expect(item).toHaveProperty('description')
  })

  it('returns an item from the requested tier', () => {
    for (const tier of VALID_TIERS) {
      const item = rollLoot(tier)
      expect(item.tier).toBe(tier)
    }
  })

  it('returns a random tier when none specified', () => {
    const item = rollLoot()
    expect(VALID_TIERS).toContain(item.tier)
  })
})

describe('isStreakMilestone', () => {
  it('returns true for all defined milestone values', () => {
    for (const milestone of STREAK_MILESTONES) {
      expect(isStreakMilestone(milestone)).toBe(true)
    }
  })

  it('returns false for non-milestone values', () => {
    const nonMilestones = [2, 4, 5, 6, 8, 9, 10, 11, 15, 25, 50]
    for (const n of nonMilestones) {
      if (!STREAK_MILESTONES.includes(n)) {
        expect(isStreakMilestone(n)).toBe(false)
      }
    }
  })

  it('returns false for 7-day streak if 7 is a milestone (sanity check)', () => {
    expect(isStreakMilestone(7)).toBe(true)
  })

  it('returns false for 8', () => {
    expect(isStreakMilestone(8)).toBe(false)
  })
})

describe('TIER_COLORS', () => {
  it('defines colors for all valid tiers', () => {
    for (const tier of VALID_TIERS) {
      const colors = TIER_COLORS[tier]
      expect(colors).toBeDefined()
      expect(colors).toHaveProperty('text')
      expect(colors).toHaveProperty('border')
      expect(colors).toHaveProperty('bg')
      expect(colors).toHaveProperty('glow')
    }
  })

  it('legendary has amber color class', () => {
    expect(TIER_COLORS.legendary.text).toContain('amber')
  })

  it('rare has blue color class', () => {
    expect(TIER_COLORS.rare.text).toContain('blue')
  })
})
