export type CharacterClassId =
  | 'apprentice'
  | 'time_mage'
  | 'iron_warrior'
  | 'zen_master'
  | 'arcane_scholar'
  | 'grand_tactician'

export interface CharacterClassOption {
  id: CharacterClassId
  name: string
  icon: string
  description: string
  boostedSource: string | null
  multiplier: number
  evolutionPath: Array<{ title: string; minXp: number; perk: string }>
}

export const SOURCE_LABELS: Record<string, string> = {
  pomodoro: 'Pomodoro Sessions',
  task: 'Daily Tasks',
  habit: 'Habit Completions',
  journal: 'Journal Entries',
  energy: 'Energy Logs'
}
