/**
 * Renderer-side pet logic — pure functions, no IPC.
 * Mirrors the main-process domain/pets.ts formulas for UI display.
 */

export type PetRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

/** Per-level XP bonus rate by rarity */
export const RARITY_BONUS_RATES: Record<PetRarity, number> = {
  common: 0.005,
  uncommon: 0.008,
  rare: 0.012,
  epic: 0.006,
  legendary: 0.01
}

/** Human-readable rarity labels */
export const RARITY_LABELS: Record<PetRarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary'
}

/** Compute pet level from accumulated XP (faster curve than player) */
export function petLevelFromXP(totalXP: number): number {
  return Math.max(1, Math.floor(Math.sqrt(totalXP / 5)))
}

/** XP needed to reach a given pet level */
export function petXpForLevel(level: number): number {
  return level * level * 5
}

/** Progress to next level (0–1) */
export function petLevelProgress(totalXP: number): number {
  const level = petLevelFromXP(totalXP)
  const current = petXpForLevel(level)
  const next = petXpForLevel(level + 1)
  return Math.min(1, (totalXP - current) / (next - current))
}

/** XP remaining to next pet level */
export function petXpToNextLevel(totalXP: number): number {
  const level = petLevelFromXP(totalXP)
  return Math.max(0, petXpForLevel(level + 1) - totalXP)
}

/** Returns the current bonus percentage for a pet */
export function getPetBonusPercent(rarity: PetRarity, level: number): number {
  return level * RARITY_BONUS_RATES[rarity] * 100
}

/** Returns a formatted bonus description for display */
export function getPetBonusDescription(
  rarity: PetRarity,
  level: number,
  boostedSource: string | null
): string {
  const pct = getPetBonusPercent(rarity, level).toFixed(1)
  if (boostedSource === null) return `+${pct}% All XP`

  const SOURCE_LABELS: Record<string, string> = {
    pomodoro: 'Pomodoro XP',
    task: 'Task XP',
    habit: 'Habit XP',
    journal: 'Journal XP',
    energy: 'Energy XP'
  }
  const label = SOURCE_LABELS[boostedSource] ?? `${boostedSource} XP`
  return `+${pct}% ${label}`
}
