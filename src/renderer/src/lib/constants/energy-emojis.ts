export const ENERGY_LEVEL_EMOJIS = ['🔋', '😴', '🙂', '😊', '⚡'] as const

export const ENERGY_OPTIONS = [
  { value: 1, emoji: ENERGY_LEVEL_EMOJIS[0], label: 'Depleted' },
  { value: 2, emoji: ENERGY_LEVEL_EMOJIS[1], label: 'Low' },
  { value: 3, emoji: ENERGY_LEVEL_EMOJIS[2], label: 'Moderate' },
  { value: 4, emoji: ENERGY_LEVEL_EMOJIS[3], label: 'High' },
  { value: 5, emoji: ENERGY_LEVEL_EMOJIS[4], label: 'Peak' }
] as const
