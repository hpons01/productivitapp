import type { XpSource } from './classes'

export type PetRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export interface PetDefinition {
  id: string
  name: string
  icon: string
  rarity: PetRarity
  /** XpSource this pet boosts. null = all sources (epic/legendary). */
  boostedSource: XpSource | null
  /** Per-level XP bonus rate, e.g. 0.005 = +0.5% per level */
  bonusRate: number
  flavorText: string
  maxLevel: number
}

/** Pet XP divisor — pets level faster than the player (divisor 5 vs player's 10) */
export const PET_LEVEL_DIVISOR = 5

/** Fraction of player base XP awarded to the equipped pet */
export const PET_XP_SHARE_RATE = 0.4

/** Compute pet level from accumulated XP */
export function petLevelFromXP(totalXP: number): number {
  return Math.max(1, Math.floor(Math.sqrt(totalXP / PET_LEVEL_DIVISOR)))
}

/**
 * Compute the XP multiplier a pet applies to a given source.
 * Returns 1.0 if the pet does not boost this source.
 */
export function getPetMultiplier(def: PetDefinition, level: number, source: string): number {
  const appliesToSource = def.boostedSource === null || def.boostedSource === source
  if (!appliesToSource) return 1
  return 1 + level * def.bonusRate
}

export const ALL_PET_DEFINITIONS: PetDefinition[] = [
  // ── Common (0.5% / level, source-specific) ─────────────────────────────────
  {
    id: 'pet_tomato_frog',
    name: 'Tomato Frog',
    icon: '🐸',
    rarity: 'common',
    boostedSource: 'pomodoro',
    bonusRate: 0.005,
    flavorText: 'Loves sitting perfectly still inside focus cycles.',
    maxLevel: 20
  },
  {
    id: 'pet_terrier_pup',
    name: 'Terrier Pup',
    icon: '🐕',
    rarity: 'common',
    boostedSource: 'task',
    bonusRate: 0.005,
    flavorText: 'Fetches completed tasks with boundless enthusiasm.',
    maxLevel: 20
  },
  {
    id: 'pet_clover_snail',
    name: 'Clover Snail',
    icon: '🐌',
    rarity: 'common',
    boostedSource: 'habit',
    bonusRate: 0.005,
    flavorText: 'Slow and steady wins the streak.',
    maxLevel: 20
  },

  // ── Uncommon (0.8% / level, source-specific) ───────────────────────────────
  {
    id: 'pet_owl_familiar',
    name: 'Owl Familiar',
    icon: '🦉',
    rarity: 'uncommon',
    boostedSource: 'journal',
    bonusRate: 0.008,
    flavorText: 'Sees wisdom in every evening reflection.',
    maxLevel: 20
  },
  {
    id: 'pet_static_ferret',
    name: 'Static Ferret',
    icon: '🐾',
    rarity: 'uncommon',
    boostedSource: 'energy',
    bonusRate: 0.008,
    flavorText: 'Reads your energy levels like a tiny seismograph.',
    maxLevel: 20
  },
  {
    id: 'pet_iron_beetle',
    name: 'Iron Beetle',
    icon: '🪲',
    rarity: 'uncommon',
    boostedSource: 'task',
    bonusRate: 0.008,
    flavorText: 'Relentless. Never stops until the pile is gone.',
    maxLevel: 20
  },

  // ── Rare (1.2% / level, source-specific) ───────────────────────────────────
  {
    id: 'pet_chrono_salamander',
    name: 'Chrono Salamander',
    icon: '🦎',
    rarity: 'rare',
    boostedSource: 'pomodoro',
    bonusRate: 0.012,
    flavorText: 'Bends time inside every focus session.',
    maxLevel: 20
  },
  {
    id: 'pet_rune_fox',
    name: 'Rune Fox',
    icon: '🦊',
    rarity: 'rare',
    boostedSource: 'journal',
    bonusRate: 0.012,
    flavorText: 'Inscribes your thoughts into cosmic memory.',
    maxLevel: 20
  },
  {
    id: 'pet_grove_sprite',
    name: 'Grove Sprite',
    icon: '🌿',
    rarity: 'rare',
    boostedSource: 'habit',
    bonusRate: 0.012,
    flavorText: 'Nourishes streaks like sunlight feeds trees.',
    maxLevel: 20
  },

  // ── Epic (0.6% / level, ALL sources) ───────────────────────────────────────
  {
    id: 'pet_void_cat',
    name: 'Void Cat',
    icon: '🐱',
    rarity: 'epic',
    boostedSource: null,
    bonusRate: 0.006,
    flavorText: 'Absorbs the ambient XP of the universe.',
    maxLevel: 20
  },
  {
    id: 'pet_storm_drake',
    name: 'Storm Drake',
    icon: '🐉',
    rarity: 'epic',
    boostedSource: null,
    bonusRate: 0.006,
    flavorText: 'Lightning cascades through every productive action.',
    maxLevel: 20
  },
  {
    id: 'pet_prism_hare',
    name: 'Prism Hare',
    icon: '🐇',
    rarity: 'epic',
    boostedSource: null,
    bonusRate: 0.006,
    flavorText: 'Refracts effort into every spectrum of growth.',
    maxLevel: 20
  },

  // ── Legendary (1.0% / level, ALL sources) ──────────────────────────────────
  {
    id: 'pet_celestial_phoenix',
    name: 'Celestial Phoenix',
    icon: '🦅',
    rarity: 'legendary',
    boostedSource: null,
    bonusRate: 0.01,
    flavorText: 'Born from the ashes of perfect days.',
    maxLevel: 20
  },
  {
    id: 'pet_temporal_kitsune',
    name: 'Temporal Kitsune',
    icon: '🦊',
    rarity: 'legendary',
    boostedSource: null,
    bonusRate: 0.01,
    flavorText: 'Nine tails, each carrying a different productivity discipline.',
    maxLevel: 20
  },
  {
    id: 'pet_aether_leviathan',
    name: 'Aether Leviathan',
    icon: '🐋',
    rarity: 'legendary',
    boostedSource: null,
    bonusRate: 0.01,
    flavorText: 'Ancient beyond measure; amplifies all effort in its wake.',
    maxLevel: 20
  }
]

export const PET_DEFINITIONS_BY_ID: Record<string, PetDefinition> = ALL_PET_DEFINITIONS.reduce(
  (acc, def) => {
    acc[def.id] = def
    return acc
  },
  {} as Record<string, PetDefinition>
)

/** Returns all pet definitions matching a given rarity */
export function getPetsByRarity(rarity: PetRarity): PetDefinition[] {
  return ALL_PET_DEFINITIONS.filter((d) => d.rarity === rarity)
}

/** Rolls pet rarity when opening an egg. */
export function rollPetRarity(): PetRarity {
  const roll = Math.random()
  if (roll < 0.60) return 'common'
  if (roll < 0.88) return 'uncommon'
  if (roll < 0.98) return 'rare'
  if (roll < 0.995) return 'epic'
  return 'legendary'
}
