import Database from 'better-sqlite3'
import {
  ALL_PET_DEFINITIONS,
  PET_XP_SHARE_RATE,
  petLevelFromXP,
  getPetMultiplier,
  rollPetRarity
} from '../../domain/pets'
import { awardFocus } from './shop.queries'

export interface PetRow {
  id: string
  definition_id: string
  egg_id: string | null
  name: string
  total_xp: number
  level: number
  obtained_at: number
  equipped: number
}

export interface PetDefinitionRow {
  id: string
  name: string
  icon: string
  rarity: string
  boosted_source: string | null
  bonus_rate: number
  flavor_text: string
  max_level: number
}

export interface PetWithDefinition extends PetRow {
  icon: string
  rarity: string
  boosted_source: string | null
  bonus_rate: number
  flavor_text: string
  max_level: number
}

export interface EggRow {
  id: string
  tier: string | null
  source_quest_id: string | null
  earned_at: number
  hatched_at: number | null
  pet_id: string | null
}

export interface PetXpResult {
  petXpGain: number
  newLevel: number
  leveledUp: boolean
}

export interface HatchResult {
  pet: PetWithDefinition | null
  egg: EggRow
  isDuplicate: boolean
  focusAwarded: number
}

/** Returns the equipped pet joined with its definition, or null */
export function getEquippedPet(db: Database.Database): PetWithDefinition | null {
  const row = db.prepare(`
    SELECT p.*, d.icon, d.rarity, d.boosted_source, d.bonus_rate, d.flavor_text, d.max_level
    FROM pets p
    JOIN pet_definitions d ON p.definition_id = d.id
    WHERE p.equipped = 1 AND p.deleted_at IS NULL
    LIMIT 1
  `).get() as PetWithDefinition | undefined

  return row ?? null
}

/**
 * Returns the XP multiplier the equipped pet applies to a given source.
 * Returns 1.0 if no pet is equipped or pet doesn't boost this source.
 */
export function getEquippedPetMultiplier(db: Database.Database, source: string): number {
  const pet = getEquippedPet(db)
  if (!pet) return 1

  const def = ALL_PET_DEFINITIONS.find((d) => d.id === pet.definition_id)
  if (!def) return 1

  return getPetMultiplier(def, pet.level, source)
}

/**
 * Awards XP to the equipped pet.
 * Inserts into pet_xp_log, updates pets.total_xp and pets.level.
 * Returns the XP gain and whether the pet leveled up.
 */
