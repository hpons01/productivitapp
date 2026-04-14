export type CharacterClassId =
  | 'apprentice'
  | 'time_mage'
  | 'iron_warrior'
  | 'zen_master'
  | 'arcane_scholar'
  | 'grand_tactician'

export type XpSource =
  | 'pomodoro'
  | 'task'
  | 'habit'
  | 'journal'
  | 'energy'
  | 'badge'
  | 'loot'
  | 'habit_created'

export interface CharacterClassDefinition {
  id: CharacterClassId
  name: string
  icon: string
  description: string
  boostedSource: XpSource | null
  multiplier: number
  evolutionPath: Array<{ title: string; minXp: number; perk: string }>
}

export const CHARACTER_CLASSES: CharacterClassDefinition[] = [
  {
    id: 'apprentice',
    name: 'Apprentice',
    icon: '🌱',
    description: 'Learning every discipline. No class bonus yet.',
    boostedSource: null,
    multiplier: 1,
    evolutionPath: [
      { title: 'Seeker', minXp: 0, perk: 'Unlock class system and baseline progression tracking.' },
      { title: 'Journeyman', minXp: 300, perk: 'Class bonus indicator appears on Progress dashboard.' },
      { title: 'Pathfinder', minXp: 900, perk: 'Milestone glow and advanced class mastery summary unlocked.' },
      { title: 'Waymaster', minXp: 2000, perk: 'Final mastery title and max evolution badge marker.' }
    ]
  },
  {
    id: 'time_mage',
    name: 'Time Mage',
    icon: '⚡',
    description: 'Masters focus cycles and earns more from Pomodoros.',
    boostedSource: 'pomodoro',
    multiplier: 1.25,
    evolutionPath: [
      { title: 'Chrono Adept', minXp: 0, perk: 'Pomodoro XP receives Time Mage class bonus.' },
      { title: 'Hourweaver', minXp: 300, perk: 'Bonus XP chain highlights in recent gains feed.' },
      { title: 'Rift Binder', minXp: 900, perk: 'Focus evolution track and mastery momentum visuals.' },
      { title: 'Eternal Archon', minXp: 2000, perk: 'Legendary time mastery title unlocked permanently.' }
    ]
  },
  {
    id: 'iron_warrior',
    name: 'Iron Warrior',
    icon: '⚔️',
    description: 'Thrives on execution pressure and earns more from tasks.',
    boostedSource: 'task',
    multiplier: 1.25,
    evolutionPath: [
      { title: 'Bronze Vanguard', minXp: 0, perk: 'Task XP receives Iron Warrior class bonus.' },
      { title: 'Steel Sentinel', minXp: 300, perk: 'Execution streak milestones gain enhanced visibility.' },
      { title: 'Titan Warden', minXp: 900, perk: 'Task mastery path deepens with rank tracking.' },
      { title: 'Warforged Paragon', minXp: 2000, perk: 'Peak execution title and max rank marker unlocked.' }
    ]
  },
  {
    id: 'zen_master',
    name: 'Zen Master',
    icon: '🌿',
    description: 'Builds consistency through rituals and earns more from habits.',
    boostedSource: 'habit',
    multiplier: 1.25,
    evolutionPath: [
      { title: 'Sprout Keeper', minXp: 0, perk: 'Habit XP receives Zen Master class bonus.' },
      { title: 'Grove Keeper', minXp: 300, perk: 'Habit consistency milestones are emphasized.' },
      { title: 'Wildheart Sage', minXp: 900, perk: 'Vitality evolution track and mastery gauge unlocked.' },
      { title: 'Verdant Sovereign', minXp: 2000, perk: 'Supreme routine title and full evolution crest unlocked.' }
    ]
  },
  {
    id: 'arcane_scholar',
    name: 'Arcane Scholar',
    icon: '🧙',
    description: 'Reflects deeply and earns more from journaling.',
    boostedSource: 'journal',
    multiplier: 1.25,
    evolutionPath: [
      { title: 'Rune Reader', minXp: 0, perk: 'Journal XP receives Arcane Scholar class bonus.' },
      { title: 'Codex Scribe', minXp: 300, perk: 'Reflection streak milestones get highlighted.' },
      { title: 'Lorebinder', minXp: 900, perk: 'Wisdom evolution path with rank insight unlocked.' },
      { title: 'Astral Archivist', minXp: 2000, perk: 'Mythic scholar title and final mastery badge unlocked.' }
    ]
  },
  {
    id: 'grand_tactician',
    name: 'Grand Tactician',
    icon: '🎯',
    description: 'Reads momentum and earns more from energy logs.',
    boostedSource: 'energy',
    multiplier: 1.25,
    evolutionPath: [
      { title: 'Pulse Scout', minXp: 0, perk: 'Energy XP receives Grand Tactician class bonus.' },
      { title: 'Momentum Caller', minXp: 300, perk: 'Energy momentum spikes are tracked as milestones.' },
      { title: 'Rhythm Marshal', minXp: 900, perk: 'Advanced vitality rhythm evolution indicators unlock.' },
      { title: 'Prime Strategist', minXp: 2000, perk: 'Ultimate strategist title and final rank aura unlocked.' }
    ]
  }
]

export const CHARACTER_CLASSES_BY_ID: Record<CharacterClassId, CharacterClassDefinition> =
  CHARACTER_CLASSES.reduce((acc, classDef) => {
    acc[classDef.id] = classDef
    return acc
  }, {} as Record<CharacterClassId, CharacterClassDefinition>)

export function isCharacterClassId(value: string): value is CharacterClassId {
  return Object.prototype.hasOwnProperty.call(CHARACTER_CLASSES_BY_ID, value)
}

export function getEvolutionForXp(
  classDef: CharacterClassDefinition,
  masteryXp: number
): {
  currentTitle: string
  currentIndex: number
  currentMinXp: number
  nextTitle: string | null
  nextMinXp: number | null
  progressPct: number
} {
  const path = classDef.evolutionPath
  let currentIndex = 0
  for (let i = 0; i < path.length; i++) {
    if (masteryXp >= path[i].minXp) currentIndex = i
  }

  const current = path[currentIndex]
  const next = path[currentIndex + 1] || null

  if (!next) {
    return {
      currentTitle: current.title,
      currentIndex,
      currentMinXp: current.minXp,
      nextTitle: null,
      nextMinXp: null,
      progressPct: 100
    }
  }

  const span = Math.max(1, next.minXp - current.minXp)
  const progressPct = Math.max(0, Math.min(100, Math.round(((masteryXp - current.minXp) / span) * 100)))

  return {
    currentTitle: current.title,
    currentIndex,
    currentMinXp: current.minXp,
    nextTitle: next.title,
    nextMinXp: next.minXp,
    progressPct
  }
}

export function getEvolutionTier(classDef: CharacterClassDefinition, masteryXp: number): number {
  return getEvolutionForXp(classDef, masteryXp).currentIndex
}
