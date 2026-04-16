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

  ipcMain.handle('loot:save', (_event, item: { id: string; type: string; tier: string; payload: string }) => {
    const db = getDb()
    db.prepare(
      'INSERT OR IGNORE INTO loot_inventory (id, type, tier, payload, earned_at) VALUES (?, ?, ?, ?, ?)'
    ).run(item.id, item.type, item.tier, item.payload, Date.now())
    return { success: true }
  })
}
