/**
 * Energy Zone Recommendations
 * Based on Loehr & Schwartz "The Power of Full Engagement"
 */

export interface EnergyZone {
  level: number
  label: string
  emoji: string
  color: string
  recommendation: string
  bestFor: string[]
  avoid: string[]
}

export const ENERGY_ZONES: EnergyZone[] = [
  {
    level: 5,
    label: 'Peak',
    emoji: '⚡',
    color: 'text-yellow-400',
    recommendation: 'You are in the zone! Attack your hardest tasks now.',
    bestFor: ['Deep work', 'Creative thinking', 'Complex decisions', 'Learning new skills'],
    avoid: ['Mindless tasks', 'Email processing']
  },
  {
    level: 4,
    label: 'High',
    emoji: '🔥',
    color: 'text-orange-400',
    recommendation: 'Great energy! Good time for focused, challenging work.',
    bestFor: ['Writing', 'Focused coding', 'Strategic planning', 'Important meetings'],
    avoid: ['Passive consumption']
  },
  {
    level: 3,
    label: 'Moderate',
    emoji: '🌤️',
    color: 'text-blue-400',
    recommendation: 'Solid baseline. Handle important but less demanding work.',
    bestFor: ['Email/comms', 'Routine tasks', 'Administrative work', 'Light meetings'],
    avoid: ['Complex problem-solving']
  },
  {
    level: 2,
    label: 'Low',
    emoji: '😴',
    color: 'text-indigo-400',
    recommendation: 'Energy is dipping. Prioritize easy wins and recovery.',
    bestFor: ['Organization', 'Light reading', 'Scheduling', 'Simple data entry'],
    avoid: ['High-stakes decisions', 'Creative work', 'Important conversations']
  },
  {
    level: 1,
    label: 'Depleted',
    emoji: '🪫',
    color: 'text-gray-400',
    recommendation: 'Rest is productive right now. Recover to perform better later.',
    bestFor: ['Short break', '10-min walk', 'Hydration', 'Breathing exercise'],
    avoid: ['Any cognitively demanding tasks']
  }
]

export function getEnergyZone(level: number): EnergyZone {
  return ENERGY_ZONES.find((z) => z.level === level) ?? ENERGY_ZONES[2]
}

export function getEnergyEmoji(level: number): string {
  return getEnergyZone(level).emoji
}
