/**
 * Variable Reward Engine
 * Implements variable-ratio reinforcement (Skinner) and Nir Eyal's Hook Model.
 * Rewards are NOT given every time — probability depends on context to prevent habituation.
 */

export type LootTier = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export interface LootItem {
  tier: LootTier
  type: 'xp_boost' | 'theme' | 'title' | 'power_up' | 'cosmetic'
  name: string
  description: string
  value?: number
}

/** Probability of reward trigger for a given context */
const REWARD_PROBABILITY: Record<string, number> = {
  first_ever: 1.0,        // Always on first completion
  streak_milestone: 1.0,  // Always on milestone (7, 14, 21, 30, 66, 100, 365)
  perfect_day: 1.0,       // Always on perfect day
  boss_defeated: 1.0,     // Always on boss defeat
  pomodoro: 0.15,          // 15% on pomodoro complete
  habit: 0.10,             // 10% on habit check
  task: 0.05,              // 5% on task complete
  default: 0.08
}

export const STREAK_MILESTONES = [3, 7, 14, 21, 30, 60, 66, 100, 365]

/** Should a surprise reward trigger? */
export function shouldReward(context: keyof typeof REWARD_PROBABILITY | string, evolutionTier = 0): boolean {
  const baseProb = REWARD_PROBABILITY[context] ?? REWARD_PROBABILITY.default
  if (baseProb >= 1) {
    return true
  }

  const tierBonus = Math.max(0, evolutionTier) * 0.01
  const prob = Math.min(0.35, baseProb + tierBonus)
  return Math.random() < prob
}

/** Loot tier probabilities */
const TIER_WEIGHTS: Record<LootTier, number> = {
  common: 55,
  uncommon: 25,
  rare: 12,
  epic: 7,
  legendary: 1
}

export function rollLootTier(evolutionTier = 0): LootTier {
  const tier = Math.max(0, Math.min(3, evolutionTier))
  const weights: Record<LootTier, number> = { ...TIER_WEIGHTS }
  if (tier > 0) {
    const shift = tier * 2
    weights.common = Math.max(30, weights.common - shift)
    weights.uncommon = Math.max(15, weights.uncommon - tier)
    weights.rare += tier
    weights.epic += tier
    weights.legendary += Math.min(2, tier)
  }

  const roll = Math.random() * 100
  let cumulative = 0
  for (const [lootTier, weight] of Object.entries(weights) as [LootTier, number][]) {
    cumulative += weight
    if (roll < cumulative) return lootTier
  }
  return 'common'
}

const LOOT_POOLS: Record<LootTier, LootItem[]> = {
  common: [
    { tier: 'common', type: 'xp_boost', name: 'Minor XP Scroll', description: '+50 bonus XP', value: 50 },
    { tier: 'common', type: 'title', name: 'The Diligent', description: 'A modest title for your efforts' },
    { tier: 'common', type: 'cosmetic', name: 'Bronze Accent', description: 'Unlock bronze UI accents' }
  ],
  uncommon: [
    { tier: 'uncommon', type: 'xp_boost', name: 'XP Tome', description: '+150 bonus XP', value: 150 },
    { tier: 'uncommon', type: 'power_up', name: 'Focus Potion', description: '+25% XP on your next 3 Pomodoros' },
    { tier: 'uncommon', type: 'cosmetic', name: 'Silver Accent', description: 'Unlock silver UI accents' },
    { tier: 'uncommon', type: 'title', name: 'The Persistent', description: 'A green title for the consistent' }
  ],
  rare: [
    { tier: 'rare', type: 'xp_boost', name: 'Ancient XP Crystal', description: '+500 bonus XP', value: 500 },
    { tier: 'rare', type: 'power_up', name: 'Streak Shield', description: 'Protect a streak from breaking once' },
    { tier: 'rare', type: 'theme', name: 'Ember Theme', description: 'Unlock the warm Emberforge palette' },
    { tier: 'rare', type: 'theme', name: 'Ocean Theme', description: 'Unlock the Ocean dark theme' },
    { tier: 'rare', type: 'title', name: 'The Relentless', description: 'A blue title for the focused' }
  ],
  epic: [
    { tier: 'epic', type: 'xp_boost', name: 'Epic XP Orb', description: '+1500 bonus XP', value: 1500 },
    { tier: 'epic', type: 'power_up', name: 'Double XP Elixir', description: '2× XP for the next 30 minutes' },
    { tier: 'epic', type: 'theme', name: 'Void Theme', description: 'Unlock the ultra-dark Void theme' },
    { tier: 'epic', type: 'title', name: 'Champion of Focus', description: 'A purple title for the elite' }
  ],
  legendary: [
    { tier: 'legendary', type: 'xp_boost', name: 'Legendary XP Tome', description: '+5000 bonus XP', value: 5000 },
    { tier: 'legendary', type: 'cosmetic', name: 'Gold Accent', description: 'Unlock royal gold UI accents' },
    { tier: 'legendary', type: 'theme', name: 'Golden Theme', description: 'Unlock the legendary Gold UI theme' },
    { tier: 'legendary', type: 'title', name: 'Productivity God', description: 'The rarest title in the game' },
    { tier: 'legendary', type: 'power_up', name: 'Time Warp', description: '3× XP for the next hour' }
  ]
}

export function rollLoot(tier?: LootTier, evolutionTier = 0): LootItem {
  const t = tier ?? rollLootTier(evolutionTier)
  const pool = LOOT_POOLS[t]
  return pool[Math.floor(Math.random() * pool.length)]
}

/** Check if a streak number is a milestone */
export function isStreakMilestone(streak: number): boolean {
  return STREAK_MILESTONES.includes(streak)
}

/** Get tier colors for UI */
export const TIER_COLORS: Record<LootTier, { text: string; border: string; bg: string; glow: string }> = {
  common: { text: 'text-gray-300', border: 'border-gray-500', bg: 'bg-gray-500/10', glow: '' },
  uncommon: { text: 'text-emerald-400', border: 'border-emerald-500', bg: 'bg-emerald-500/10', glow: 'shadow-emerald-500/20' },
  rare: { text: 'text-blue-400', border: 'border-blue-500', bg: 'bg-blue-500/10', glow: 'shadow-blue-500/30' },
  epic: { text: 'text-purple-400', border: 'border-purple-500', bg: 'bg-purple-500/10', glow: 'shadow-purple-500/40' },
  legendary: { text: 'text-amber-400', border: 'border-amber-500', bg: 'bg-amber-500/10', glow: 'shadow-amber-500/50' }
}