export function awardPetXP(
  db: Database.Database,
  petId: string,
  source: string,
  baseActivityXp: number
): PetXpResult {
  const pet = db.prepare('SELECT * FROM pets WHERE id = ?').get(petId) as PetRow | undefined
  if (!pet) return { petXpGain: 0, newLevel: 1, leveledUp: false }

  const petXpGain = Math.max(1, Math.round(baseActivityXp * PET_XP_SHARE_RATE))
  const newTotalXp = pet.total_xp + petXpGain
  const newLevel = Math.min(petLevelFromXP(newTotalXp), 20)
  const leveledUp = newLevel > pet.level

  const logId = `petxp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
  db.prepare(`
    INSERT INTO pet_xp_log (id, pet_id, source, source_xp, pet_xp_gain, logged_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(logId, petId, source, baseActivityXp, petXpGain, Date.now(), Date.now())

  db.prepare('UPDATE pets SET total_xp = ?, level = ?, updated_at = ? WHERE id = ?').run(newTotalXp, newLevel, Date.now(), petId)

  return { petXpGain, newLevel, leveledUp }
}

/** Returns all hatched pets with their definitions, newest first */
export function getAllPets(db: Database.Database): PetWithDefinition[] {
  return db.prepare(`
    SELECT p.*, d.icon, d.rarity, d.boosted_source, d.bonus_rate, d.flavor_text, d.max_level
    FROM pets p
    JOIN pet_definitions d ON p.definition_id = d.id
    WHERE p.deleted_at IS NULL
    ORDER BY p.obtained_at DESC
  `).all() as PetWithDefinition[]
}

/** Returns all unhatched eggs, oldest first */
export function getUnhatchedEggs(db: Database.Database): EggRow[] {
  return db.prepare(`
    SELECT * FROM pet_eggs WHERE hatched_at IS NULL AND deleted_at IS NULL ORDER BY earned_at ASC
  `).all() as EggRow[]
}

/** Sets one pet as equipped, unequips all others */
export function equipPet(db: Database.Database, petId: string): void {
  const tx = db.transaction(() => {
    const now = Date.now()
    db.prepare('UPDATE pets SET equipped = 0, updated_at = ? WHERE deleted_at IS NULL').run(now)
    db.prepare('UPDATE pets SET equipped = 1, updated_at = ? WHERE id = ?').run(now, petId)
  })
  tx()
}

/** Unequips all pets */
export function unequipAll(db: Database.Database): void {
  db.prepare('UPDATE pets SET equipped = 0, updated_at = ? WHERE deleted_at IS NULL').run(Date.now())
}

const DUPLICATE_PET_FOCUS: Record<string, number> = {
  common: 50,
  uncommon: 100,
  rare: 150,
  epic: 250,
  legendary: 400
}

/**
 * Hatches an egg: rolls rarity at open time.
 * If the player already owns a pet of the rolled definition, awards Focus instead
 * of creating a duplicate. Otherwise, creates a new pets row and marks the egg hatched.
 */
export function hatchEgg(db: Database.Database, eggId: string): HatchResult | null {
  const egg = db.prepare('SELECT * FROM pet_eggs WHERE id = ? AND hatched_at IS NULL').get(eggId) as EggRow | undefined
  if (!egg) return null

  const rolledRarity = rollPetRarity()
  const defs = ALL_PET_DEFINITIONS.filter((d) => d.rarity === rolledRarity)
  if (defs.length === 0) return null

  const chosenDef = defs[Math.floor(Math.random() * defs.length)]
  const now = Date.now()

  // Check for duplicate: does the player already own this definition?
  const existing = db
    .prepare('SELECT COUNT(*) as n FROM pets WHERE definition_id = ?')
    .get(chosenDef.id) as { n: number }
  const isDuplicate = existing.n > 0

  if (isDuplicate) {
    const focusAmount = DUPLICATE_PET_FOCUS[chosenDef.rarity] ?? 50

    const tx = db.transaction(() => {
      // Mark egg as hatched with pet_id = NULL (duplicate outcome)
      db.prepare('UPDATE pet_eggs SET tier = ?, hatched_at = ?, pet_id = NULL, updated_at = ? WHERE id = ?')
        .run(chosenDef.rarity, now, now, eggId)
      awardFocus(db, 'duplicate_pet', `dup_pet_${eggId}`, focusAmount)
    })
    tx()

    const updatedEgg = db.prepare('SELECT * FROM pet_eggs WHERE id = ?').get(eggId) as EggRow
    return { pet: null, egg: updatedEgg, isDuplicate: true, focusAwarded: focusAmount }
  }

  // Non-duplicate: create the pet
  const petId = `pet_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`

  db.prepare(`
    INSERT INTO pets (id, definition_id, egg_id, name, total_xp, level, obtained_at, equipped, updated_at)
    VALUES (?, ?, ?, ?, 0, 1, ?, 0, ?)
  `).run(petId, chosenDef.id, eggId, chosenDef.name, now, now)

  db.prepare('UPDATE pet_eggs SET tier = ?, hatched_at = ?, pet_id = ?, updated_at = ? WHERE id = ?').run(chosenDef.rarity, now, petId, now, eggId)

  const updatedEgg = db.prepare('SELECT * FROM pet_eggs WHERE id = ?').get(eggId) as EggRow
  const newPet = db.prepare(`
    SELECT p.*, d.icon, d.rarity, d.boosted_source, d.bonus_rate, d.flavor_text, d.max_level
    FROM pets p
    JOIN pet_definitions d ON p.definition_id = d.id
    WHERE p.id = ?
  `).get(petId) as PetWithDefinition

  return { pet: newPet, egg: updatedEgg, isDuplicate: false, focusAwarded: 0 }
}

/** Awards a mystery egg to the player from a completed quest */
export function awardEgg(db: Database.Database, questId: string): EggRow {
  const id = `egg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
  db.prepare(`
    INSERT INTO pet_eggs (id, tier, source_quest_id, earned_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, 'mystery', questId, Date.now(), Date.now())

  return db.prepare('SELECT * FROM pet_eggs WHERE id = ?').get(id) as EggRow
}

/** Renames a pet */
export function renamePet(db: Database.Database, petId: string, name: string): void {
  db.prepare('UPDATE pets SET name = ?, updated_at = ? WHERE id = ?').run(name.trim(), Date.now(), petId)
}

/** Returns XP needed to reach next level from current total */
export function petXpForLevel(level: number): number {
  return level * level * 5
}
