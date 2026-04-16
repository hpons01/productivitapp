import { ipcMain } from 'electron'
import { getDb } from '../db'

export interface LootItem {
  id: string
  type: string
  tier: string
  payload: string
  earned_at: number
  used_at: number | null
}

const LOOT_TYPES = new Set(['xp_boost', 'power_up', 'theme', 'title', 'cosmetic'])
const LOOT_TIERS = new Set(['common', 'uncommon', 'rare', 'epic', 'legendary'])

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function validateLootSaveInput(item: unknown): { ok: true; value: { id: string; type: string; tier: string; payload: string } } | { ok: false; error: string } {
  if (!item || typeof item !== 'object') {
    return { ok: false, error: 'Invalid loot payload: expected object.' }
  }

  const { id, type, tier, payload } = item as Record<string, unknown>
  const normalizedType = typeof type === 'string' ? type.trim() : ''
  const normalizedTier = typeof tier === 'string' ? tier.trim() : ''

  if (!isNonEmptyString(id)) {
    return { ok: false, error: 'Invalid loot payload: id must be a non-empty string.' }
  }
  if (!isNonEmptyString(type) || !LOOT_TYPES.has(normalizedType)) {
    return { ok: false, error: 'Invalid loot payload: type is not supported.' }
  }
  if (!isNonEmptyString(tier) || !LOOT_TIERS.has(normalizedTier)) {
    return { ok: false, error: 'Invalid loot payload: tier is not supported.' }
  }
  if (typeof payload !== 'string') {
    return { ok: false, error: 'Invalid loot payload: payload must be a string.' }
  }

  return {
    ok: true,
    value: {
      id: id.trim(),
      type: normalizedType,
      tier: normalizedTier,
      payload
    }
  }
}

export function registerLootIpc(): void {
  ipcMain.handle('loot:list', () => {
    const db = getDb()
    return db
      .prepare('SELECT * FROM loot_inventory ORDER BY earned_at DESC')
      .all() as LootItem[]
  })

  ipcMain.handle('loot:activate', (_event, id: string) => {
    const db = getDb()
    db.prepare('UPDATE loot_inventory SET used_at = ? WHERE id = ?').run(Date.now(), id)
    return { success: true }
  })

  ipcMain.handle('loot:save', (_event, item: unknown) => {
    const validated = validateLootSaveInput(item)
    if (!validated.ok) {
      return { success: false, error: validated.error }
    }

    const db = getDb()
    db.prepare(
      'INSERT OR IGNORE INTO loot_inventory (id, type, tier, payload, earned_at) VALUES (?, ?, ?, ?, ?)'
    ).run(validated.value.id, validated.value.type, validated.value.tier, validated.value.payload, Date.now())
    return { success: true }
  })
}
