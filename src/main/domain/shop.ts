export type ShopItemType = 'potion' | 'cosmetic' | 'egg'
export type ShopItemRarity = 'common' | 'uncommon' | 'rare' | 'epic'

export interface ShopItem {
  id: string
  type: ShopItemType
  rarity: ShopItemRarity
  name: string
  description: string
  icon: string
  focusCost: number
  // Potion fields
  effectType?: 'xp_boost' | 'pet_xp_boost' | 'quest_rush' | 'focus_regen' | 'habit_boost' | 'level_grant'
  effectDuration?: number
  effectMagnitude?: number
  // Cosmetic fields
  cosmeticType?: 'theme' | 'title' | 'accent'
  cosmeticValue?: string
  // Egg fields
  eggTier?: 'common' | 'uncommon' | 'rare'
}

export const SHOP_CATALOG: ShopItem[] = [
  // ── Potions ────────────────────────────────────────────────────────────────────
  {
    id: 'potion_xp_small',
    type: 'potion', rarity: 'common',
    name: 'XP Tonic',
    description: '+25% XP for 1 hour',
    icon: '🧪', focusCost: 30,
    effectType: 'xp_boost', effectDuration: 60, effectMagnitude: 1.25
  },
  {
    id: 'potion_xp_large',
    type: 'potion', rarity: 'uncommon',
    name: 'XP Elixir',
    description: '+50% XP for 2 hours',
    icon: '⚗️', focusCost: 75,
    effectType: 'xp_boost', effectDuration: 120, effectMagnitude: 1.5
  },
  {
    id: 'potion_focus_surge',
    type: 'potion', rarity: 'rare',
    name: 'Focus Surge',
    description: '+100% XP for 30 minutes',
    icon: '⚡', focusCost: 120,
    effectType: 'xp_boost', effectDuration: 30, effectMagnitude: 2.0
  },
  {
    id: 'potion_pet_xp',
    type: 'potion', rarity: 'uncommon',
    name: 'Pet XP Brew',
    description: 'Pets gain 2× XP for 1 hour',
    icon: '🐾', focusCost: 50,
    effectType: 'pet_xp_boost', effectDuration: 60, effectMagnitude: 2.0
  },
  {
    id: 'potion_quest_rush',
    type: 'potion', rarity: 'rare',
    name: 'Quest Rush',
    description: '+50% quest progress for next task',
    icon: '📜', focusCost: 60,
    effectType: 'quest_rush', effectMagnitude: 1.5
  },
  {
    id: 'potion_xp_common_boost',
    type: 'potion', rarity: 'common',
    name: 'Scholar\'s Draft',
    description: '+15% XP for 3 hours',
    icon: '📖', focusCost: 20,
    effectType: 'xp_boost', effectDuration: 180, effectMagnitude: 1.15
  },
  {
    id: 'potion_habit_boost',
    type: 'potion', rarity: 'uncommon',
    name: 'Discipline Draught',
    description: '+40% habit XP for 2 hours',
    icon: '💪', focusCost: 55,
    effectType: 'habit_boost', effectDuration: 120, effectMagnitude: 1.4
  },
  {
    id: 'potion_focus_regen',
    type: 'potion', rarity: 'common',
    name: 'Clarity Potion',
    description: 'Restore 20 Focus instantly',
    icon: '💧', focusCost: 15,
    effectType: 'focus_regen', effectMagnitude: 20
  },
  {
    id: 'potion_xp_epic_burst',
    type: 'potion', rarity: 'epic',
    name: 'Arcane Overflow',
    description: '+150% XP for 15 minutes',
    icon: '🌌', focusCost: 180,
    effectType: 'xp_boost', effectDuration: 15, effectMagnitude: 2.5
  },
  {
    id: 'potion_task_sprint',
    type: 'potion', rarity: 'uncommon',
    name: 'Sprint Serum',
    description: '+60% task XP for 1 hour',
    icon: '🏃', focusCost: 65,
    effectType: 'xp_boost', effectDuration: 60, effectMagnitude: 1.6
  },
  {
    id: 'potion_level_quarter',
    type: 'potion', rarity: 'common',
    name: 'Novice Sigil',
    description: 'Gain 25% of a level',
    icon: '🪶', focusCost: 95,
    effectType: 'level_grant', effectMagnitude: 0.25
  },
  {
    id: 'potion_level_half',
    type: 'potion', rarity: 'uncommon',
    name: 'Adept Sigil',
    description: 'Gain 50% of a level',
    icon: '📘', focusCost: 190,
    effectType: 'level_grant', effectMagnitude: 0.5
  },
  {
    id: 'potion_level_three_quarters',
    type: 'potion', rarity: 'rare',
    name: 'Master Sigil',
    description: 'Gain 75% of a level',
    icon: '📗', focusCost: 320,
    effectType: 'level_grant', effectMagnitude: 0.75
  },
  {
    id: 'potion_level_full',
    type: 'potion', rarity: 'epic',
    name: 'Ascendant Sigil',
    description: 'Gain a full level',
    icon: '📕', focusCost: 500,
    effectType: 'level_grant', effectMagnitude: 1.0
  },
  {
    id: 'potion_xp_long_small',
    type: 'potion', rarity: 'common',
    name: 'Long XP Tonic',
    description: '+25% XP for 6 hours',
    icon: '🧪', focusCost: 80,
    effectType: 'xp_boost', effectDuration: 360, effectMagnitude: 1.25
  },
  {
    id: 'potion_xp_long_medium',
    type: 'potion', rarity: 'uncommon',
    name: 'Long XP Elixir',
    description: '+50% XP for 6 hours',
    icon: '⚗️', focusCost: 150,
    effectType: 'xp_boost', effectDuration: 360, effectMagnitude: 1.5
  },
  {
    id: 'potion_xp_long_large',
    type: 'potion', rarity: 'rare',
    name: 'Long XP Infusion',
    description: '+75% XP for 6 hours',
    icon: '🔬', focusCost: 260,
    effectType: 'xp_boost', effectDuration: 360, effectMagnitude: 1.75
  },
  {
    id: 'potion_xp_long_full',
    type: 'potion', rarity: 'epic',
    name: 'Long XP Overdrive',
    description: '+100% XP for 6 hours',
    icon: '🚀', focusCost: 380,
    effectType: 'xp_boost', effectDuration: 360, effectMagnitude: 2.0
  },

  // ── Cosmetics (15 items) ──────────────────────────────────────────────────────
  {
    id: 'cosmetic_theme_ember',
    type: 'cosmetic', rarity: 'rare',
    name: 'Ember Theme', description: 'Molten forge palette with fiery highlights',
    icon: '🔥', focusCost: 85, cosmeticType: 'theme', cosmeticValue: 'ember'
  },
  {
    id: 'cosmetic_theme_ocean',
    type: 'cosmetic', rarity: 'uncommon',
    name: 'Ocean Theme', description: 'Deep ocean color palette',
    icon: '🌊', focusCost: 60, cosmeticType: 'theme', cosmeticValue: 'ocean'
  },
  {
    id: 'cosmetic_theme_void',
    type: 'cosmetic', rarity: 'rare',
    name: 'Void Theme', description: 'Dark void aesthetic',
    icon: '🌑', focusCost: 80, cosmeticType: 'theme', cosmeticValue: 'void'
  },
  {
    id: 'cosmetic_theme_golden',
    type: 'cosmetic', rarity: 'epic',
    name: 'Golden Theme', description: 'Prestige golden palette',
    icon: '✨', focusCost: 100, cosmeticType: 'theme', cosmeticValue: 'golden'
  },
  {
    id: 'cosmetic_accent_bronze',
    type: 'cosmetic', rarity: 'uncommon',
    name: 'Bronze Accent', description: 'Bronze UI accent color',
    icon: '🥉', focusCost: 40, cosmeticType: 'accent', cosmeticValue: 'bronze'
  },
  {
    id: 'cosmetic_accent_silver',
    type: 'cosmetic', rarity: 'rare',
    name: 'Silver Accent', description: 'Silver UI accent color',
    icon: '🥈', focusCost: 65, cosmeticType: 'accent', cosmeticValue: 'silver'
  },
  {
    id: 'cosmetic_accent_gold',
    type: 'cosmetic', rarity: 'epic',
    name: 'Gold Accent', description: 'Royal gold UI accent color',
    icon: '🥇', focusCost: 110, cosmeticType: 'accent', cosmeticValue: 'gold'
  },
  {
    id: 'cosmetic_title_focused',
    type: 'cosmetic', rarity: 'common',
    name: '"The Focused"', description: 'Display title',
    icon: '🎖️', focusCost: 45, cosmeticType: 'title', cosmeticValue: 'The Focused'
  },
  {
    id: 'cosmetic_title_grinder',
    type: 'cosmetic', rarity: 'uncommon',
    name: '"The Grinder"', description: 'Display title',
    icon: '⚙️', focusCost: 55, cosmeticType: 'title', cosmeticValue: 'The Grinder'
  },
  {
    id: 'cosmetic_title_sage',
    type: 'cosmetic', rarity: 'rare',
    name: '"The Sage"', description: 'Display title',
    icon: '📚', focusCost: 70, cosmeticType: 'title', cosmeticValue: 'The Sage'
  },
  {
    id: 'cosmetic_title_ironwill',
    type: 'cosmetic', rarity: 'uncommon',
    name: '"Iron Will"', description: 'Display title',
    icon: '⚔️', focusCost: 50, cosmeticType: 'title', cosmeticValue: 'Iron Will'
  },
  {
    id: 'cosmetic_title_phantom',
    type: 'cosmetic', rarity: 'rare',
    name: '"The Phantom"', description: 'Display title',
    icon: '👻', focusCost: 65, cosmeticType: 'title', cosmeticValue: 'The Phantom'
  },
  {
    id: 'cosmetic_title_chosen',
    type: 'cosmetic', rarity: 'epic',
    name: '"The Chosen"', description: 'Rare prestige display title',
    icon: '👑', focusCost: 120, cosmeticType: 'title', cosmeticValue: 'The Chosen'
  },
  {
    id: 'cosmetic_title_nightcrawler',
    type: 'cosmetic', rarity: 'uncommon',
    name: '"Night Crawler"', description: 'Display title',
    icon: '🌙', focusCost: 50, cosmeticType: 'title', cosmeticValue: 'Night Crawler'
  },
  {
    id: 'cosmetic_title_relentless',
    type: 'cosmetic', rarity: 'rare',
    name: '"Relentless"', description: 'Display title',
    icon: '🔥', focusCost: 75, cosmeticType: 'title', cosmeticValue: 'Relentless'
  },

  // ── Eggs (6 items) ────────────────────────────────────────────────────────────
  {
    id: 'egg_common_1',
    type: 'egg', rarity: 'common',
    name: 'Common Egg', description: 'A mysterious egg. Common rarity pet inside.',
    icon: '🥚', focusCost: 150,
    eggTier: 'common'
  },
  {
    id: 'egg_common_2',
    type: 'egg', rarity: 'common',
    name: 'Speckled Egg', description: 'A speckled common egg. Who could be inside?',
    icon: '🪺', focusCost: 150,
    eggTier: 'common'
  },
  {
    id: 'egg_uncommon_1',
    type: 'egg', rarity: 'uncommon',
    name: 'Glowing Egg', description: 'Pulses with soft light. Uncommon pet awaits.',
    icon: '🌟', focusCost: 300,
    eggTier: 'uncommon'
  },
  {
    id: 'egg_uncommon_2',
    type: 'egg', rarity: 'uncommon',
    name: 'Crystal Egg', description: 'Shimmers faintly. An uncommon companion stirs within.',
    icon: '💎', focusCost: 300,
    eggTier: 'uncommon'
  },
  {
    id: 'egg_rare_1',
    type: 'egg', rarity: 'rare',
    name: 'Arcane Egg', description: 'Crackles with rare energy. A rare pet is guaranteed.',
    icon: '🔮', focusCost: 600,
    eggTier: 'rare'
  },
  {
    id: 'egg_rare_2',
    type: 'egg', rarity: 'rare',
    name: 'Runic Egg', description: 'Etched with ancient runes. Rare pet inside.',
    icon: '✴️', focusCost: 600,
    eggTier: 'rare'
  }
]

export const SHOP_CATALOG_BY_ID: Record<string, ShopItem> = SHOP_CATALOG.reduce(
  (acc, item) => {
    acc[item.id] = item
    return acc
  },
  {} as Record<string, ShopItem>
)

// ── Deterministic PRNG ────────────────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let s = seed
  return function () {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Returns the 6-item daily shop for a given date seed (YYYY-MM-DD).
 * Picks 2 potions + 2 cosmetics + 2 eggs.
 */
export function generateDailyShop(dateSeed: string): ShopItem[] {
  const numericSeed = parseInt(dateSeed.replace(/-/g, ''), 10)
  const rng = mulberry32(numericSeed)

  const potions = SHOP_CATALOG.filter((i) => i.type === 'potion')
  const cosmetics = SHOP_CATALOG.filter((i) => i.type === 'cosmetic')
  const eggs = SHOP_CATALOG.filter((i) => i.type === 'egg')

  const pickedPotions = seededShuffle(potions, rng).slice(0, 2)
  const pickedCosmetics = seededShuffle(cosmetics, rng).slice(0, 2)
  const pickedEggs = seededShuffle(eggs, rng).slice(0, 2)

  return [...pickedPotions, ...pickedCosmetics, ...pickedEggs]
}
