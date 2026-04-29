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
  icon: string
  value?: number
  levelFraction?: number
  effectType?: string
  effectDuration?: number
  effectMagnitude?: number
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
    { tier: 'common', type: 'xp_boost', name: 'Minor XP Scroll', description: '+50 bonus XP', icon: '📜', value: 50 },
    { tier: 'common', type: 'xp_boost', name: 'Novice Sigil', description: 'Gain 25% of a level', icon: '🔰', levelFraction: 0.25 },
    { tier: 'common', type: 'power_up', name: 'Long XP Tonic', description: '+25% XP for 6 hours', icon: '🧃' },
    { tier: 'common', type: 'title', name: 'The Diligent', description: 'A modest title for your efforts', icon: '🏷️' },
    { tier: 'common', type: 'cosmetic', name: 'Bronze Accent', description: 'Unlock bronze UI accents', icon: '🟤' }
  ],
  uncommon: [
    { tier: 'uncommon', type: 'xp_boost', name: 'XP Tome', description: '+150 bonus XP', icon: '📚', value: 150 },
    { tier: 'uncommon', type: 'xp_boost', name: 'Adept Sigil', description: 'Gain 50% of a level', icon: '⭐', levelFraction: 0.5 },
    { tier: 'uncommon', type: 'power_up', name: 'Long XP Elixir', description: '+50% XP for 6 hours', icon: '🧪' },
    { tier: 'uncommon', type: 'power_up', name: 'Focus Potion', description: '+25% XP on your next 3 Pomodoros', icon: '🍵' },
    { tier: 'uncommon', type: 'power_up', name: 'Clockwork Voucher', description: 'Reroll today\'s shop stock for a new set of wares', icon: '🧷', effectType: 'shop_reroll' },
    { tier: 'uncommon', type: 'cosmetic', name: 'Silver Accent', description: 'Unlock silver UI accents', icon: '🩶' },
    { tier: 'uncommon', type: 'title', name: 'The Persistent', description: 'A green title for the consistent', icon: '🌿' }
  ],
  rare: [
    { tier: 'rare', type: 'xp_boost', name: 'Ancient XP Crystal', description: '+500 bonus XP', icon: '💎', value: 500 },
    { tier: 'rare', type: 'xp_boost', name: 'Master Sigil', description: 'Gain 75% of a level', icon: '🌟', levelFraction: 0.75 },
    { tier: 'rare', type: 'power_up', name: 'Long XP Infusion', description: '+75% XP for 6 hours', icon: '⚗️' },
    { tier: 'rare', type: 'power_up', name: 'Streak Shield', description: 'Protect a streak from breaking once', icon: '🛡️' },
    { tier: 'rare', type: 'theme', name: 'Ember Theme', description: 'Unlock the warm Emberforge palette', icon: '🔥' },
    { tier: 'rare', type: 'theme', name: 'Ocean Theme', description: 'Unlock the Abyssal Tide theme', icon: '🌊' },
    { tier: 'rare', type: 'title', name: 'The Relentless', description: 'A blue title for the focused', icon: '⚡' }
  ],
  epic: [
    { tier: 'epic', type: 'xp_boost', name: 'Epic XP Orb', description: '+1500 bonus XP', icon: '🔮', value: 1500 },
    { tier: 'epic', type: 'xp_boost', name: 'Ascendant Sigil', description: 'Gain a full level', icon: '✨', levelFraction: 1 },
    { tier: 'epic', type: 'power_up', name: 'Long XP Overdrive', description: '+100% XP for 6 hours', icon: '🌀' },
    { tier: 'epic', type: 'power_up', name: 'Double XP Elixir', description: '2× XP for the next 30 minutes', icon: '⚡' },
    { tier: 'epic', type: 'theme', name: 'Void Theme', description: 'Unlock the sinister Voidweave theme', icon: '🌑' },
    { tier: 'epic', type: 'title', name: 'Champion of Focus', description: 'A purple title for the elite', icon: '👑' }
  ],
  legendary: [
    { tier: 'legendary', type: 'xp_boost', name: 'Legendary XP Tome', description: '+5000 bonus XP', icon: '📖', value: 5000 },
    { tier: 'legendary', type: 'cosmetic', name: 'Gold Accent', description: 'Unlock royal gold UI accents', icon: '🏆' },
    { tier: 'legendary', type: 'theme', name: 'Golden Theme', description: 'Unlock the Sunken Throne legendary theme', icon: '☀️' },
    { tier: 'legendary', type: 'title', name: 'Productivity God', description: 'The rarest title in the game', icon: '⚜️' },
    { tier: 'legendary', type: 'power_up', name: 'Time Warp', description: '3× XP for the next hour', icon: '⏳' }
  ]
}

export function rollLoot(tier?: LootTier, evolutionTier = 0): LootItem {
  const t = tier ?? rollLootTier(evolutionTier)
  const pool = LOOT_POOLS[t]
  return pool[Math.floor(Math.random() * pool.length)]
}

/** Focus awarded instead of a duplicate cosmetic/theme drop */
export const DUPLICATE_FOCUS_BY_TIER: Record<LootTier, number> = {
  common: 15,
  uncommon: 30,
  rare: 60,
  epic: 120,
  legendary: 250
}

/**
 * Roll loot with deduplication for cosmetic/theme items.
 * If the rolled item is a theme or cosmetic already owned (by name),
 * returns { loot: null, focusInstead: number } so the caller can award Focus instead.
 */
export function rollLootDeduped(
  ownedNames: Set<string>,
  tier?: LootTier,
  evolutionTier = 0
): { loot: LootItem; focusInstead: null } | { loot: null; focusInstead: number } {
  const loot = rollLoot(tier, evolutionTier)

  if ((loot.type === 'theme' || loot.type === 'cosmetic' || loot.type === 'title') && ownedNames.has(loot.name)) {
    return { loot: null, focusInstead: DUPLICATE_FOCUS_BY_TIER[loot.tier] }
  }

  return { loot, focusInstead: null }
}

/** Check if a streak number is a milestone */
export function isStreakMilestone(streak: number): boolean {
  return STREAK_MILESTONES.includes(streak)
}

/** Get tier colors for UI — heraldic palette */
export const TIER_COLORS: Record<LootTier, { text: string; border: string; bg: string; glow: string }> = {
  common:    { text: 'text-[#8a9ba8]',  border: 'border-[#8a9ba8]',  bg: 'bg-[rgba(138,155,168,0.08)]', glow: '' },
  uncommon:  { text: 'text-[#2ea87e]',  border: 'border-[#2ea87e]',  bg: 'bg-[rgba(46,168,126,0.10)]',  glow: 'shadow-[0_0_8px_rgba(46,168,126,0.25)]' },
  rare:      { text: 'text-[#4a9fd4]',  border: 'border-[#4a9fd4]',  bg: 'bg-[rgba(74,159,212,0.10)]',  glow: 'shadow-[0_0_10px_rgba(74,159,212,0.30)]' },
  epic:      { text: 'text-[#9b59b6]',  border: 'border-[#9b59b6]',  bg: 'bg-[rgba(155,89,182,0.12)]',  glow: 'shadow-[0_0_12px_rgba(155,89,182,0.40)]' },
  legendary: { text: 'text-[#c8972a]',  border: 'border-[#c8972a]',  bg: 'bg-[rgba(200,151,42,0.10)]',  glow: 'shadow-[0_0_16px_rgba(200,151,42,0.50)]' }
}
